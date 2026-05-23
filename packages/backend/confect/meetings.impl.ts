import { FunctionImpl, GroupImpl } from "@confect/server";
import type { MinutesDraft } from "@repo/ai/schemas";
import { MemoryChunkingService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import {
  InvalidMeetingState,
  MeetingNotFound,
  ReviewItemNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import type { Meetings } from "@repo/backend/confect/tables/core";
import type { GenericId } from "convex/values";
import { Effect, Layer, type Schema } from "effect";

const zeroEmbedding = Array.from({ length: 1536 }, () => 0);
type MeetingId = GenericId<"meetings">;
type MeetingStatus = Schema.Schema.Type<typeof Meetings.Doc>["status"];

/** Keeps the latest saved meeting input for each editable input kind. */
export function currentMeetingInputs<
  const Input extends {
    readonly kind: "notes" | "transcript" | "file";
    readonly createdAt: number;
  },
>(inputs: readonly Input[]) {
  const inputByKind = new Map<Input["kind"], Input>();

  for (const input of inputs) {
    if (input.kind === "file") {
      continue;
    }

    const current = inputByKind.get(input.kind);

    if (!current || input.createdAt > current.createdAt) {
      inputByKind.set(input.kind, input);
    }
  }

  return [...inputByKind.values()].sort(
    (left, right) => left.createdAt - right.createdAt
  );
}

/** Checks whether meeting notes can still be edited before generation. */
export function canSaveMeetingInput(status: MeetingStatus) {
  return status === "draft" || status === "failed";
}

/** Normalizes optional review text fields before storing them. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}

/** Builds a minute-item patch that clears fields irrelevant to the selected kind. */
export function reviewItemPatch(input: {
  readonly kind: "discussion" | "decision" | "action" | "risk" | "question";
  readonly title: string;
  readonly body: string;
  readonly ownerName?: string | undefined;
  readonly dueDate?: string | undefined;
  readonly severity?: "low" | "medium" | "high" | undefined;
}) {
  const title = input.title.trim();
  const body = input.body.trim();

  return {
    kind: input.kind,
    title,
    body,
    status: input.kind === "action" ? "open" : undefined,
    ownerName:
      input.kind === "action" ? optionalText(input.ownerName) : undefined,
    dueDate: input.kind === "action" ? optionalText(input.dueDate) : undefined,
    severity: input.kind === "risk" ? (input.severity ?? "medium") : undefined,
    updatedAt: Date.now(),
  };
}

/** Returns all saved notes and transcripts for a meeting as one prompt string. */
const getMeetingInputText = Effect.fn("meetings.getMeetingInputText")(
  function* (meetingId: MeetingId) {
    const reader = yield* DatabaseReader;
    const inputs = yield* reader
      .table("meetingInputs")
      .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
      .collect();

    return currentMeetingInputs(inputs)
      .map((input) => input.text ?? "")
      .join("\n\n")
      .trim();
  }
);

/** Persists a generated minutes draft into reviewable sections and items. */
const insertMinutesDraft = Effect.fn("meetings.insertMinutesDraft")(
  function* (input: {
    readonly meetingId: MeetingId;
    readonly draft: MinutesDraft;
  }) {
    const writer = yield* DatabaseWriter;
    const sectionIds = yield* Effect.all(
      input.draft.sections.map((section, index) =>
        writer.table("minuteSections").insert({
          meetingId: input.meetingId,
          title: section.title,
          body: section.body,
          order: index,
          createdAt: Date.now(),
        })
      )
    );

    yield* Effect.all(
      input.draft.sections.flatMap((section, sectionIndex) => {
        const sectionId = sectionIds[sectionIndex];

        if (!sectionId) {
          return [];
        }

        return section.items.map((item) =>
          writer.table("minuteItems").insert({
            meetingId: input.meetingId,
            sectionId,
            kind: item.kind,
            title: item.title,
            body: item.body,
            status: item.kind === "action" ? "open" : undefined,
            ownerName: item.ownerName,
            dueDate: item.dueDate,
            severity: item.severity,
            citationsJson: JSON.stringify(item.citations),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
      })
    );
  }
);

/** Removes stale generated review rows before a fresh generation result is stored. */
const clearMinutesDraft = Effect.fn("meetings.clearMinutesDraft")(function* (
  meetingId: MeetingId
) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;
  const sections = yield* reader
    .table("minuteSections")
    .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
    .collect();
  const items = yield* reader
    .table("minuteItems")
    .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
    .collect();

  yield* Effect.all(
    items.map((item) => writer.table("minuteItems").delete(item._id))
  );
  yield* Effect.all(
    sections.map((section) =>
      writer.table("minuteSections").delete(section._id)
    )
  );
});

/** Lists recent meetings for a project the user can access. */
const listByProject = FunctionImpl.make(
  api,
  "meetings",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("meetings")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
      })
    )
);

/** Creates a draft meeting inside an accessible project. */
const createDraft = FunctionImpl.make(
  api,
  "meetings",
  "createDraft",
  ({ projectId, title, meetingType, meetingDate, agenda }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        return yield* writer.table("meetings").insert({
          projectId,
          title,
          meetingType,
          meetingDate,
          agenda,
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      })
    )
);

/** Saves the current notes or transcript input for a meeting draft. */
const saveInput = FunctionImpl.make(
  api,
  "meetings",
  "saveInput",
  ({ meetingId, kind, text }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        if (!canSaveMeetingInput(meeting.status)) {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message: "Meeting input can only be edited before generation.",
            })
          );
        }

        const existingInputs = yield* reader
          .table("meetingInputs")
          .index(
            "by_meetingId_and_kind",
            (q) => q.eq("meetingId", meetingId).eq("kind", kind),
            "desc"
          )
          .take(50);
        const writer = yield* DatabaseWriter;
        const [currentInput, ...staleInputs] = existingInputs;

        if (!currentInput) {
          return yield* writer.table("meetingInputs").insert({
            meetingId,
            kind,
            text: text.trim(),
            createdAt: Date.now(),
          });
        }

        yield* writer.table("meetingInputs").patch(currentInput._id, {
          text: text.trim(),
          createdAt: Date.now(),
        });
        yield* Effect.all(
          staleInputs.map((input) =>
            writer.table("meetingInputs").delete(input._id)
          )
        );

        return currentInput._id;
      })
    )
);

