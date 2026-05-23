import { QueryResult, useAction, useMutation } from "@confect/react";
import { File02Icon, PlayIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
  HugeIcons,
  Progress,
  ScrollArea,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Textarea,
  toastManager,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { useState } from "react";

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
  const createDraft = useMutation(refs.public.meetings.createDraft);
  const addInput = useMutation(refs.public.meetings.addInput);
  const generateMinutes = useAction(refs.public.ai.generateMinutes);
  const publishMinutes = useMutation(refs.public.meetings.publishMinutes);
  const [notes, setNotes] = useState(
    "Owner requested sequencing updates. Drywall crews are blocked by inspection timing. Site team accepted the revised crane window."
  );
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const reviewState = review._tag === "Success" ? review.value : null;
  const meetingStatus = reviewState?.meeting.status;
  const hasReviewItems = Boolean(reviewState?.items.length);
  const primaryAction = getPrimaryAction({
    hasReviewItems,
    isCreatingMeeting,
    isGenerating,
    isPublishing,
    meetingStatus,
    selectedMeetingId,
    selectedProjectId,
  });

  /** Creates a draft meeting for the selected project. */
  async function handleCreateMeeting() {
    if (!selectedProjectId) {
      return;
    }

    try {
      setIsCreatingMeeting(true);

      const result = await createDraft({
        projectId: selectedProjectId,
        title: "Weekly OAC coordination",
        meetingType: "OAC",
        meetingDate: new Date().toISOString().slice(0, 10),
        agenda: "Safety, schedule, blockers, risk review",
      });

      if (result._tag === "Left") {
        toastManager.add({
          title: "Meeting was not created",
          description: result.left.message,
          type: "error",
        });
        return;
      }

      setSelectedMeetingId(result.right);
      toastManager.add({
        title: "Meeting created",
        description: "Add notes, then generate minutes.",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        title: "Meeting was not created",
        description: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  }

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

      const inputResult = await addInput({
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
        description: "Review the draft before publishing.",
        type: "success",
      });
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
    if (primaryAction.step === "create") {
      await handleCreateMeeting();
      return;
    }

    if (primaryAction.step === "generate") {
      await handleGenerate();
      return;
    }

    if (primaryAction.step === "publish") {
      await handlePublish();
    }
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Meeting workflow</FrameTitle>
            <FrameDescription>
              New meeting to generated minutes to published project memory.
            </FrameDescription>
          </div>
          <Button
            disabled={primaryAction.disabled}
            loading={primaryAction.loading}
            onClick={handlePrimaryAction}
            size="sm"
          >
            <HugeIcons icon={primaryAction.icon} /> {primaryAction.label}
          </Button>
        </div>
        <MeetingStatus status={meetingStatus} />
      </FrameHeader>
      <FramePanel className="min-w-0 p-4">
        <Tabs defaultValue="input">
          <TabsList className="max-w-full flex-wrap">
            <TabsTab value="input">Input</TabsTab>
            <TabsTab value="draft">Draft</TabsTab>
            <TabsTab value="review">Review</TabsTab>
            <TabsTab value="published">Meetings</TabsTab>
          </TabsList>
          <TabsPanel value="input">
            <Textarea
              className="min-h-40 max-w-full resize-y"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </TabsPanel>
          <TabsPanel value="draft">
            <AiRunPanel review={review} />
          </TabsPanel>
          <TabsPanel value="review">
            <ReviewList review={review} />
          </TabsPanel>
          <TabsPanel value="published">
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

/** Derives the one primary action shown in the meeting workflow. */
function getPrimaryAction({
  hasReviewItems,
  isCreatingMeeting,
  isGenerating,
  isPublishing,
  meetingStatus,
  selectedMeetingId,
  selectedProjectId,
}: {
  readonly hasReviewItems: boolean;
  readonly isCreatingMeeting: boolean;
  readonly isGenerating: boolean;
  readonly isPublishing: boolean;
  readonly meetingStatus: string | undefined;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  if (!selectedProjectId) {
    return {
      disabled: true,
      icon: File02Icon,
      label: "Select project",
      loading: false,
      step: "none",
    } as const;
  }

  if (!selectedMeetingId || meetingStatus === "published") {
    return {
      disabled: isCreatingMeeting,
      icon: File02Icon,
      label: "New meeting",
      loading: isCreatingMeeting,
      step: "create",
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
    label: "Generate minutes",
    loading: isGenerating || meetingStatus === "processing",
    step: "generate",
  } as const;
}

/** Shows the current meeting status as a compact workflow hint. */
function MeetingStatus({ status }: { readonly status: string | undefined }) {
  const label = status ?? "No meeting selected";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground text-xs">
      <Badge variant={status === "published" ? "success" : "outline"}>
        {label}
      </Badge>
      <span>Input</span>
      <span>Generate</span>
      <span>Review</span>
      <span>Publish</span>
    </div>
  );
}

/** Displays AI run events without keeping a completed progress bar on screen. */
function AiRunPanel({ review }: { readonly review: ReviewResult }) {
  return QueryResult.match(review, {
    onLoading: () => <Progress value={30} />,
    onFailure: (error) => (
      <Alert variant="warning">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    ),
    onSuccess: (state) => {
      const latestRun = state.aiRuns[0];
      const isRunning = latestRun?.status === "running";

      if (state.aiRunEvents.length === 0) {
        return (
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyTitle>No AI run yet</EmptyTitle>
              <EmptyDescription>
                Generate minutes after adding meeting input.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        );
      }

      return (
        <FramePanel className="grid min-w-0 gap-3 p-4">
          {isRunning ? <Progress value={65} /> : null}
          <ScrollArea className="max-h-72">
            <div className="grid min-w-0 gap-2 pr-1">
              {state.aiRunEvents.map((event) => (
                <div
                  className="grid min-w-0 gap-1 rounded-lg border bg-background px-3 py-2"
                  key={event._id}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <Badge variant="outline">{event.kind}</Badge>
                    <span className="text-muted-foreground text-xs">
                      Step {event.order}
                    </span>
                  </div>
                  <p className="break-words text-sm">{event.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FramePanel>
      );
    },
  });
}

/** Displays generated minute items for review without table overflow. */
function ReviewList({ review }: { readonly review: ReviewResult }) {
  return QueryResult.match(review, {
    onLoading: () => <Progress value={30} />,
    onFailure: (error) => (
      <Alert variant="warning">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    ),
    onSuccess: (state) =>
      state.items.length === 0 ? (
        <Empty className="min-h-56">
          <EmptyHeader>
            <EmptyTitle>No draft yet</EmptyTitle>
            <EmptyDescription>
              Generate minutes to review structured items before publishing.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid min-w-0 gap-2">
          {state.items.map((item) => (
            <FramePanel className="min-w-0 p-3" key={item._id}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant="outline">{item.kind}</Badge>
                <h3 className="min-w-0 break-words font-medium text-sm">
                  {item.title}
                </h3>
              </div>
              <p className="mt-2 break-words text-muted-foreground text-sm">
                {item.body}
              </p>
            </FramePanel>
          ))}
        </div>
      ),
  });
}

/** Lists meetings and lets the user select the active workspace meeting. */
function MeetingsList({
  meetings,
  selectedMeetingId,
  setSelectedMeetingId,
}: {
  readonly meetings: MeetingsResult;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly setSelectedMeetingId: (
    meetingId: GenericId<"meetings"> | null
  ) => void;
}) {
  return QueryResult.match(meetings, {
    onLoading: () => <Progress value={30} />,
    onFailure: (error) => (
      <Alert variant="warning">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    ),
    onSuccess: (items) =>
      items.length === 0 ? (
        <Empty className="min-h-56">
          <EmptyHeader>
            <EmptyTitle>No meetings yet</EmptyTitle>
            <EmptyDescription>
              Create a meeting to start building project memory.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid min-w-0 gap-2">
          {items.map((meeting) => (
            <button
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
              key={meeting._id}
              onClick={() => setSelectedMeetingId(meeting._id)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {meeting.title}
                </span>
                <span className="block text-muted-foreground text-xs">
                  {meeting.meetingDate}
                </span>
              </span>
              <Badge
                variant={
                  meeting._id === selectedMeetingId ? "success" : "outline"
                }
              >
                {meeting.status}
              </Badge>
            </button>
          ))}
        </div>
      ),
  });
}
