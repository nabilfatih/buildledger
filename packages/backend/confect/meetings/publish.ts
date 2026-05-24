import { FunctionImpl } from "@confect/server";
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
import { Effect } from "effect";

import { maxMinuteItems, zeroEmbedding } from "./helpers";

/** Publishes reviewed minutes into project memory and derived tables. */
export const publishMinutes = FunctionImpl.make(
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
          .take(maxMinuteItems);

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