/** Starts a minutes generation run after validating saved meeting input. */
const startGeneration = FunctionImpl.make(
  api,
  "meetings",
  "startGeneration",
  ({ meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        const text = yield* getMeetingInputText(meetingId);

        if (text.length === 0) {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message: "Meeting input must include notes or a transcript.",
            })
          );
        }

        if (meeting.status === "processing") {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message: "Minutes generation is already running.",
            })
          );
        }

        if (!(meeting.status === "draft" || meeting.status === "failed")) {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message:
                "Minutes can only be generated from draft meeting input.",
            })
          );
        }

        const aiRunId = yield* writer.table("aiRuns").insert({
          projectId: meeting.projectId,
          meetingId,
          kind: "generateMinutes",
          status: "running",
          startedAt: timestamp,
        });

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 1,
          kind: "started",
          message: "Generating structured meeting minutes.",
          createdAt: timestamp,
        });

        yield* writer.table("meetings").patch(meetingId, {
          status: "processing",
          updatedAt: timestamp,
        });

        return aiRunId;
      })
    )
);

/** Finishes a generation run with a persisted minutes draft. */
const finishGeneration = FunctionImpl.make(
  api,
  "meetings",
  "finishGeneration",
  ({ aiRunId, draft, meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);
        if (meeting.status !== "processing") {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message: "Minutes generation is not active for this meeting.",
            })
          );
        }

        yield* clearMinutesDraft(meetingId);
        yield* insertMinutesDraft({ meetingId, draft });

        yield* writer.table("meetings").patch(meetingId, {
          status: "review",
          updatedAt: Date.now(),
        });

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 2,
          kind: "completed",
          message: "Minutes draft is ready for review.",
          createdAt: Date.now(),
        });

        yield* writer.table("aiRuns").patch(aiRunId, {
          status: "succeeded",
          finishedAt: Date.now(),
        });

        return null;
      })
    )
);

/** Marks a generation run as failed and returns the meeting to a retryable state. */
const failGeneration = FunctionImpl.make(
  api,
  "meetings",
  "failGeneration",
  ({ aiRunId, meetingId, message }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 2,
          kind: "failed",
          message,
          createdAt: Date.now(),
        });

        yield* writer.table("aiRuns").patch(aiRunId, {
          status: "failed",
          error: message,
          finishedAt: Date.now(),
        });

        yield* writer.table("meetings").patch(meetingId, {
          status: "failed",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

/** Returns the editable meeting review state and AI event timeline. */
const getReviewState = FunctionImpl.make(
  api,
  "meetings",
  "getReviewState",
  ({ meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        const inputs = yield* reader
          .table("meetingInputs")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .collect();
        const sections = yield* reader
          .table("minuteSections")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .collect();
        const items = yield* reader
          .table("minuteItems")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .collect();
        const aiRuns = yield* reader
          .table("aiRuns")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId), "desc")
          .take(10);
        const nestedEvents = yield* Effect.all(
          aiRuns.map((run) =>
            reader
              .table("aiRunEvents")
              .index("by_aiRunId", (q) => q.eq("aiRunId", run._id))
              .collect()
          )
        );

        return {
          meeting,
          inputs,
          sections,
          items,
          aiRuns,
          aiRunEvents: nestedEvents.flat(),
        };
      })
    )
);

