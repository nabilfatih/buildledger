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
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import { titleCase } from "@/components/protocol/utils";
import type { ProtocolsResult } from "@/lib/confect-results";
import { formatDisplayDate } from "@/lib/dates";

/** Shows the persisted protocol notes input for draft generation. */
export function InputPanel({
  canEdit,
  notes,
  onNotesChange,
  selectedProtocolId,
}: {
  readonly canEdit: boolean;
  readonly notes: string;
  readonly onNotesChange: (notes: string) => void;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
}) {
  if (!selectedProtocolId) {
    return (
      <Empty className="min-h-56">
        <EmptyHeader>
          <EmptyTitle>No protocol selected</EmptyTitle>
          <EmptyDescription>
            Create a protocol before adding notes.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Field>
      <FieldLabel>Protocol Source</FieldLabel>
      <Textarea
        className="min-h-40 max-w-full resize-y"
        disabled={!canEdit}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Paste notes, transcript, decisions, blockers, risks, responsible parties, and due dates."
        value={notes}
      />
      <FieldDescription>
        Sources are saved when the protocol is generated.
      </FieldDescription>
    </Field>
  );
}

/** Lists protocols and lets the user select the active workflow record. */
export function ProtocolsList({
  protocols,
  selectedProtocolId,
  setSelectedProtocolId,
}: {
  readonly protocols: ProtocolsResult;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
  readonly setSelectedProtocolId: (
    protocolId: GenericId<"protocols"> | null
  ) => void;
}) {
  return QueryResult.match(protocols, {
    onLoading: () => <WorkflowPanelSkeleton />,
    onFailure: (error) => (
      <Empty className="min-h-56">
        <EmptyHeader>
          <EmptyTitle>Protocols unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
    onSuccess: (protocolPage) =>
      protocolPage.page.length === 0 ? (
        <Empty className="min-h-56">
          <EmptyHeader>
            <EmptyTitle>No protocols yet</EmptyTitle>
            <EmptyDescription>
              Create a protocol to start building project memory.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid min-w-0 gap-2">
          {protocolPage.page.map((protocol) => {
            const isSelected = protocol._id === selectedProtocolId;

            return (
              <Button
                aria-current={isSelected ? "true" : undefined}
                className="grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start justify-stretch gap-3 whitespace-normal px-3 py-3 text-left aria-current:cursor-default aria-current:hover:bg-secondary sm:h-auto"
                key={protocol._id}
                onClick={() => setSelectedProtocolId(protocol._id)}
                type="button"
                variant={isSelected ? "secondary" : "outline"}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {protocol.title}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {formatDisplayDate(protocol.protocolDate)}
                  </span>
                </span>
                <Badge
                  className="self-start"
                  variant={
                    protocol.status === "published" ? "success" : "outline"
                  }
                >
                  {titleCase(protocol.status)}
                </Badge>
              </Button>
            );
          })}
        </div>
      ),
  });
}
