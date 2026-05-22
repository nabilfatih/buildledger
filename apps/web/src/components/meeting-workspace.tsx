import { QueryResult, useAction, useMutation } from "@confect/react";
import { File02Icon, PlayIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  FramePanel,
  HugeIcons,
  Progress,
  ScrollArea,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Textarea,
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { useState } from "react";

import type { MeetingsResult, ReviewResult } from "@/lib/confect-results";

/** Coordinates meeting input, AI generation, review, and publication. */
export function MeetingWorkspace({
  meetings,
  review,
  selectedMeetingId,
  selectedProjectId,
  setNotice,
  setSelectedMeetingId,
}: {
  readonly meetings: MeetingsResult;
  readonly review: ReviewResult;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setNotice: (message: string | null) => void;
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

  /** Creates a draft meeting for the selected project. */
  async function handleCreateMeeting() {
    if (!selectedProjectId) {
      return;
    }

    const result = await createDraft({
      projectId: selectedProjectId,
      title: "Weekly OAC coordination",
      meetingType: "OAC",
      meetingDate: new Date().toISOString().slice(0, 10),
      agenda: "Safety, schedule, blockers, risk review",
    });

    if (result._tag === "Left") {
      setNotice(result.left.message);
      return;
    }

    setSelectedMeetingId(result.right);
  }

  /** Persists meeting input and starts the AI minutes action. */
  async function handleGenerate() {
    if (!selectedMeetingId) {
      return;
    }

    setNotice(null);

    const inputResult = await addInput({
      meetingId: selectedMeetingId,
      kind: "notes",
      text: notes,
    });

    if (inputResult._tag === "Left") {
      setNotice(inputResult.left.message);
      return;
    }

    const result = await generateMinutes({ meetingId: selectedMeetingId });

    if (result._tag === "Left") {
      setNotice(result.left.message);
    }
  }

  /** Publishes reviewed minutes into project memory. */
  async function handlePublish() {
    if (!selectedMeetingId) {
      return;
    }

    setNotice(null);

    const result = await publishMinutes({ meetingId: selectedMeetingId });

    if (result._tag === "Left") {
      setNotice(result.left.message);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-xl">Meeting workspace</h2>
          <p className="text-muted-foreground text-sm">
            Capture notes, generate minutes, review, publish.
          </p>
        </div>
        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              disabled={!selectedProjectId}
              onClick={handleCreateMeeting}
              size="sm"
              variant="outline"
            >
              <HugeIcons icon={File02Icon} /> New meeting
            </Button>
            <Button
              disabled={!selectedMeetingId}
              onClick={handleGenerate}
              size="sm"
            >
              <HugeIcons icon={PlayIcon} /> Run AI minutes
            </Button>
            <Button
              disabled={!selectedMeetingId}
              onClick={handlePublish}
              size="sm"
              variant="secondary"
            >
              <HugeIcons icon={Tick01Icon} /> Publish
            </Button>
          </ToolbarGroup>
        </Toolbar>
      </div>

      <Tabs defaultValue="input">
        <TabsList className="max-w-full flex-wrap">
          <TabsTab value="input">Input</TabsTab>
          <TabsTab value="draft">AI Draft</TabsTab>
          <TabsTab value="review">Review</TabsTab>
          <TabsTab value="published">Published</TabsTab>
        </TabsList>
        <TabsPanel value="input">
          <Textarea
            className="min-h-44 max-w-full resize-y"
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
    </section>
  );
}

/** Displays realtime AI progress and persisted AI run events. */
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

      return (
        <FramePanel className="grid min-w-0 gap-3 p-4">
          <Progress value={getAiRunProgress(latestRun?.status)} />
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
                      {event.order}
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

/** Converts run status into a compact progress value. */
function getAiRunProgress(status: string | undefined) {
  if (status === "succeeded") {
    return 100;
  }

  if (status === "failed") {
    return 100;
  }

  if (status) {
    return 65;
  }

  return 0;
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
    onSuccess: (state) => (
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
    onSuccess: (items) => (
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
