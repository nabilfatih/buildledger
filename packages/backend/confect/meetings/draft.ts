import type { MinutesDraft } from "@repo/ai/schemas";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import type { GenericId } from "convex/values";
import { Effect } from "effect";

import {
  currentMeetingInputs,
  maxMeetingInputs,
  maxMinuteItems,
  maxMinuteSections,
} from "./helpers";

type MeetingId = GenericId<"meetings">;

/** Returns all saved notes and transcripts for a meeting as one prompt string. */
export const getMeetingInputText = Effect.fn("meetings.getMeetingInputText")(
  function* (meetingId: MeetingId) {
    const reader = yield* DatabaseReader;
    const inputs = yield* reader
      .table("meetingInputs")
      .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
      .take(maxMeetingInputs);

    return currentMeetingInputs(inputs)
      .map((input) => input.text ?? "")
      .join("\n\n")
      .trim();
  }
);

/** Persists a generated minutes draft into reviewable sections and items. */
export const insertMinutesDraft = Effect.fn("meetings.insertMinutesDraft")(
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
export const clearMinutesDraft = Effect.fn("meetings.clearMinutesDraft")(
  function* (meetingId: MeetingId) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const sections = yield* reader
      .table("minuteSections")
      .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
      .take(maxMinuteSections);
    const items = yield* reader
      .table("minuteItems")
      .index("by_meetingId", (q) => q.eq("meetingId", meetingId))
      .take(maxMinuteItems);

    yield* Effect.all(
      items.map((item) => writer.table("minuteItems").delete(item._id))
    );
    yield* Effect.all(
      sections.map((section) =>
        writer.table("minuteSections").delete(section._id)
      )
    );
  }
);
