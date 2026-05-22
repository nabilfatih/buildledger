import { QueryResult, useAction, useMutation } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Badge,
  Button,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Textarea,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { Check, FileText, Play } from "lucide-react";
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

    await addInput({
      meetingId: selectedMeetingId,
      kind: "notes",
      text: notes,
    });
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

    const result = await publishMinutes({ meetingId: selectedMeetingId });
    if (result._tag === "Left") {
      setNotice(result.left.message);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl">Meeting workspace</h2>
        <div className="flex gap-2">
          <Button
            disabled={!selectedProjectId}
            onClick={handleCreateMeeting}
            variant="outline"
          >
            <FileText /> New meeting
          </Button>
          <Button disabled={!selectedMeetingId} onClick={handleGenerate}>
            <Play /> Run AI minutes
          </Button>
          <Button
            disabled={!selectedMeetingId}
            onClick={handlePublish}
            variant="secondary"
          >
            <Check /> Publish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTab value="input">Input</TabsTab>
          <TabsTab value="draft">AI Draft</TabsTab>
          <TabsTab value="review">Review</TabsTab>
          <TabsTab value="published">Published</TabsTab>
        </TabsList>
        <TabsPanel value="input">
          <Textarea
            className="min-h-40"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </TabsPanel>
        <TabsPanel value="draft">
          <AiRunPanel review={review} />
        </TabsPanel>
        <TabsPanel value="review">
          <ReviewTable review={review} />
        </TabsPanel>
        <TabsPanel value="published">
          <MeetingsTable
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
    onFailure: (error) => <Badge variant="warning">{error.message}</Badge>,
    onSuccess: (state) => {
      const latestRun = state.aiRuns[0];
      const progress = getAiRunProgress(latestRun?.status);

      return (
        <div className="flex flex-col gap-3">
          <Progress value={progress} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.aiRunEvents.map((event) => (
                <TableRow key={event._id}>
                  <TableCell>{event.order}</TableCell>
                  <TableCell>
                    <Badge>{event.kind}</Badge>
                  </TableCell>
                  <TableCell>{event.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    },
  });
}

/** Converts run status into a compact progress value. */
function getAiRunProgress(status: string | undefined) {
  if (status === "succeeded") {
    return 100;
  }

  if (status) {
    return 65;
  }

  return 0;
}

/** Displays generated minute items for review. */
function ReviewTable({ review }: { readonly review: ReviewResult }) {
  return QueryResult.match(review, {
    onLoading: () => <Progress value={30} />,
    onFailure: (error) => <Badge variant="warning">{error.message}</Badge>,
    onSuccess: (state) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kind</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Body</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.items.map((item) => (
            <TableRow key={item._id}>
              <TableCell>
                <Badge variant="outline">{item.kind}</Badge>
              </TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{item.body}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
  });
}

/** Lists meetings and lets the user select the active workspace meeting. */
function MeetingsTable({
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
    onFailure: (error) => <Badge variant="warning">{error.message}</Badge>,
    onSuccess: (items) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Meeting</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((meeting) => (
            <TableRow
              key={meeting._id}
              onClick={() => setSelectedMeetingId(meeting._id)}
            >
              <TableCell>{meeting.title}</TableCell>
              <TableCell>{meeting.meetingDate}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    meeting._id === selectedMeetingId ? "success" : "outline"
                  }
                >
                  {meeting.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
  });
}
