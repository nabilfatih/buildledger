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
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import type { GenericId } from "convex/values";
import { Effect, Layer } from "effect";

const zeroEmbedding = Array.from({ length: 1536 }, () => 0);
type MeetingId = GenericId<"meetings">;

/** Returns all saved notes and transcripts for a meeting as one prompt string. */
const getMeetingInputText = Effect.fn("meetings.getMeetingInputText")(
  function* (meetingId: MeetingId) {
    const reader = yield* DatabaseReader;
    const inputs = yield* reader
      .table("meetingInputs")
      .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
      .collect();

    return inputs
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

/** Adds notes or transcript input to a meeting draft. */
const addInput = FunctionImpl.make(
  api,
  "meetings",
  "addInput",
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

        const writer = yield* DatabaseWriter;
        return yield* writer.table("meetingInputs").insert({
          meetingId,
          kind,
          text,
          createdAt: Date.now(),
        });
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
  Layer.provide(addInput),
  Layer.provide(startGeneration),
  Layer.provide(finishGeneration),
  Layer.provide(failGeneration),
  Layer.provide(getReviewState),
  Layer.provide(publishMinutes)
);
