import { QueryResult, useQuery } from "@confect/react";
import { useDebouncedValue } from "@mantine/hooks";
import refs from "@repo/backend/confect/_generated/refs";
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
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { GenericId } from "convex/values";
import { useMemo, useState } from "react";

import { logbookColumns } from "@/components/logbook/columns";
import { LogbookDataTable } from "@/components/logbook/data";
import { LogbookFilters } from "@/components/logbook/filters";
import { logbookPageSize } from "@/components/logbook/types";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";

/** Shows traceable project changes created by published protocols and record edits. */
export function LogbookPanel({
  selectedProjectId,
}: {
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [trade, setTrade] = useState("");
  const [responsible, setResponsible] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [debouncedTrade] = useDebouncedValue(trade, 200);
  const [debouncedResponsible] = useDebouncedValue(responsible, 200);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: logbookPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "chronologyDate", desc: true },
  ]);
  const logbookFilters = useMemo(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(eventType === "all" ? {} : { eventType }),
      ...(debouncedTrade.trim() ? { trade: debouncedTrade.trim() } : {}),
      ...(debouncedResponsible.trim()
        ? { responsibleParty: debouncedResponsible.trim() }
        : {}),
    }),
    [debouncedResponsible, debouncedSearch, debouncedTrade, eventType]
  );
  const logbook = useQuery(
    refs.public.logbook.listByProject,
    selectedProjectId
      ? {
          filters: logbookFilters,
          paginationOpts: { cursor: null, numItems: logbookPageSize * 8 },
          projectId: selectedProjectId,
        }
      : "skip"
  );
  const rows = logbook._tag === "Success" ? logbook.value.page : [];
  const table = useReactTable({
    columns: logbookColumns,
    data: rows,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row._id,
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
  });

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Smart Logbook</FrameTitle>
        <FrameDescription>
          Trace decisions, risks, blockers, assignments, and protocol events.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="grid min-w-0 gap-4 p-4">
        <LogbookFilters
          eventType={eventType}
          responsible={responsible}
          search={search}
          setEventType={setEventType}
          setResponsible={setResponsible}
          setSearch={setSearch}
          setTrade={setTrade}
          trade={trade}
        />
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
              <LogbookDataTable table={table} />
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
