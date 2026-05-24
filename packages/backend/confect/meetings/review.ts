import { FunctionImpl } from "@confect/server";
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
import { Effect } from "effect";

import {
  canSaveMeetingInput,
  maxAiRunEventsPerRun,
  maxAiRuns,
  maxMeetingInputs,
  maxMinuteItems,
  maxMinuteSections,
  reviewItemPatch,
} from "./helpers";

/** Lists recent meetings for a project the user can access. */
export const listByProject = FunctionImpl.make(
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
export const createDraft = FunctionImpl.make(
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
export const saveInput = FunctionImpl.make(
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

/** Returns the editable meeting review state and AI event timeline. */
export const getReviewState = FunctionImpl.make(
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
          .take(maxMeetingInputs);
        const sections = yield* reader
          .table("minuteSections")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .take(maxMinuteSections);
        const items = yield* reader
          .table("minuteItems")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
          .take(maxMinuteItems);
        const aiRuns = yield* reader
          .table("aiRuns")
          .index("by_meetingId", (q) => q.eq("meetingId", meetingId), "desc")
          .take(maxAiRuns);
        const nestedEvents = yield* Effect.all(
          aiRuns.map((run) =>
            reader
              .table("aiRunEvents")
              .index("by_aiRunId", (q) => q.eq("aiRunId", run._id))
              .take(maxAiRunEventsPerRun)
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
export const updateReviewItem = FunctionImpl.make(
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
