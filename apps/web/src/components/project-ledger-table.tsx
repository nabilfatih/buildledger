import { QueryResult } from "@confect/react";
import {
  Calendar03Icon,
  ChevronDown,
  ChevronUp,
  ClipboardCopyIcon,
  Search01Icon,
  TableColumnsSplitIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
} from "@repo/design-system/components/ui/card";
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
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
  type PaginationState,
  type Table as ReactTable,
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
const ledgerPageSize = 8;
const desktopSkeletonRows = Array.from(
  { length: ledgerPageSize },
  (_, index) => `row-${index + 1}`
);

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

/** Formats selected ledger rows for sharing outside the table. */
function formatSelectedRows(rows: readonly LedgerRow[]) {
  return rows
    .map(
      (row) =>
        `${formatKind(row.kind)}: ${row.title}\nSource: ${row.meetingTitle} (${row.meetingDate})\nStatus: ${formatStatus(row.status)}`
    )
    .join("\n\n");
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
    columns,
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
  async function handleCopySelectedRows() {
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

    try {
      await navigator.clipboard.writeText(formatSelectedRows(selectedRows));
      toastManager.add({
        title: "Ledger rows copied",
        description: `${selectedRows.length} selected row${selectedRows.length === 1 ? "" : "s"} copied.`,
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Rows were not copied",
        description: "Allow clipboard access and try again.",
        type: "error",
      });
    }
  }

  return (
    <CardFrame className="min-w-0">
      <CardFrameHeader className="gap-3">
        <CardFrameTitle>Project Ledger</CardFrameTitle>
        <CardFrameDescription>
          Search decisions, actions, risks, questions, and cited records.
        </CardFrameDescription>
        <CardFrameAction>
          <Badge variant="info">{filteredRows.length} Rows</Badge>
        </CardFrameAction>
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
      </CardFrameHeader>
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
            <LedgerDataTable
              onCopySelectedRows={handleCopySelectedRows}
              table={table}
            />
          ),
      })}
    </CardFrame>
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
    <>
      <Table className="min-w-[58rem] table-fixed" variant="card">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead style={{ width: "54px" }}>
              <Skeleton className="size-5 rounded-md" />
            </TableHead>
            <TableHead style={{ width: "116px" }}>
              <Skeleton className="h-4 w-14" />
            </TableHead>
            <TableHead style={{ width: "340px" }}>
              <Skeleton className="h-4 w-28" />
            </TableHead>
            <TableHead style={{ width: "220px" }}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead style={{ width: "126px" }}>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead style={{ width: "126px" }}>
              <Skeleton className="h-4 w-14" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {desktopSkeletonRows.map((row) => (
            <TableRow key={row}>
              <TableCell>
                <Skeleton className="size-5 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-18" />
              </TableCell>
              <TableCell>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardFrameFooter className="p-2">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-72" />
        </div>
      </CardFrameFooter>
    </>
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

/** Renders the ledger table across all devices with contained table scrolling. */
function LedgerDataTable({
  onCopySelectedRows,
  table,
}: {
  readonly onCopySelectedRows: () => Promise<void>;
  readonly table: ReactTable<LedgerRow>;
}) {
  return (
    <>
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
      <CardFrameFooter className="p-2">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ColumnMenu table={table} />
            <SelectionActions
              onClearSelection={() => table.resetRowSelection()}
              onCopySelectedRows={onCopySelectedRows}
              selectedCount={table.getSelectedRowModel().rows.length}
            />
          </div>
          <LedgerPagination table={table} />
        </div>
      </CardFrameFooter>
    </>
  );
}

/** Shows the concrete action available after rows are selected. */
function SelectionActions({
  onClearSelection,
  onCopySelectedRows,
  selectedCount,
}: {
  readonly onClearSelection: () => void;
  readonly onCopySelectedRows: () => Promise<void>;
  readonly selectedCount: number;
}) {
  if (selectedCount === 0) {
    return <p className="text-muted-foreground text-sm">0 Selected</p>;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-muted-foreground text-sm">{selectedCount} Selected</p>
      <Button
        onClick={onCopySelectedRows}
        size="sm"
        type="button"
        variant="outline"
      >
        <HugeIcons icon={ClipboardCopyIcon} />
        Copy Selected
      </Button>
      <Button
        onClick={onClearSelection}
        size="sm"
        type="button"
        variant="ghost"
      >
        Clear
      </Button>
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
      className={`flex min-w-0 flex-wrap items-center justify-between gap-2 text-muted-foreground text-sm lg:justify-end ${className ?? ""}`}
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
