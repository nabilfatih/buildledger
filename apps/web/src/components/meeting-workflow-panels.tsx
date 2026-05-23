import { QueryResult } from "@confect/react";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { GenericId } from "convex/values";

import { titleCase } from "@/components/meeting-workspace-utils";
import { WorkflowPanelSkeleton } from "@/components/workflow-panel-skeleton";
import type { MeetingsResult } from "@/lib/confect-results";
import { formatDisplayDate } from "@/lib/dates";

/** Shows the persisted meeting notes input for draft generation. */
export function InputPanel({
  canEdit,
  notes,
  onNotesChange,
  selectedMeetingId,
}: {
  readonly canEdit: boolean;
  readonly notes: string;
  readonly onNotesChange: (notes: string) => void;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
}) {
  if (!selectedMeetingId) {
    return (
      <Empty className="min-h-56">
        <EmptyHeader>
          <EmptyTitle>No meeting selected</EmptyTitle>
          <EmptyDescription>
            Create a meeting before adding notes.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Field>
      <FieldLabel>Meeting Notes</FieldLabel>
      <Textarea
        className="min-h-40 max-w-full resize-y"
        disabled={!canEdit}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Paste notes, decisions, blockers, risks, owners, and due dates."
        value={notes}
      />
      <FieldDescription>
        Notes are saved when minutes are generated.
      </FieldDescription>
    </Field>
  );
}

/** Lists meetings and lets the user select the active workflow record. */
export function MeetingsList({
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
    onLoading: () => <WorkflowPanelSkeleton />,
    onFailure: (error) => (
      <Empty className="min-h-56">
        <EmptyHeader>
          <EmptyTitle>Meetings unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
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
          {items.map((meeting) => {
            const isSelected = meeting._id === selectedMeetingId;

            return (
              <Button
                aria-current={isSelected ? "true" : undefined}
                className="grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start justify-stretch gap-3 whitespace-normal px-3 py-3 text-left aria-current:cursor-default aria-current:hover:bg-secondary sm:h-auto"
                key={meeting._id}
                onClick={
                  isSelected
                    ? undefined
                    : () => setSelectedMeetingId(meeting._id)
                }
                type="button"
                variant={isSelected ? "secondary" : "outline"}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {meeting.title}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {formatDisplayDate(meeting.meetingDate)}
                  </span>
                </span>
                <Badge
                  className="self-start"
                  variant={
                    meeting.status === "published" ? "success" : "outline"
                  }
                >
                  {titleCase(meeting.status)}
                </Badge>
              </Button>
            );
          })}
        </div>
      ),
  });
}
