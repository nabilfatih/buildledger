import type { ProjectRecordType, ProtocolDraft } from "@repo/ai/schemas";
import type { Protocols } from "@repo/backend/confect/tables/core";
import type { Schema } from "effect";

export const zeroEmbedding = Array.from({ length: 1536 }, () => 0);
export const maxProtocolSources = 10;
export const maxProtocolSections = 20;
export const maxProtocolItems = 100;
export const maxAiRuns = 10;
export const maxAiRunEventsPerRun = 20;

type ProtocolStatus = Schema.Schema.Type<typeof Protocols.Doc>["status"];

/** Keeps the latest saved protocol input for each editable input kind. */
export function currentProtocolInputs<
  const Input extends {
    readonly kind: "notes" | "transcript" | "document" | "file";
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

/** Checks whether protocol notes can still be edited before generation. */
export function canSaveProtocolInput(status: ProtocolStatus) {
  return status === "draft" || status === "failed";
}

/** Builds a protocol item patch that clears fields irrelevant to the selected kind. */
export function reviewItemPatch(input: {
  readonly kind: ProjectRecordType;
  readonly title: string;
  readonly body: string;
  readonly bauteil?: string | undefined;
  readonly objectName?: string | undefined;
  readonly discipline?: string | undefined;
  readonly responsibleParty?: string | undefined;
  readonly dueDate?: string | undefined;
  readonly severity?: "low" | "medium" | "high" | undefined;
  readonly status: "open" | "in_progress" | "blocked" | "resolved" | "recorded";
}) {
  const title = input.title.trim();
  const body = input.body.trim();

  return {
    kind: input.kind,
    title,
    body,
    bauteil: optionalText(input.bauteil),
    objectName: optionalText(input.objectName),
    discipline: optionalText(input.discipline),
    responsibleParty:
      input.kind === "task" ? optionalText(input.responsibleParty) : undefined,
    dueDate: input.kind === "task" ? optionalText(input.dueDate) : undefined,
    severity: input.kind === "risk" ? (input.severity ?? "medium") : undefined,
    status: input.status,
    updatedAt: Date.now(),
  };
}

/** Counts generated protocol items before they are written into one transaction. */
export function countDraftItems(draft: ProtocolDraft) {
  return draft.sections.reduce(
    (total, section) => total + section.items.length,
    0
  );
}

/** Checks whether a generated draft stays inside the review payload budget. */
export function draftFitsReviewBudget(draft: ProtocolDraft) {
  if (draft.sections.length > maxProtocolSections) {
    return false;
  }

  return countDraftItems(draft) <= maxProtocolItems;
}

/** Normalizes optional review text fields before storing them. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}
