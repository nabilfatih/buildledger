import { QueryResult, useAction, useMutation } from "@confect/react";
import { File02Icon, PlayIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Progress } from "@repo/design-system/components/ui/progress";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import type { GenericId } from "convex/values";
import { useEffect, useState } from "react";

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
  const workflowTab = getWorkflowTab({
    meetingStatus,
    selectedMeetingId,
  });
  const [activeTab, setActiveTab] = useState(workflowTab);
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

  useEffect(() => {
    setActiveTab(workflowTab);
  }, [workflowTab]);

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
      setActiveTab("input");
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
      setActiveTab("draft");

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
            <FrameTitle>Meeting Workflow</FrameTitle>
            <FrameDescription>
              Capture notes, generate minutes, review, and publish.
            </FrameDescription>
          </div>
          <Button
            disabled={primaryAction.disabled}
            loading={primaryAction.loading}
            onClick={handlePrimaryAction}
            size="sm"
            type="button"
          >
            <HugeIcons icon={primaryAction.icon} /> {primaryAction.label}
          </Button>
        </div>
      </FrameHeader>
      <FramePanel className="min-w-0 p-4">
        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="max-w-full flex-wrap">
            <TabsTab value="input">Input</TabsTab>
            <TabsTab value="draft">Draft</TabsTab>
            <TabsTab value="review">Review</TabsTab>
            <TabsTab value="meetings">Meetings</TabsTab>
          </TabsList>
          <TabsPanel value="input">
            <Field>
              <FieldLabel>Meeting Notes</FieldLabel>
              <Textarea
                className="min-h-40 max-w-full resize-y"
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
              <FieldDescription>
                Paste notes, decisions, blockers, and action items.
              </FieldDescription>
            </Field>
          </TabsPanel>
          <TabsPanel value="draft">
            <AiRunPanel review={review} />
          </TabsPanel>
          <TabsPanel value="review">
            <ReviewList review={review} />
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

/** Selects the tab that best matches the current meeting state. */
function getWorkflowTab({
  meetingStatus,
  selectedMeetingId,
}: {
  readonly meetingStatus: string | undefined;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
}) {
  if (!selectedMeetingId) {
    return "input";
  }

  if (meetingStatus === "published") {
    return "meetings";
  }

  if (meetingStatus === "review") {
    return "review";
  }

  if (meetingStatus === "processing") {
    return "draft";
  }

  return "input";
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
      label: "Select Project",
      loading: false,
      step: "none",
    } as const;
  }

  if (!selectedMeetingId || meetingStatus === "published") {
    return {
      disabled: isCreatingMeeting,
      icon: File02Icon,
      label: "New Meeting",
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
    label: "Generate Minutes",
    loading: isGenerating || meetingStatus === "processing",
    step: "generate",
  } as const;
}

/** Formats backend status values for a consistent UI voice. */
function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Maps generated meeting item kinds to semantic COSS badge variants. */
function minuteItemVariant(kind: string) {
  if (kind === "risk") {
    return "warning";
  }

  if (kind === "decision") {
    return "success";
  }

  if (kind === "action" || kind === "question") {
    return "info";
  }

  return "outline";
}

/** Maps AI run event kinds to semantic COSS badge variants. */
function aiRunEventVariant(kind: string) {
  if (kind === "completed") {
    return "success";
  }

  if (kind === "failed") {
    return "error";
  }

  return "info";
}

/** Displays AI run events without keeping a completed progress bar on screen. */
function AiRunPanel({ review }: { readonly review: ReviewResult }) {
  return QueryResult.match(review, {
    onLoading: () => <Skeleton className="h-48" />,
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
                    <Badge variant={aiRunEventVariant(event.kind)}>
                      {titleCase(event.kind)}
                    </Badge>
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
    onLoading: () => <Skeleton className="h-48" />,
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
                <Badge variant={minuteItemVariant(item.kind)}>
                  {titleCase(item.kind)}
                </Badge>
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
    onLoading: () => <Skeleton className="h-48" />,
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
            <Button
              className="grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] justify-stretch gap-3 whitespace-normal px-3 py-2 text-left"
              key={meeting._id}
              onClick={() => setSelectedMeetingId(meeting._id)}
              type="button"
              variant={
                meeting._id === selectedMeetingId ? "secondary" : "outline"
              }
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
                {titleCase(meeting.status)}
              </Badge>
            </Button>
          ))}
        </div>
      ),
  });
}
