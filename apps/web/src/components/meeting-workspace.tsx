import { useAction, useMutation } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@repo/design-system/components/ui/tabs";
import { toastManager } from "@repo/design-system/components/ui/toast";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useMemo, useState } from "react";

import { ReviewEditor } from "@/components/meeting-review-editor";
import { InputPanel, MeetingsList } from "@/components/meeting-workflow-panels";
import {
  canEditInput,
  getPrimaryAction,
  getWorkflowTab,
  isWorkflowTab,
  meetingNotes,
  optionalText,
  type ReviewDraft,
  type ReviewState,
  reviewDraftChanged,
  reviewDraftFromItem,
  type WorkflowTab,
} from "@/components/meeting-workspace-utils";
import { NewMeetingSheet } from "@/components/new-meeting-sheet";
import type { MeetingsResult, ReviewResult } from "@/lib/confect-results";
import { getErrorMessage } from "@/lib/errors";

interface MeetingWorkspaceProps {
  readonly meetings: MeetingsResult;
  readonly review: ReviewResult;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setSelectedMeetingId: (
    meetingId: GenericId<"meetings"> | null
  ) => void;
}

/** Coordinates one meeting through input, generation, review, and publish. */
export function MeetingWorkspace(props: MeetingWorkspaceProps) {
  return (
    <MeetingWorkspaceSession
      key={props.selectedMeetingId ?? "no-selected-meeting"}
      {...props}
    />
  );
}

