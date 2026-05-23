"use client";

import { QueryResult } from "@confect/react";
import {
  Search01Icon,
  SortingDownIcon,
  SortingUpIcon,
} from "@hugeicons/core-free-icons";
import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldLabel,
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
  HugeIcons,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Progress,
  ScrollArea,
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Table as ReactTable,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { LedgerResult } from "@/lib/confect-results";

const kindFilters = [
  { label: "All types", value: "all" },
  { label: "Action", value: "action" },
  { label: "Decision", value: "decision" },
  { label: "Risk", value: "risk" },
  { label: "Discussion", value: "discussion" },
  { label: "Question", value: "question" },
];

const severityFilters = [
  { label: "All severities", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
  { label: "Recorded", value: "recorded" },
];

type QueryValue<Result> = Result extends {
  readonly _tag: "Success";
  readonly value: infer Value;
}
  ? Value
  : never;
type LedgerRow = QueryValue<LedgerResult>[number];
interface LedgerFilterState {
  readonly endDate: string;
  readonly kind: string;
  readonly owner: string;
  readonly search: string;
  readonly severity: string;
  readonly source: string;
  readonly startDate: string;
  readonly status: string;
}

const columnHelper = createColumnHelper<LedgerRow>();

const columns = [
  columnHelper.accessor("kind", {
    header: "Type",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("title", {
    header: "Description",
    cell: (info) => (
      <div className="grid min-w-0 gap-1">
        <span className="break-words font-medium leading-snug">
          {info.getValue()}
        </span>
        {info.row.original.body ? (
          <span className="line-clamp-2 break-words text-muted-foreground text-xs leading-snug">
            {info.row.original.body}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor("meetingTitle", {
    header: "Source",
    cell: (info) => (
      <span className="block max-w-44 truncate">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("ownerName", {
    header: "Owner",
    cell: (info) => info.getValue() ?? "Unassigned",
  }),
  columnHelper.accessor("dueDate", {
    header: "Due",
    cell: (info) => info.getValue() ?? "None",
  }),
  columnHelper.accessor("severity", {
    header: "Severity",
    cell: (info) => info.getValue() ?? "None",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <Badge variant="success">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("meetingDate", {
    header: "Date",
  }),
  columnHelper.accessor("citationCount", {
    header: "Citations",
    cell: (info) => info.getValue(),
  }),
];

/** Normalizes free-text filter input for repeatable comparisons. */
function filterQuery(value: string) {
  return value.trim().toLowerCase();
}

/** Checks an optional exact-match filter where "all" means no filtering. */
function matchesFilter(value: string | undefined, selected: string) {
  return selected === "all" || value === selected;
}

/** Checks whether row text contains the active query. */
function includesFilter(value: string, query: string) {
  return query.length === 0 || value.toLowerCase().includes(query);
}

/** Checks date filters against the meeting chronology date. */
function matchesDateRange(row: LedgerRow, filters: LedgerFilterState) {
  if (filters.startDate && row.meetingDate < filters.startDate) {
    return false;
  }

  if (filters.endDate && row.meetingDate > filters.endDate) {
    return false;
  }

  return true;
}

/** Applies every ledger filter with flat early returns. */
function matchesLedgerFilters(row: LedgerRow, filters: LedgerFilterState) {
  const searchText = `${row.title} ${row.body ?? ""} ${row.meetingTitle}`;

  if (!includesFilter(searchText, filterQuery(filters.search))) {
    return false;
  }

  if (!matchesFilter(row.kind, filters.kind)) {
    return false;
  }

  if (!matchesFilter(row.status, filters.status)) {
    return false;
  }

  if (!matchesFilter(row.severity, filters.severity)) {
    return false;
  }

  if (
    !includesFilter(row.ownerName ?? "unassigned", filterQuery(filters.owner))
  ) {
    return false;
  }

  if (!includesFilter(row.meetingTitle, filterQuery(filters.source))) {
    return false;
  }

  return matchesDateRange(row, filters);
}

/** Keeps desktop ledger columns readable without widening the document. */
function getColumnWidth(columnId: string) {
  switch (columnId) {
    case "kind":
      return "w-24";
    case "title":
      return "w-80";
    case "meetingTitle":
      return "w-44";
    case "ownerName":
      return "w-32";
    case "dueDate":
      return "w-28";
    case "severity":
      return "w-28";
    case "status":
      return "w-28";
    case "meetingDate":
      return "w-28";
    case "citationCount":
      return "w-24";
    default:
      return "w-28";
  }
}

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
    columns,
    data: filteredRows,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnVisibility,
      rowSelection,
      sorting,
    },
  });

  return (
    <Frame className="min-w-0">
      <FrameHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Project ledger</FrameTitle>
            <FrameDescription>
              Search decisions, actions, risks, questions, and cited records.
            </FrameDescription>
          </div>
          <Badge variant="info">{filteredRows.length} rows</Badge>
        </div>
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
      </FrameHeader>
      <FramePanel className="min-w-0 p-0">
        {QueryResult.match(ledger, {
          onLoading: () => <Progress value={40} />,
          onFailure: (error) => (
            <div className="p-4 text-muted-foreground text-sm">
              {error.message}
            </div>
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
              <div className="grid min-w-0 gap-3 p-3">
                <ColumnControls table={table} />
                <DesktopLedgerTable table={table} />
                <MobileLedgerCards rows={table.getRowModel().rows} />
                <LedgerPagination table={table} />
              </div>
            ),
        })}
      </FramePanel>
    </Frame>
  );
}

/** Renders the ledger filter controls without adding horizontal overflow. */
function LedgerFilters({
  endDate,
  kind,
  owner,
  search,
  setEndDate,
  setKind,
  setOwner,
  setSearch,
  setSeverity,
  setSource,
  setStartDate,
  setStatus,
  severity,
  source,
  startDate,
  status,
}: {
  readonly endDate: string;
  readonly kind: string;
  readonly owner: string;
  readonly search: string;
  readonly setEndDate: (value: string) => void;
  readonly setKind: (value: string) => void;
  readonly setOwner: (value: string) => void;
  readonly setSearch: (value: string) => void;
  readonly setSeverity: (value: string) => void;
  readonly setSource: (value: string) => void;
  readonly setStartDate: (value: string) => void;
  readonly setStatus: (value: string) => void;
  readonly severity: string;
  readonly source: string;
  readonly startDate: string;
  readonly status: string;
}) {
  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <Field className="min-w-0 xl:col-span-2">
        <FieldLabel>Search</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>
              <HugeIcons icon={Search01Icon} />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Description or source"
            value={search}
          />
        </InputGroup>
      </Field>
      <FilterSelect
        label="Type"
        onChange={setKind}
        options={kindFilters}
        value={kind}
      />
      <FilterSelect
        label="Status"
        onChange={setStatus}
        options={statusFilters}
        value={status}
      />
      <FilterSelect
        label="Severity"
        onChange={setSeverity}
        options={severityFilters}
        value={severity}
      />
      <Field className="min-w-0">
        <FieldLabel>Owner</FieldLabel>
        <Input
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Owner"
          value={owner}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel>Source meeting</FieldLabel>
        <Input
          onChange={(event) => setSource(event.target.value)}
          placeholder="Meeting title"
          value={source}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel>From</FieldLabel>
        <Input
          onChange={(event) => setStartDate(event.target.value)}
          type="date"
          value={startDate}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel>To</FieldLabel>
        <Input
          onChange={(event) => setEndDate(event.target.value)}
          type="date"
          value={endDate}
        />
      </Field>
    </div>
  );
}

/** Shows a COSS select filter bound to a string value. */
function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly value: string;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={options}
        itemToStringValue={(item) => item.value}
        onValueChange={(item) => {
          if (!item) {
            return;
          }

          onChange(item.value);
        }}
        value={selected}
      >
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

/** Toggles optional table columns for dense desktop scanning. */
function ColumnControls({ table }: { readonly table: ReactTable<LedgerRow> }) {
  const optionalColumns = table
    .getAllLeafColumns()
    .filter((column) => column.id !== "kind" && column.id !== "title");

  return (
    <Toolbar className="min-w-0 flex-wrap justify-between gap-2">
      <ToolbarGroup className="flex-wrap">
        {optionalColumns.map((column) => (
          <Button
            key={column.id}
            onClick={() => column.toggleVisibility()}
            size="xs"
            variant={column.getIsVisible() ? "secondary" : "outline"}
          >
            {typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id}
          </Button>
        ))}
      </ToolbarGroup>
    </Toolbar>
  );
}

/** Renders the desktop ledger table inside its own scroll container. */
function DesktopLedgerTable({
  table,
}: {
  readonly table: ReactTable<LedgerRow>;
}) {
  return (
    <ScrollArea
      className="hidden max-h-[34rem] min-w-0 md:block"
      scrollbarGutter
    >
      <Table className="min-w-[76rem] table-fixed" variant="card">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={`${getColumnWidth(header.column.id)} whitespace-normal align-top`}
                  key={header.id}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      className="inline-flex min-w-0 items-start gap-1 text-left"
                      onClick={header.column.getToggleSortingHandler()}
                      type="button"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <HugeIcons
                          className="mt-0.5 text-muted-foreground"
                          icon={SortingUpIcon}
                        />
                      ) : null}
                      {header.column.getIsSorted() === "desc" ? (
                        <HugeIcons
                          className="mt-0.5 text-muted-foreground"
                          icon={SortingDownIcon}
                        />
                      ) : null}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              data-state={row.getIsSelected() ? "selected" : undefined}
              key={row.id}
              onClick={() => row.toggleSelected()}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className={`${getColumnWidth(cell.column.id)} min-w-0 whitespace-normal align-top`}
                  key={cell.id}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

/** Renders compact ledger rows for mobile instead of shrinking the table. */
function MobileLedgerCards({
  rows,
}: {
  readonly rows: readonly Row<LedgerRow>[];
}) {
  return (
    <div className="grid min-w-0 gap-2 md:hidden">
      {rows.map((row) => (
        <button
          className="grid min-w-0 gap-2 rounded-lg border bg-background p-3 text-left"
          key={row.id}
          onClick={() => row.toggleSelected()}
          type="button"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Badge variant="outline">{row.original.kind}</Badge>
            <span className="text-muted-foreground text-xs">
              {row.original.meetingDate}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="break-words font-medium text-sm">
              {row.original.title}
            </h3>
            <p className="mt-1 line-clamp-2 break-words text-muted-foreground text-xs">
              {row.original.body ?? row.original.meetingTitle}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2 text-muted-foreground text-xs">
            <span>{row.original.status}</span>
            <span>{row.original.ownerName ?? "Unassigned"}</span>
            <span>{row.original.severity ?? "No severity"}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/** Controls TanStack pagination without adding another primary action. */
function LedgerPagination({
  table,
}: {
  readonly table: ReactTable<LedgerRow>;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
      <span>
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount()}
      </span>
      <div className="flex items-center gap-2">
        <Button
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          size="xs"
          variant="outline"
        >
          Previous
        </Button>
        <Button
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          size="xs"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
