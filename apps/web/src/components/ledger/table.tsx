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
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Effect } from "effect";
import { useMemo, useState } from "react";

import { ledgerColumns } from "@/components/ledger/columns";
import { LedgerDataTable } from "@/components/ledger/data";
import { LedgerFilters } from "@/components/ledger/filters";
import {
  formatSelectedRows,
  matchesLedgerFilters,
} from "@/components/ledger/format";
import { LedgerTableSkeleton } from "@/components/ledger/skeleton";
import { ledgerPageSize } from "@/components/ledger/types";
import type { LedgerResult } from "@/lib/confect-results";

/** Shows derived project memory as a sortable and filterable ledger. */
export function ProjectLedgerTable({
  ledger,
}: {
  readonly ledger: LedgerResult;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ledgerPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "meetingDate", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    citationCount: false,
    dueDate: false,
    ownerName: false,
    severity: false,
  });
  const rows = ledger._tag === "Success" ? ledger.value : [];
  const filters = useMemo(
    () => ({
      endDate,
      kind,
      owner,
      search,
      severity,
      source,
      startDate,
      status,
    }),
    [endDate, kind, owner, search, severity, source, startDate, status]
  );
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesLedgerFilters(row, filters)),
    [filters, rows]
  );
  const table = useReactTable({
    columns: ledgerColumns,
    data: filteredRows,
    enableRowSelection: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnVisibility,
      pagination,
      rowSelection,
      sorting,
    },
  });

  /** Copies selected ledger rows so selection has a clear end-to-end action. */
  function handleCopySelectedRows() {
    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original);

    if (selectedRows.length === 0) {
      toastManager.add({
        title: "Select ledger rows first",
        type: "warning",
      });
      return;
    }

    return Effect.runPromise(
      Effect.tryPromise({
        try: () =>
          navigator.clipboard.writeText(formatSelectedRows(selectedRows)),
        catch: () => undefined,
      }).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Ledger rows copied",
              description: `${selectedRows.length} selected row${selectedRows.length === 1 ? "" : "s"} copied.`,
              type: "success",
            })
          )
        ),
        Effect.catchAll(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Rows were not copied",
              description: "Allow clipboard access and try again.",
              type: "error",
            })
          )
        )
      )
    );
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Project Ledger</FrameTitle>
        <FrameDescription>
          Search decisions, actions, risks, questions, and cited records.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="grid min-w-0 gap-4 p-4">
        <LedgerFilters
          endDate={endDate}
          kind={kind}
          owner={owner}
          search={search}
          setEndDate={setEndDate}
          setKind={setKind}
          setOwner={setOwner}
          setSearch={setSearch}
          setSeverity={setSeverity}
          setSource={setSource}
          setStartDate={setStartDate}
          setStatus={setStatus}
          severity={severity}
          source={source}
          startDate={startDate}
          status={status}
        />
        {QueryResult.match(ledger, {
          onLoading: () => <LedgerTableSkeleton />,
          onFailure: (error) => (
            <div className="text-muted-foreground text-sm">{error.message}</div>
          ),
          onSuccess: () =>
            filteredRows.length === 0 ? (
              <Empty className="min-h-72">
                <EmptyHeader>
                  <EmptyTitle>No ledger rows yet</EmptyTitle>
                  <EmptyDescription>
                    Create a meeting, generate minutes, publish them, then the
                    ledger fills from the published project memory.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <LedgerDataTable
                onCopySelectedRows={handleCopySelectedRows}
                table={table}
              />
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