/** Keeps local editing state scoped to the selected meeting. */
function MeetingWorkspaceSession({
  meetings,
  review,
  selectedMeetingId,
  selectedProjectId,
  setSelectedMeetingId,
}: MeetingWorkspaceProps) {
  const saveInput = useMutation(refs.public.meetings.saveInput);
  const updateReviewItem = useMutation(refs.public.meetings.updateReviewItem);
  const generateMinutes = useAction(refs.public.ai.generateMinutes);
  const publishMinutes = useMutation(refs.public.meetings.publishMinutes);
  const reviewState = review._tag === "Success" ? review.value : null;
  const meetingStatus = reviewState?.meeting.status;
  const workflowTab = getWorkflowTab({ meetingStatus, selectedMeetingId });
  const [activeTab, setActiveTab] = useState<WorkflowTab>(workflowTab);
  const persistedNotes = useMemo(
    () => (reviewState ? meetingNotes(reviewState.inputs) : ""),
    [reviewState]
  );
  const [notesState, setNotesState] = useState(() => ({
    meetingId: selectedMeetingId,
    value: persistedNotes,
  }));
  const reviewVersion =
    reviewState?.items
      .map((item) => `${item._id}:${item.updatedAt ?? item.createdAt}`)
      .join("|") ?? "";
  const [reviewDraftState, setReviewDraftState] = useState(() => ({
    drafts: reviewState?.items.map(reviewDraftFromItem) ?? [],
    version: reviewVersion,
  }));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  if (notesState.meetingId !== selectedMeetingId) {
    setNotesState({ meetingId: selectedMeetingId, value: persistedNotes });
  } else if (notesState.value.length === 0 && persistedNotes.length > 0) {
    setNotesState({ meetingId: selectedMeetingId, value: persistedNotes });
  }

  if (reviewDraftState.version !== reviewVersion) {
    setReviewDraftState({
      drafts: reviewState?.items.map(reviewDraftFromItem) ?? [],
      version: reviewVersion,
    });
  }

  const notes =
    notesState.meetingId === selectedMeetingId ? notesState.value : "";
  const reviewDrafts =
    reviewDraftState.version === reviewVersion ? reviewDraftState.drafts : [];
  const hasReviewItems = Boolean(reviewState?.items.length);
  const isReviewDirty = reviewState
    ? reviewDrafts.some((draft) => {
        const item = reviewState.items.find(
          (candidate) => candidate._id === draft.itemId
        );
        return item ? reviewDraftChanged(draft, item) : false;
      })
    : false;
  const primaryAction = getPrimaryAction({
    hasReviewItems,
    isGenerating,
    isPublishing,
    isReviewDirty,
    isSavingReview,
    meetingStatus,
    selectedMeetingId,
    selectedProjectId,
  });
  const setNotes = (value: string) =>
    setNotesState({ meetingId: selectedMeetingId, value });

  /** Persists meeting input and starts the AI minutes action. */
  function handleGenerate() {
    if (!selectedMeetingId) {
      return;
    }

    if (notes.trim().length === 0) {
      toastManager.add({
        title: "Notes required",
        description: "Add meeting notes before generating minutes.",
        type: "warning",
      });
      return;
    }

    setIsGenerating(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const inputResult = yield* Effect.tryPromise({
          try: () =>
            saveInput({
              meetingId: selectedMeetingId,
              kind: "notes",
              text: notes,
            }),
          catch: (error) => ({
            title: "Minutes were not generated",
            description: getErrorMessage(error),
            type: "error" as const,
          }),
        });

        yield* Either.match(inputResult, {
          onLeft: (error) =>
            Effect.fail({
              title: "Notes were not saved",
              description: error.message,
              type: "error" as const,
            }),
          onRight: () => Effect.void,
        });

        const result = yield* Effect.tryPromise({
          try: () => generateMinutes({ meetingId: selectedMeetingId }),
          catch: (error) => ({
            title: "Minutes were not generated",
            description: getErrorMessage(error),
            type: "error" as const,
          }),
        });

        yield* Either.match(result, {
          onLeft: (error) =>
            Effect.fail({
              title: "Minutes were not generated",
              description: error.message,
              type: "error" as const,
            }),
          onRight: () => Effect.void,
        });

        yield* Effect.sync(() => {
          toastManager.add({
            title: "Minutes ready",
            description: "Review generated items before publishing.",
            type: "success",
          });
          setActiveTab("review");
        });
      }).pipe(
        Effect.catchAll((failure) =>
          Effect.sync(() => toastManager.add(failure))
        ),
        Effect.ensuring(Effect.sync(() => setIsGenerating(false)))
      )
    );
  }

  /** Saves dirty generated review items before publishing. */
  function handleSaveReview() {
    if (!reviewState) {
      return;
    }

    const changedDrafts = changedReviewDrafts(reviewDrafts, reviewState.items);

    if (changedDrafts.length === 0) {
      return;
    }

    setIsSavingReview(true);
    return Effect.runPromise(
      saveChangedReviewDrafts(changedDrafts).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Review saved",
              description: "Publish when the minutes are ready.",
              type: "success",
            })
          )
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Review was not saved",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsSavingReview(false)))
      )
    );
  }

  /** Publishes reviewed minutes into project memory and the ledger. */
  function handlePublish() {
    if (!selectedMeetingId) {
      return;
    }

    if (!(meetingStatus === "review" && hasReviewItems)) {
      toastManager.add({
        title: "Review first",
        description: "Generate and review minutes before publishing.",
        type: "warning",
      });
      return;
    }

    setIsPublishing(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () => publishMinutes({ meetingId: selectedMeetingId }),
          catch: getErrorMessage,
        });

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () =>
            Effect.sync(() => {
              toastManager.add({
                title: "Minutes published",
                description: "Ledger rows and project intelligence are ready.",
                type: "success",
              });
              setActiveTab("meetings");
            }),
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Minutes were not published",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsPublishing(false)))
      )
    );
  }

  /** Runs the currently valid next step in the meeting workflow. */
  function handlePrimaryAction() {
    if (primaryAction.step === "generate") {
      handleGenerate();
      return;
    }

    if (primaryAction.step === "saveReview") {
      handleSaveReview();
      return;
    }

    if (primaryAction.step === "publish") {
      handlePublish();
    }
  }

  /** Updates one editable review item field in local form state. */
  function updateReviewDraft(
    itemId: GenericId<"minuteItems">,
    patch: Partial<ReviewDraft>
  ) {
    setReviewDraftState((state) => ({
      ...state,
      drafts: state.drafts.map((draft) => {
        if (draft.itemId !== itemId) {
          return draft;
        }

        const next = { ...draft, ...patch };

        if (patch.kind && patch.kind !== "action") {
          next.ownerName = "";
          next.dueDate = "";
        }

        if (patch.kind && patch.kind !== "risk") {
          next.severity = "medium";
        }

        return next;
      }),
    }));
  }

  /** Persists edited review items sequentially so the first failure is visible. */
  function saveChangedReviewDrafts(drafts: readonly ReviewDraft[]) {
    return Effect.gen(function* () {
      for (const draft of drafts) {
        const result = yield* Effect.tryPromise({
          try: () =>
            updateReviewItem({
              itemId: draft.itemId,
              kind: draft.kind,
              title: draft.title,
              body: draft.body,
              ownerName:
                draft.kind === "action"
                  ? optionalText(draft.ownerName)
                  : undefined,
              dueDate:
                draft.kind === "action"
                  ? optionalText(draft.dueDate)
                  : undefined,
              severity: draft.kind === "risk" ? draft.severity : undefined,
            }),
          catch: getErrorMessage,
        });

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });
      }
    });
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Meeting Workflow</FrameTitle>
            <FrameDescription>
              Capture notes, review generated minutes, then publish memory.
            </FrameDescription>
          </div>
          {primaryAction.step === "newMeeting" ? (
            <NewMeetingSheet
              disabled={primaryAction.disabled}
              onCreated={(meetingId) => {
                setSelectedMeetingId(meetingId);
                setActiveTab("input");
              }}
              selectedProjectId={selectedProjectId}
            />
          ) : (
            <Button
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              onClick={handlePrimaryAction}
              size="sm"
              type="button"
            >
              <HugeIcons icon={primaryAction.icon} /> {primaryAction.label}
            </Button>
          )}
        </div>
        {isGenerating || meetingStatus === "processing" ? (
          <p className="text-muted-foreground text-sm">
            Generating structured minutes from saved meeting notes.
          </p>
        ) : null}
      </FrameHeader>
      <FramePanel className="min-w-0 p-4">
        <Tabs
          onValueChange={(value) => {
            if (!isWorkflowTab(value)) {
              return;
            }

            setActiveTab(value);
          }}
          value={activeTab}
        >
          <TabsList className="max-w-full flex-wrap">
            <TabsTab value="input">Input</TabsTab>
            <TabsTab value="review">Review</TabsTab>
            <TabsTab value="meetings">Meetings</TabsTab>
          </TabsList>
          <TabsPanel value="input">
            <InputPanel
              canEdit={canEditInput(meetingStatus)}
              notes={notes}
              onNotesChange={setNotes}
              selectedMeetingId={selectedMeetingId}
            />
          </TabsPanel>
          <TabsPanel value="review">
            <ReviewEditor
              drafts={reviewDrafts}
              onDraftChange={updateReviewDraft}
              review={review}
            />
          </TabsPanel>
          <TabsPanel value="meetings">
            <MeetingsList
              meetings={meetings}
              selectedMeetingId={selectedMeetingId}
              setSelectedMeetingId={setSelectedMeetingId}
            />
          </TabsPanel>
        </Tabs>
      </FramePanel>
    </Frame>
  );
}

/** Returns only edited review drafts for the current review state. */
function changedReviewDrafts(
  drafts: readonly ReviewDraft[],
  items: ReviewState["items"]
) {
  return drafts.filter((draft) => {
    const item = items.find((candidate) => candidate._id === draft.itemId);
    return item ? reviewDraftChanged(draft, item) : false;
  });
}
