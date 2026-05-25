import type {
  LedgerFilterState,
  LedgerRow,
  LedgerTable,
} from "@/components/ledger/types";
import { formatDisplayDate } from "@/lib/dates";

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

/** Checks date filters against the protocol chronology date. */
function matchesDateRange(row: LedgerRow, filters: LedgerFilterState) {
  if (filters.startDate && row.sourceProtocolDate < filters.startDate) {
    return false;
  }

  if (filters.endDate && row.sourceProtocolDate > filters.endDate) {
    return false;
  }

  return true;
}

/** Applies every ledger filter with flat early returns. */
export function matchesLedgerFilters(
  row: LedgerRow,
  filters: LedgerFilterState
) {
  const searchText = `${row.recordNumber} ${row.title} ${row.body ?? ""} ${row.sourceProtocolTitle} ${row.bauteil ?? ""} ${row.objectName ?? ""} ${row.trade ?? ""}`;

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
    !includesFilter(
      row.responsibleParty ?? "unassigned",
      filterQuery(filters.owner)
    )
  ) {
    return false;
  }

  if (!includesFilter(row.sourceProtocolTitle, filterQuery(filters.source))) {
    return false;
  }

  return matchesDateRange(row, filters);
}

/** Formats enum values for consistent user-facing labels. */
export function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Formats ledger item types for badges and copied rows. */
export function formatKind(value: string) {
  return titleCase(value);
}

/** Formats workflow status values for badges and copied rows. */
export function formatStatus(value: string) {
  return titleCase(value);
}

/** Formats optional severity values without exposing raw nulls. */
export function formatSeverity(value: string | null | undefined) {
  return value ? titleCase(value) : "No Severity";
}

/** Maps ledger status to semantic COSS badge variants. */
export function statusVariant(value: string) {
  if (value === "done" || value === "recorded") {
    return "success";
  }

  if (value === "blocked") {
    return "warning";
  }

  return "outline";
}

/** Maps ledger type to semantic COSS badge variants. */
export function kindVariant(value: string) {
  if (value === "risk") {
    return "warning";
  }

  if (value === "decision") {
    return "success";
  }

  if (value === "task" || value === "question") {
    return "info";
  }

  return "outline";
}

/** Creates the displayed page range for the pagination select. */
export function getPageOption(table: LedgerTable, index: number) {
  const pageSize = table.getState().pagination.pageSize;
  const start = index * pageSize + 1;
  const end = Math.min((index + 1) * pageSize, table.getRowCount());

  return {
    label: `${start}-${end}`,
    value: index,
  };
}

/** Formats selected ledger rows for sharing outside the table. */
export function formatSelectedRows(rows: readonly LedgerRow[]) {
  return rows
    .map(
      (row) =>
        `${formatKind(row.kind)}: ${row.title}\nSource: ${row.sourceProtocolTitle} (${formatDisplayDate(row.sourceProtocolDate)})\nStatus: ${formatStatus(row.status)}`
    )
    .join("\n\n");
}
