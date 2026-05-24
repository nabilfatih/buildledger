import type { MinutesDraft } from "@repo/ai/schemas";
import type { Meetings } from "@repo/backend/confect/tables/core";
import type { Schema } from "effect";

export const zeroEmbedding = Array.from({ length: 1536 }, () => 0);
export const maxMeetingInputs = 10;
export const maxMinuteSections = 20;
export const maxMinuteItems = 100;
export const maxAiRuns = 10;
export const maxAiRunEventsPerRun = 20;

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

/** Counts generated minute items before they are written into one transaction. */
export function countDraftItems(draft: MinutesDraft) {
  return draft.sections.reduce(
    (total, section) => total + section.items.length,
    0
  );
}

/** Checks whether a generated draft stays inside the review payload budget. */
export function draftFitsReviewBudget(draft: MinutesDraft) {
  if (draft.sections.length > maxMinuteSections) {
    return false;
  }

  return countDraftItems(draft) <= maxMinuteItems;
}

/** Normalizes optional review text fields before storing them. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}
