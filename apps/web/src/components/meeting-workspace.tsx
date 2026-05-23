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
import { useEffect, useMemo, useState } from "react";

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

/** Coordinates one meeting through input, generation, review, and publish. */
export function MeetingWorkspace({
  meetings,
  review,
  selectedMeetingId,
  selectedProjectId,
  setSelectedMeetingId,
}: {
  readonly meetings: MeetingsResult;
  readonly review: ReviewResult;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setSelectedMeetingId: (
    meetingId: GenericId<"meetings"> | null
  ) => void;
}) {
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
  const [notes, setNotes] = useState(persistedNotes);
  const [hydratedMeetingId, setHydratedMeetingId] =
    useState<GenericId<"meetings"> | null>(selectedMeetingId);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
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
  useEffect(() => {
    setActiveTab(workflowTab);
  }, [workflowTab]);

  useEffect(() => {
    if (selectedMeetingId !== hydratedMeetingId) {
      setNotes(persistedNotes);
      setHydratedMeetingId(selectedMeetingId);
      return;
    }

    if (notes.length === 0 && persistedNotes.length > 0) {
      setNotes(persistedNotes);
    }
  }, [hydratedMeetingId, notes.length, persistedNotes, selectedMeetingId]);

  useEffect(() => {
    if (!reviewState) {
      setReviewDrafts([]);
      return;
    }

    setReviewDrafts(reviewState.items.map(reviewDraftFromItem));
  }, [reviewState]);

  /** Persists meeting input and starts the AI minutes action. */
  async function handleGenerate() {
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

    try {
      setIsGenerating(true);

      const inputResult = await saveInput({
        meetingId: selectedMeetingId,
        kind: "notes",
        text: notes,
      });

      if (inputResult._tag === "Left") {
        toastManager.add({
          title: "Notes were not saved",
          description: inputResult.left.message,
          type: "error",
        });
        return;
      }

      const result = await generateMinutes({ meetingId: selectedMeetingId });

      if (result._tag === "Left") {
        toastManager.add({
          title: "Minutes were not generated",
          description: result.left.message,
          type: "error",
        });
        return;
      }

      toastManager.add({
        title: "Minutes ready",
        description: "Review generated items before publishing.",
        type: "success",
      });
      setActiveTab("review");
    } catch (error) {
      toastManager.add({
        title: "Minutes were not generated",
        description: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  /** Persists each edited review item and returns the first backend failure. */
  async function saveChangedReviewDrafts(drafts: readonly ReviewDraft[]) {
    for (const draft of drafts) {
      const result = await updateReviewItem({
        itemId: draft.itemId,
        kind: draft.kind,
        title: draft.title,
        body: draft.body,
        ownerName:
          draft.kind === "action" ? optionalText(draft.ownerName) : undefined,
        dueDate:
          draft.kind === "action" ? optionalText(draft.dueDate) : undefined,
        severity: draft.kind === "risk" ? draft.severity : undefined,
      });

      if (result._tag === "Left") {
        return result.left.message;
      }
    }

    return;
  }

  /** Saves dirty generated review items before publishing. */
  async function handleSaveReview() {
    if (!reviewState) {
      return;
    }

    const changedDrafts = changedReviewDrafts(reviewDrafts, reviewState.items);

    if (changedDrafts.length === 0) {
      return;
    }

    try {
      setIsSavingReview(true);

      const failure = await saveChangedReviewDrafts(changedDrafts);

      if (failure) {
        toastManager.add({
          title: "Review was not saved",
          description: failure,
          type: "error",
        });
        return;
      }

      toastManager.add({
        title: "Review saved",
        description: "Publish when the minutes are ready.",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        title: "Review was not saved",
        description: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsSavingReview(false);
    }
  }

  /** Publishes reviewed minutes into project memory and the ledger. */
  async function handlePublish() {
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

    try {
      setIsPublishing(true);

      const result = await publishMinutes({ meetingId: selectedMeetingId });

      if (result._tag === "Left") {
        toastManager.add({
          title: "Minutes were not published",
          description: result.left.message,
          type: "error",
        });
        return;
      }

      toastManager.add({
        title: "Minutes published",
        description: "Ledger rows and project intelligence are ready.",
        type: "success",
      });
      setActiveTab("meetings");
    } catch (error) {
      toastManager.add({
        title: "Minutes were not published",
        description: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  /** Runs the currently valid next step in the meeting workflow. */
  async function handlePrimaryAction() {
    if (primaryAction.step === "generate") {
      await handleGenerate();
      return;
    }

    if (primaryAction.step === "saveReview") {
      await handleSaveReview();
      return;
    }

    if (primaryAction.step === "publish") {
      await handlePublish();
    }
  }

  /** Updates one editable review item field in local form state. */
  function updateReviewDraft(
    itemId: GenericId<"minuteItems">,
    patch: Partial<ReviewDraft>
  ) {
    setReviewDrafts((drafts) =>
      drafts.map((draft) => {
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
      })
    );
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
