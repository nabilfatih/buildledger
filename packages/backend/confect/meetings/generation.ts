import { FunctionImpl } from "@confect/server";
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
import { Effect } from "effect";

import {
  clearMinutesDraft,
  getMeetingInputText,
  insertMinutesDraft,
} from "./draft";
import { draftFitsReviewBudget } from "./helpers";

/** Starts a minutes generation run after validating saved meeting input. */
export const startGeneration = FunctionImpl.make(
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
export const finishGeneration = FunctionImpl.make(
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

        if (!draftFitsReviewBudget(draft)) {
          return yield* Effect.fail(
            new InvalidMeetingState({
              meetingId,
              message:
                "Generated minutes are too large to review in one meeting.",
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
export const failGeneration = FunctionImpl.make(
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
