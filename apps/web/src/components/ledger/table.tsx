import { QueryResult, useMutation, useQuery } from "@confect/react";
import { useDebouncedValue } from "@mantine/hooks";
import refs from "@repo/backend/confect/_generated/refs";
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
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useMemo, useState } from "react";

import { ledgerColumns } from "@/components/ledger/columns";
import { LedgerDataTable } from "@/components/ledger/data";
import { LedgerFilters } from "@/components/ledger/filters";
import { formatSelectedRows } from "@/components/ledger/format";
import { LedgerTableSkeleton } from "@/components/ledger/skeleton";
import { ledgerPageSize } from "@/components/ledger/types";
import { getErrorMessage } from "@/lib/errors";

/** Shows derived project memory as a sortable and filterable ledger. */
export function ProjectLedgerTable({
  selectedProjectId,
}: {
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const updateStatus = useMutation(refs.public.records.updateStatus);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [debouncedOwner] = useDebouncedValue(owner, 200);
  const [debouncedSource] = useDebouncedValue(source, 200);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ledgerPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "sourceProtocolDate", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isResolvingRows, setIsResolvingRows] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    citationCount: false,
    dueDate: false,
    responsibleParty: false,
    severity: false,
  });
  const recordFilters = useMemo(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(kind === "all" ? {} : { kind }),
      ...(status === "all" ? {} : { status }),
      ...(severity === "all" ? {} : { severity }),
      ...(debouncedOwner.trim()
        ? { responsibleParty: debouncedOwner.trim() }
        : {}),
      ...(debouncedSource.trim()
        ? { sourceProtocol: debouncedSource.trim() }
        : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }),
    [
      debouncedOwner,
      debouncedSearch,
      debouncedSource,
      endDate,
      kind,
      severity,
      startDate,
      status,
    ]
  );
  const records = useQuery(
    refs.public.records.listByProject,
    selectedProjectId
      ? {
          filters: recordFilters,
          paginationOpts: { cursor: null, numItems: ledgerPageSize * 8 },
          projectId: selectedProjectId,
        }
      : "skip"
  );
  const rows = records._tag === "Success" ? records.value.page : [];
  const table = useReactTable({
    columns: ledgerColumns,
    data: rows,
    enableRowSelection: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row._id,
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

  /** Marks selected records as resolved and writes the audit event server-side. */
  function handleResolveSelectedRows() {
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

    setIsResolvingRows(true);
    return Effect.runPromise(
      Effect.forEach(
        selectedRows,
        (row) =>
          Effect.tryPromise({
            try: () => updateStatus({ recordId: row._id, status: "resolved" }),
            catch: getErrorMessage,
          }).pipe(
            Effect.flatMap((result) =>
              Either.match(result, {
                onLeft: (error) => Effect.fail(error.message),
                onRight: () => Effect.void,
              })
            )
          ),
        { concurrency: 3 }
      ).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            table.resetRowSelection();
            toastManager.add({
              title: "Ledger rows resolved",
              description: `${selectedRows.length} selected row${selectedRows.length === 1 ? "" : "s"} updated.`,
              type: "success",
            });
          })
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Rows were not updated",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsResolvingRows(false)))
      )
    );
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Project Ledger</FrameTitle>
        <FrameDescription>
          Search tasks, decisions, risks, questions, and cited records.
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
        {QueryResult.match(records, {
          onLoading: () => <LedgerTableSkeleton />,
          onFailure: (error) => (
            <div className="text-muted-foreground text-sm">{error.message}</div>
          ),
          onSuccess: () => (
            <LedgerDataTable
              onCopySelectedRows={handleCopySelectedRows}
              onResolveSelectedRows={handleResolveSelectedRows}
              resolvingSelectedRows={isResolvingRows}
              table={table}
            />
          ),
        })}
      </FramePanel>
    </Frame>
  );
}
