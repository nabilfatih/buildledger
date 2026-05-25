import { titleCase } from "@/components/ledger/format";
import type {
  LogbookFilterState,
  LogbookRow,
} from "@/components/logbook/types";

/** Formats logbook event values without exposing storage underscores. */
export function formatLogbookEvent(value: string) {
  return titleCase(value.replaceAll("_", " "));
}

/** Maps logbook events to semantic COSS badge variants. */
export function logbookEventVariant(value: string) {
  if (value === "risk_detected") {
    return "warning";
  }

  if (value === "status_changed" || value === "protocol_published") {
    return "success";
  }

  if (value === "assignment_changed" || value === "record_created") {
    return "info";
  }

  return "outline";
}

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

/** Applies every logbook filter with flat early returns. */
export function matchesLogbookFilters(
  row: LogbookRow,
  filters: LogbookFilterState
) {
  const searchText = `${row.title} ${row.body} ${row.component ?? ""} ${row.objectName ?? ""} ${row.trade ?? ""} ${row.responsibleParty ?? ""} ${formatLogbookEvent(row.eventType)}`;

  if (!includesFilter(searchText, filterQuery(filters.search))) {
    return false;
  }

  if (!matchesFilter(row.eventType, filters.eventType)) {
    return false;
  }

  if (
    !includesFilter(
      row.responsibleParty ?? "unassigned",
      filterQuery(filters.responsible)
    )
  ) {
    return false;
  }

  return includesFilter(row.trade ?? "unassigned", filterQuery(filters.trade));
}
