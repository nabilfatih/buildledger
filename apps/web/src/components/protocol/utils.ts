import { File02Icon, PlayIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import type { GenericId } from "convex/values";

import type { ProtocolReviewResult } from "@/lib/confect-results";
import { formatDateInput } from "@/lib/dates";

const protocolTypeValues = [
  "Bauprotokoll",
  "Jour Fixe",
  "Site Review",
  "Change Notice",
] as const;
const reviewKindValues = [
  "agenda",
  "discussion",
  "change",
  "task",
  "information",
  "concern",
  "obstruction",
  "decision",
  "risk",
  "question",
] as const;
const severityValues = ["low", "medium", "high"] as const;

export type WorkflowTab = "input" | "review" | "protocols";
export type ProtocolType = (typeof protocolTypeValues)[number];
export type ReviewKind = (typeof reviewKindValues)[number];
export type Severity = (typeof severityValues)[number];
export type ReviewState = Extract<
  ProtocolReviewResult,
  { readonly _tag: "Success" }
>["value"];
export type ReviewItem = ReviewState["items"][number];

export interface ReviewDraft {
  readonly bauteil: string;
  readonly body: string;
  readonly discipline: string;
  readonly dueDate: string;
  readonly itemId: GenericId<"protocolItems">;
  readonly kind: ReviewKind;
  readonly objectName: string;
  readonly responsibleParty: string;
  readonly severity: Severity;
  readonly status: ReviewItem["status"];
  readonly title: string;
}

export const protocolTypeItems: readonly {
  readonly label: string;
  readonly value: ProtocolType;
}[] = [
  { label: "Bauprotokoll", value: "Bauprotokoll" },
  { label: "Jour Fixe", value: "Jour Fixe" },
  { label: "Site Review", value: "Site Review" },
  { label: "Change Notice", value: "Change Notice" },
] as const;

export const reviewKindItems: readonly {
  readonly label: string;
  readonly value: ReviewKind;
}[] = [
  { label: "Agenda", value: "agenda" },
  { label: "Discussion", value: "discussion" },
  { label: "Change", value: "change" },
  { label: "Task", value: "task" },
  { label: "Information", value: "information" },
  { label: "Concern", value: "concern" },
  { label: "Obstruction", value: "obstruction" },
  { label: "Decision", value: "decision" },
  { label: "Risk", value: "risk" },
  { label: "Question", value: "question" },
] as const;

export const severityItems: readonly {
  readonly label: string;
  readonly value: Severity;
}[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] as const;

export const statusItems: readonly {
  readonly label: string;
  readonly value: ReviewItem["status"];
}[] = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Resolved", value: "resolved" },
  { label: "Recorded", value: "recorded" },
] as const;

export const protocolValidationMessages = {
  date: "Protocol date is required.",
  number: "Protocol number is required.",
  title: "Protocol title is required.",
  type: "Protocol type is required.",
} as const;

/** Selects the tab that best matches the current protocol state. */
export function getWorkflowTab({
  protocolStatus,
  selectedProtocolId,
}: {
  readonly protocolStatus: string | undefined;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
}): WorkflowTab {
  if (!selectedProtocolId) {
    return "input";
  }

  if (protocolStatus === "published") {
    return "protocols";
  }

  if (protocolStatus === "review") {
    return "review";
  }

  return "input";
}

/** Derives the one primary task shown in the protocol workflow. */
export function getPrimaryTask({
  hasReviewItems,
  isGenerating,
  isPublishing,
  isReviewDirty,
  isSavingReview,
  protocolStatus,
  selectedProtocolId,
  selectedProjectId,
}: {
  readonly hasReviewItems: boolean;
  readonly isGenerating: boolean;
  readonly isPublishing: boolean;
  readonly isReviewDirty: boolean;
  readonly isSavingReview: boolean;
  readonly protocolStatus: string | undefined;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  if (!selectedProjectId) {
    return {
      disabled: true,
      icon: File02Icon,
      label: "Select Project",
      loading: false,
      step: "none",
    } as const;
  }

  if (!selectedProtocolId || protocolStatus === "published") {
    return {
      disabled: false,
      icon: File02Icon,
      label: "New Protocol",
      loading: false,
      step: "newProtocol",
    } as const;
  }

  if (protocolStatus === "review" && isReviewDirty) {
    return {
      disabled: isSavingReview,
      icon: Tick01Icon,
      label: "Save Review",
      loading: isSavingReview,
      step: "saveReview",
    } as const;
  }

  if (protocolStatus === "review") {
    return {
      disabled: !hasReviewItems || isPublishing,
      icon: Tick01Icon,
      label: "Publish",
      loading: isPublishing,
      step: "publish",
    } as const;
  }

  return {
    disabled: protocolStatus === "processing" || isGenerating,
    icon: PlayIcon,
    label:
      protocolStatus === "processing" || isGenerating
        ? "Generating Protocol"
        : "Generate Protocol",
    loading: isGenerating || protocolStatus === "processing",
    step: "generate",
  } as const;
}

/** Reads the current notes text from the persisted protocol input set. */
export function protocolNotes(sources: ReviewState["sources"]) {
  const notesInput = sources
    .filter((input) => input.kind === "notes")
    .sort((left, right) => right.createdAt - left.createdAt)[0];

  return notesInput?.text ?? "";
}

/** Checks whether selected protocol notes can still be edited. */
export function canEditInput(status: string | undefined) {
  return status === "draft" || status === "failed";
}

/** Narrows COSS tab change values to the local workflow tab set. */
export function isWorkflowTab(value: string): value is WorkflowTab {
  return value === "input" || value === "review" || value === "protocols";
}

/** Formats backend status values for a consistent UI voice. */
export function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Converts a generated item into the editable review form shape. */
export function reviewDraftFromItem(item: ReviewItem): ReviewDraft {
  return {
    itemId: item._id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    bauteil: item.bauteil ?? "",
    discipline: item.discipline ?? "",
    objectName: item.objectName ?? "",
    responsibleParty: item.responsibleParty ?? "",
    dueDate: item.dueDate ?? "",
    severity: item.severity ?? "medium",
    status: item.status,
  };
}

/** Checks whether an editable review draft differs from the saved item. */
export function reviewDraftChanged(draft: ReviewDraft, item: ReviewItem) {
  if (draft.kind !== item.kind) {
    return true;
  }

  if (draft.title !== item.title || draft.body !== item.body) {
    return true;
  }

  if (
    optionalText(draft.bauteil) !== optionalText(item.bauteil) ||
    optionalText(draft.objectName) !== optionalText(item.objectName) ||
    optionalText(draft.discipline) !== optionalText(item.discipline) ||
    draft.status !== item.status
  ) {
    return true;
  }

  if (
    draft.kind === "task" &&
    (optionalText(draft.responsibleParty) !==
      optionalText(item.responsibleParty) ||
      optionalText(draft.dueDate) !== optionalText(item.dueDate))
  ) {
    return true;
  }

  return (
    draft.kind === "risk" && draft.severity !== (item.severity ?? "medium")
  );
}

/** Returns a trimmed optional value for backend optional fields. */
export function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}

/** Produces the browser-native date input value for today. */
export function todayDate() {
  return formatDateInput(new Date());
}