/** Updates one generated review item before minutes are published. */
const updateReviewItem = FunctionImpl.make(
  api,
  "meetings",
  "updateReviewItem",
  ({ itemId, kind, title, body, ownerName, dueDate, severity }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const item = yield* reader
          .table("minuteItems")
          .get(itemId)
          .pipe(
            Effect.mapError(
              () =>
                new ReviewItemNotFound({
                  itemId,
                  message: "Review item not found.",
                })
            )
          );
        const meeting = yield* reader
          .table("meetings")
          .get(item.meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId: item.meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        if (meeting.status !== "review") {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId: meeting._id,
              message: "Review items can only be edited before publishing.",
            })
          );
        }

        const patch = reviewItemPatch({
          kind,
          title,
          body,
          ownerName,
          dueDate,
          severity,
        });

        if (patch.title.length === 0 || patch.body.length === 0) {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId: meeting._id,
              message: "Review items need a title and body.",
            })
          );
        }

        const writer = yield* DatabaseWriter;
        yield* writer.table("minuteItems").patch(itemId, patch);

        return null;
      })
    )
);

/** Publishes reviewed minutes into project memory and derived tables. */
const publishMinutes = FunctionImpl.make(
  api,
  "meetings",
  "publishMinutes",
  ({ meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const meeting = yield* reader
          .table("meetings")
          .get(meetingId)
          .pipe(
            Effect.mapError(
              () =>
                new MeetingNotFound({
                  meetingId,
                  message: "Meeting not found.",
                })
            )
          );

        yield* ensureProjectAccess(meeting.projectId);

        if (meeting.status === "published") {
          return null;
        }

        if (meeting.status !== "review") {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message: "Meeting must be in review before publishing.",
            })
          );
        }

        const items = yield* reader
          .table("minuteItems")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .collect();

        yield* Effect.all(
          items.map((item) => {
            if (item.kind === "action") {
              return writer.table("actionItems").insert({
                projectId: meeting.projectId,
                meetingId,
                title: item.title,
                ownerName: item.ownerName,
                dueDate: item.dueDate,
                status: "open",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }

            if (item.kind === "decision") {
              return writer.table("decisions").insert({
                projectId: meeting.projectId,
                meetingId,
                title: item.title,
                body: item.body,
                decidedAt: meeting.meetingDate,
                createdAt: Date.now(),
              });
            }

            if (item.kind === "risk") {
              return writer.table("risks").insert({
                projectId: meeting.projectId,
                meetingId,
                title: item.title,
                body: item.body,
                severity: item.severity ?? "medium",
                status: "open",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }

            return Effect.succeed(null);
          })
        );

        const chunks = yield* MemoryChunkingService.chunk({
          sourceTitle: meeting.title,
          chronologyDate: meeting.meetingDate,
          text: items.map((item) => `${item.title}\n${item.body}`).join("\n\n"),
        }).pipe(Effect.provide(MemoryChunkingService.Default));

        yield* Effect.all(
          chunks.map((chunk) =>
            writer.table("memoryChunks").insert({
              projectId: meeting.projectId,
              sourceType: "meeting",
              sourceId: meetingId,
              text: chunk.text,
              chronologyDate: chunk.chronologyDate,
              embedding: zeroEmbedding,
              metadataJson: JSON.stringify({ sourceTitle: chunk.sourceTitle }),
              createdAt: Date.now(),
            })
          )
        );

        yield* writer.table("meetings").patch(meetingId, {
          status: "published",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

export const meetings = GroupImpl.make(api, "meetings").pipe(
  Layer.provide(listByProject),
  Layer.provide(createDraft),
  Layer.provide(saveInput),
  Layer.provide(startGeneration),
  Layer.provide(finishGeneration),
  Layer.provide(failGeneration),
  Layer.provide(getReviewState),
  Layer.provide(updateReviewItem),
  Layer.provide(publishMinutes)
);
