"use client";

import { QueryResult } from "@confect/react";
import {
  Calendar03Icon,
  ChevronDown,
  ChevronUp,
  Search01Icon,
  TableColumnsSplitIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuTrigger,
} from "@repo/design-system/components/ui/menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@repo/design-system/components/ui/pagination";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
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
const desktopSkeletonRows = [
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "row-5",
  "row-6",
];
const mobileSkeletonRows = ["card-1", "card-2", "card-3", "card-4"];

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
  columnHelper.display({
    id: "select",
    size: 36,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all ledger rows"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.title}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  }),
  columnHelper.accessor("kind", {
    header: "Type",
    size: 92,
    cell: (info) => <KindBadge kind={info.getValue()} />,
  }),
  columnHelper.accessor("title", {
    header: "Description",
    size: 300,
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
    size: 156,
    cell: (info) => (
      <span className="block min-w-0 truncate">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("ownerName", {
    header: "Owner",
    size: 132,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("dueDate", {
    header: "Due",
    size: 112,
    cell: (info) => (
      <MutedValue fallback="No due date" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("severity", {
    header: "Severity",
    size: 112,
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 96,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("meetingDate", {
    header: "Date",
    size: 100,
  }),
  columnHelper.accessor("citationCount", {
    header: "Citations",
    size: 88,
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

/** Formats ledger enum values for consistent user-facing labels. */
function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Formats ledger item types for badges and cards. */
function formatKind(value: string) {
  return titleCase(value);
}

/** Formats workflow status values for badges and cards. */
function formatStatus(value: string) {
  return titleCase(value);
}

/** Formats optional severity values without exposing raw nulls. */
function formatSeverity(value: string | null | undefined) {
  return value ? titleCase(value) : "No Severity";
}

/** Maps ledger status to semantic COSS badge variants. */
function statusVariant(value: string) {
  if (value === "done" || value === "recorded") {
    return "success";
  }

  if (value === "blocked") {
    return "warning";
  }

  return "outline";
}

/** Maps ledger type to semantic COSS badge variants. */
function kindVariant(value: string) {
  if (value === "risk") {
    return "warning";
  }

  if (value === "decision") {
    return "success";
  }

  if (value === "action" || value === "question") {
    return "info";
  }

  return "outline";
}

/** Formats dates for backend filters without timezone drift. */
function formatDateInput(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Parses yyyy-mm-dd filters into Calendar dates. */
function parseDateInput(value: string) {
  if (!value) {
    return;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!(year && month && day)) {
    return;
  }

  return new Date(year, month - 1, day);
}

/** Creates the displayed page range for the pagination select. */
function getPageOption(table: ReactTable<LedgerRow>, index: number) {
  const pageSize = table.getState().pagination.pageSize;
  const start = index * pageSize + 1;
  const end = Math.min((index + 1) * pageSize, table.getRowCount());

  return {
    label: `${start}-${end}`,
    value: index,
  };
}

/** Shows ledger item type using the same semantic badges as review cards. */
function KindBadge({ kind }: { readonly kind: string }) {
  return <Badge variant={kindVariant(kind)}>{formatKind(kind)}</Badge>;
}

/** Shows status with semantic color and consistent capitalization. */
function StatusBadge({ status }: { readonly status: string }) {
  return <Badge variant={statusVariant(status)}>{formatStatus(status)}</Badge>;
}

/** Shows severity only when project memory has one. */
function SeverityBadge({
  severity,
}: {
  readonly severity: string | null | undefined;
}) {
  if (!severity) {
    return <MutedValue fallback="No Severity" value={severity} />;
  }

  return (
    <Badge variant={severity === "high" ? "warning" : "outline"}>
      {formatSeverity(severity)}
    </Badge>
  );
}

/** Displays optional values without heavy badges. */
function MutedValue({
  fallback,
  value,
}: {
  readonly fallback: string;
  readonly value: string | null | undefined;
}) {
  return (
    <span className={value ? undefined : "text-muted-foreground"}>
      {value ?? fallback}
    </span>
  );
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
    enableRowSelection: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
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
            <FrameTitle>Project Ledger</FrameTitle>
            <FrameDescription>
              Search decisions, actions, risks, questions, and cited records.
            </FrameDescription>
          </div>
          <Badge variant="info">{filteredRows.length} Rows</Badge>
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
      <FramePanel className="min-w-0 overflow-hidden p-0">
        {QueryResult.match(ledger, {
          onLoading: () => <LedgerTableSkeleton />,
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
              <div className="grid min-w-0">
                <DesktopLedgerTable table={table} />
                <MobileLedgerCards rows={table.getRowModel().rows} />
                <div className="border-border border-t p-2 xl:hidden">
                  <LedgerPagination table={table} />
                </div>
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
    <Fieldset className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <FieldsetLegend className="sr-only">Ledger Filters</FieldsetLegend>
      <Field className="min-w-0 xl:col-span-2">
        <FieldLabel>Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Description or source"
            type="search"
            value={search}
          />
          <InputGroupAddon>
            <InputGroupText>
              <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
            </InputGroupText>
          </InputGroupAddon>
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
          type="text"
          value={owner}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel>Source Meeting</FieldLabel>
        <Input
          onChange={(event) => setSource(event.target.value)}
          placeholder="Meeting title"
          type="text"
          value={source}
        />
      </Field>
      <DateFilter label="From" onChange={setStartDate} value={startDate} />
      <DateFilter label="To" onChange={setEndDate} value={endDate} />
    </Fieldset>
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

/** Provides a COSS calendar-backed date filter instead of a native date popup. */
function DateFilter({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              className="w-full justify-between"
              type="button"
              variant="outline"
            />
          }
        >
          <span>{value || "Any Date"}</span>
          <HugeIcons icon={Calendar03Icon} />
        </PopoverTrigger>
        <PopoverPopup align="start">
          <Calendar
            mode="single"
            onSelect={(date) => onChange(date ? formatDateInput(date) : "")}
            selected={parseDateInput(value)}
          />
        </PopoverPopup>
      </Popover>
      <FieldDescription className="sr-only">
        Filters ledger rows by meeting date.
      </FieldDescription>
    </Field>
  );
}

/** Keeps the ledger surface stable during query refreshes. */
function LedgerTableSkeleton() {
  return (
    <div className="grid min-w-0 gap-3 p-3">
      <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-16 xl:col-span-2" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="hidden min-w-0 border-border border-y xl:grid">
        <div className="grid gap-2 p-3">
          {desktopSkeletonRows.map((row) => (
            <Skeleton className="h-12" key={row} />
          ))}
        </div>
      </div>
      <div className="grid gap-2 xl:hidden">
        {mobileSkeletonRows.map((row) => (
          <Skeleton className="h-24" key={row} />
        ))}
      </div>
    </div>
  );
}

/** Toggles optional table columns from one compact COSS menu. */
function ColumnMenu({ table }: { readonly table: ReactTable<LedgerRow> }) {
  const optionalColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.id !== "select" && column.id !== "kind" && column.id !== "title"
    );

  return (
    <Menu>
      <MenuTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        <HugeIcons icon={TableColumnsSplitIcon} /> Columns
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuGroupLabel>Visible Columns</MenuGroupLabel>
          {optionalColumns.map((column) => (
            <MenuCheckboxItem
              checked={column.getIsVisible()}
              key={column.id}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {typeof column.columnDef.header === "string"
                ? column.columnDef.header
                : column.id}
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

/** Renders the desktop ledger table inside its own scroll container. */
function DesktopLedgerTable({
  table,
}: {
  readonly table: ReactTable<LedgerRow>;
}) {
  return (
    <div className="hidden min-w-0 xl:grid">
      <Table className="min-w-[58rem] table-fixed" variant="card">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: `${header.column.getSize()}px` }}
                >
                  {header.isPlaceholder ? null : (
                    <ColumnHeaderButton header={header} />
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
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className="min-w-0 whitespace-normal align-top"
                  key={cell.id}
                  style={{ width: `${cell.column.getSize()}px` }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FrameFooter className="border-border border-t p-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ColumnMenu table={table} />
            <p className="text-muted-foreground text-sm">
              {table.getSelectedRowModel().rows.length} Selected
            </p>
          </div>
          <LedgerPagination className="w-fit" table={table} />
        </div>
      </FrameFooter>
    </div>
  );
}

/** Renders sortable table headers with predictable icon placement. */
function ColumnHeaderButton({
  header,
}: {
  readonly header: Header<LedgerRow, unknown>;
}) {
  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext());
  }

  const sortDirection = header.column.getIsSorted();

  return (
    <Button
      className="h-full min-w-0 justify-between px-0 text-left"
      onClick={header.column.getToggleSortingHandler()}
      size="xs"
      type="button"
      variant="ghost"
    >
      <span className="min-w-0 truncate">
        {flexRender(header.column.columnDef.header, header.getContext())}
      </span>
      {sortDirection === "asc" ? (
        <HugeIcons
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground opacity-80"
          icon={ChevronUp}
        />
      ) : null}
      {sortDirection === "desc" ? (
        <HugeIcons
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground opacity-80"
          icon={ChevronDown}
        />
      ) : null}
    </Button>
  );
}

/** Renders compact ledger rows for mobile instead of shrinking the table. */
function MobileLedgerCards({
  rows,
}: {
  readonly rows: readonly Row<LedgerRow>[];
}) {
  return (
    <div className="grid min-w-0 gap-2 xl:hidden">
      {rows.map((row) => (
        <Button
          className="grid h-auto w-full min-w-0 justify-stretch gap-2 whitespace-normal rounded-lg p-3 text-left sm:h-auto"
          key={row.id}
          onClick={() => row.toggleSelected()}
          type="button"
          variant={row.getIsSelected() ? "secondary" : "outline"}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <KindBadge kind={row.original.kind} />
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
            <span>{formatStatus(row.original.status)}</span>
            <span>{row.original.ownerName ?? "Unassigned"}</span>
            <span>{formatSeverity(row.original.severity)}</span>
          </div>
        </Button>
      ))}
    </div>
  );
}

/** Controls TanStack pagination without adding another primary action. */
function LedgerPagination({
  className,
  table,
}: {
  readonly className?: string;
  readonly table: ReactTable<LedgerRow>;
}) {
  const pageOptions = Array.from({ length: table.getPageCount() }, (_, index) =>
    getPageOption(table, index)
  );
  const currentPage = pageOptions[table.getState().pagination.pageIndex];

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-between gap-2 text-muted-foreground text-sm ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>Viewing</span>
        <Select
          items={pageOptions}
          itemToStringValue={(item) => item.label}
          onValueChange={(item) => {
            if (!item) {
              return;
            }

            table.setPageIndex(item.value);
          }}
          value={currentPage ?? null}
        >
          <SelectTrigger
            aria-label="Select ledger result range"
            className="w-fit min-w-24"
            size="sm"
          >
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {pageOptions.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span>
          of{" "}
          <strong className="font-medium text-foreground">
            {table.getRowCount()}
          </strong>{" "}
          Results
        </span>
      </div>
      <Pagination className="mx-0 w-fit justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              render={
                <Button
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              render={
                <Button
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
