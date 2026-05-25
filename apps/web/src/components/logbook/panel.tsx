import { QueryResult } from "@confect/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

import { titleCase } from "@/components/ledger/format";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import type { LogbookResult } from "@/lib/confect-results";
import { formatDisplayDate } from "@/lib/dates";

/** Shows traceable project changes created by published protocols and record edits. */
export function LogbookPanel({ logbook }: { readonly logbook: LogbookResult }) {
  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Smart Logbook</FrameTitle>
        <FrameDescription>
          Trace decisions, risks, blockers, assignments, and protocol events.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="min-w-0 p-4">
        {QueryResult.match(logbook, {
          onLoading: () => <WorkflowPanelSkeleton />,
          onFailure: (error) => (
            <Empty className="min-h-48">
              <EmptyHeader>
                <EmptyTitle>Logbook unavailable</EmptyTitle>
                <EmptyDescription>{error.message}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ),
          onSuccess: (events) =>
            events.page.length === 0 ? (
              <Empty className="min-h-48">
                <EmptyHeader>
                  <EmptyTitle>No logbook events yet</EmptyTitle>
                  <EmptyDescription>
                    Publish a protocol to create traceable project history.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table className="min-w-[54rem] table-fixed" variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-36">Event</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Bauteil</TableHead>
                    <TableHead className="w-32">Objekt</TableHead>
                    <TableHead className="w-32">Gewerk</TableHead>
                    <TableHead className="w-40">Responsible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.page.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        {formatDisplayDate(event.chronologyDate)}
                      </TableCell>
                      <TableCell>{titleCase(event.eventType)}</TableCell>
                      <TableCell className="min-w-0 whitespace-normal">
                        <span className="block truncate font-medium">
                          {event.title}
                        </span>
                        <span className="line-clamp-2 text-muted-foreground text-xs">
                          {event.body}
                        </span>
                      </TableCell>
                      <TableCell>{event.bauteil ?? "Unassigned"}</TableCell>
                      <TableCell>{event.objectName ?? "Unassigned"}</TableCell>
                      <TableCell>{event.trade ?? "Unassigned"}</TableCell>
                      <TableCell>
                        {event.responsibleParty ?? "Unassigned"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
