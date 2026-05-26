import { optionalText } from "./text";

export type RecordKind =
  | "agenda"
  | "discussion"
  | "change"
  | "task"
  | "information"
  | "concern"
  | "obstruction"
  | "decision"
  | "risk"
  | "question";
export type RecordStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "recorded";
export type RecordSeverity = "low" | "medium" | "high";
export type NormalizedRecordFilters = ReturnType<typeof normalizeRecordFilters>;

/** Normalizes record list filters before choosing an indexed read path. */
export function normalizeRecordFilters(
  filters:
    | {
        readonly component?: string | undefined;
        readonly endDate?: string | undefined;
        readonly kind?: string | undefined;
        readonly objectName?: string | undefined;
        readonly responsibleParty?: string | undefined;
        readonly search?: string | undefined;
        readonly severity?: string | undefined;
        readonly sourceProtocol?: string | undefined;
        readonly startDate?: string | undefined;
        readonly status?: string | undefined;
        readonly trade?: string | undefined;
      }
    | undefined
) {
  return {
    component: optionalText(filters?.component),
    endDate: optionalText(filters?.endDate),
    kind: recordKind(filters?.kind),
    objectName: optionalText(filters?.objectName),
    responsibleParty: optionalText(filters?.responsibleParty),
    search: optionalText(filters?.search)?.toLowerCase(),
    severity: recordSeverity(filters?.severity),
    sourceProtocol: optionalText(filters?.sourceProtocol)?.toLowerCase(),
    startDate: optionalText(filters?.startDate),
    status: recordStatus(filters?.status),
    trade: optionalText(filters?.trade),
  };
}

interface FilterableRecord {
  readonly body: string;
  readonly component?: string | undefined;
  readonly kind: string;
  readonly objectName?: string | undefined;
  readonly recordNumber: string;
  readonly responsibleParty?: string | undefined;
  readonly severity?: string | undefined;
  readonly sourceProtocolTitle: string;
  readonly status: string;
  readonly title: string;
  readonly trade?: string | undefined;
}

/** Applies post-index filters that are not all part of the selected index. */
export function matchesRecordFilters(
  record: FilterableRecord,
  filters: NormalizedRecordFilters
) {
  if (!matchesRecordEnums(record, filters)) {
    return false;
  }

  if (!matchesRecordTextFilters(record, filters)) {
    return false;
  }

  return matchesRecordSearch(record, filters.search);
}

/** Keeps record-kind filters inside the canonical protocol taxonomy. */
function recordKind(value: string | undefined): RecordKind | undefined {
  switch (optionalText(value)) {
    case "agenda":
      return "agenda";
    case "discussion":
      return "discussion";
    case "change":
      return "change";
    case "task":
      return "task";
    case "information":
      return "information";
    case "concern":
      return "concern";
    case "obstruction":
      return "obstruction";
    case "decision":
      return "decision";
    case "risk":
      return "risk";
    case "question":
      return "question";
    default:
      return;
  }
}

/** Keeps record-status filters inside the canonical workflow statuses. */
function recordStatus(value: string | undefined): RecordStatus | undefined {
  switch (optionalText(value)) {
    case "open":
      return "open";
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "blocked";
    case "resolved":
      return "resolved";
    case "recorded":
      return "recorded";
    default:
      return;
  }
}

/** Keeps severity filters inside the canonical risk scale. */
function recordSeverity(value: string | undefined): RecordSeverity | undefined {
  switch (optionalText(value)) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    default:
      return;
  }
}

/** Checks exact record fields already normalized to canonical literals. */
function matchesRecordEnums(
  record: FilterableRecord,
  filters: NormalizedRecordFilters
) {
  if (filters.kind && record.kind !== filters.kind) {
    return false;
  }

  if (filters.status && record.status !== filters.status) {
    return false;
  }

  if (filters.severity && record.severity !== filters.severity) {
    return false;
  }

  return true;
}

/** Checks optional text filters that are not always covered by one index. */
function matchesRecordTextFilters(
  record: FilterableRecord,
  filters: NormalizedRecordFilters
) {
  if (filters.component && !includesText(record.component, filters.component)) {
    return false;
  }

  if (
    filters.objectName &&
    !includesText(record.objectName, filters.objectName)
  ) {
    return false;
  }

  if (filters.trade && !includesText(record.trade, filters.trade)) {
    return false;
  }

  if (
    filters.responsibleParty &&
    !includesText(record.responsibleParty, filters.responsibleParty)
  ) {
    return false;
  }

  if (
    filters.sourceProtocol &&
    !record.sourceProtocolTitle.toLowerCase().includes(filters.sourceProtocol)
  ) {
    return false;
  }

  return true;
}

/** Searches the user-facing fields shown in the project ledger. */
function matchesRecordSearch(
  record: FilterableRecord,
  search: string | undefined
) {
  if (!search) {
    return true;
  }

  return [
    record.recordNumber,
    record.title,
    record.body,
    record.sourceProtocolTitle,
    record.component ?? "",
    record.objectName ?? "",
    record.trade ?? "",
    record.responsibleParty ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

/** Checks optional text fields against normalized search input. */
function includesText(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}
