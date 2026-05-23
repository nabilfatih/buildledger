import { File02Icon, PlayIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import type { GenericId } from "convex/values";

import type { ReviewResult } from "@/lib/confect-results";
import { formatDateInput } from "@/lib/dates";

const meetingTypeValues = [
  "OAC",
  "Coordination",
  "Site Review",
  "Change Review",
] as const;
const reviewKindValues = [
  "discussion",
  "decision",
  "action",
  "risk",
  "question",
] as const;
const severityValues = ["low", "medium", "high"] as const;

export type WorkflowTab = "input" | "review" | "meetings";
export type MeetingType = (typeof meetingTypeValues)[number];
export type ReviewKind = (typeof reviewKindValues)[number];
export type Severity = (typeof severityValues)[number];
export type ReviewState = Extract<
  ReviewResult,
  { readonly _tag: "Success" }
>["value"];
export type ReviewItem = ReviewState["items"][number];

export interface ReviewDraft {
  readonly body: string;
  readonly dueDate: string;
  readonly itemId: GenericId<"minuteItems">;
  readonly kind: ReviewKind;
  readonly ownerName: string;
  readonly severity: Severity;
  readonly title: string;
}

export const meetingTypeItems: readonly {
  readonly label: string;
  readonly value: MeetingType;
}[] = [
  { label: "OAC", value: "OAC" },
  { label: "Coordination", value: "Coordination" },
  { label: "Site Review", value: "Site Review" },
  { label: "Change Review", value: "Change Review" },
] as const;

export const reviewKindItems: readonly {
  readonly label: string;
  readonly value: ReviewKind;
}[] = [
  { label: "Discussion", value: "discussion" },
  { label: "Decision", value: "decision" },
  { label: "Action", value: "action" },
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

export const meetingValidationMessages = {
  date: "Meeting date is required.",
  title: "Meeting title is required.",
  type: "Meeting type is required.",
} as const;

/** Selects the tab that best matches the current meeting state. */
export function getWorkflowTab({
  meetingStatus,
  selectedMeetingId,
}: {
  readonly meetingStatus: string | undefined;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
}): WorkflowTab {
  if (!selectedMeetingId) {
    return "input";
  }

  if (meetingStatus === "published") {
    return "meetings";
  }

  if (meetingStatus === "review") {
    return "review";
  }

  return "input";
}

/** Derives the one primary action shown in the meeting workflow. */
export function getPrimaryAction({
  hasReviewItems,
  isGenerating,
  isPublishing,
  isReviewDirty,
  isSavingReview,
  meetingStatus,
  selectedMeetingId,
  selectedProjectId,
}: {
  readonly hasReviewItems: boolean;
  readonly isGenerating: boolean;
  readonly isPublishing: boolean;
  readonly isReviewDirty: boolean;
  readonly isSavingReview: boolean;
  readonly meetingStatus: string | undefined;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
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

  if (!selectedMeetingId || meetingStatus === "published") {
    return {
      disabled: false,
      icon: File02Icon,
      label: "New Meeting",
      loading: false,
      step: "newMeeting",
    } as const;
  }

  if (meetingStatus === "review" && isReviewDirty) {
    return {
      disabled: isSavingReview,
      icon: Tick01Icon,
      label: "Save Review",
      loading: isSavingReview,
      step: "saveReview",
    } as const;
  }

  if (meetingStatus === "review") {
    return {
      disabled: !hasReviewItems || isPublishing,
      icon: Tick01Icon,
      label: "Publish",
      loading: isPublishing,
      step: "publish",
    } as const;
  }

  return {
    disabled: meetingStatus === "processing" || isGenerating,
    icon: PlayIcon,
    label:
      meetingStatus === "processing" || isGenerating
        ? "Generating Minutes"
        : "Generate Minutes",
    loading: isGenerating || meetingStatus === "processing",
    step: "generate",
  } as const;
}

/** Reads the current notes text from the persisted meeting input set. */
export function meetingNotes(inputs: ReviewState["inputs"]) {
  const notesInput = inputs
    .filter((input) => input.kind === "notes")
    .sort((left, right) => right.createdAt - left.createdAt)[0];

  return notesInput?.text ?? "";
}

/** Checks whether selected meeting notes can still be edited. */
export function canEditInput(status: string | undefined) {
  return status === "draft" || status === "failed";
}

/** Narrows COSS tab change values to the local workflow tab set. */
export function isWorkflowTab(value: string): value is WorkflowTab {
  return value === "input" || value === "review" || value === "meetings";
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
    ownerName: item.ownerName ?? "",
    dueDate: item.dueDate ?? "",
    severity: item.severity ?? "medium",
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
    draft.kind === "action" &&
    (optionalText(draft.ownerName) !== optionalText(item.ownerName) ||
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
