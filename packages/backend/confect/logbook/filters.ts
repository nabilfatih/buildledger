import type { GenericId } from "convex/values";

export type LogbookEventType =
  | "protocol_published"
  | "record_created"
  | "status_changed"
  | "assignment_changed"
  | "risk_detected";
export type NormalizedLogbookFilters = ReturnType<
  typeof normalizeLogbookFilters
>;

/** Normalizes list filters before selecting a logbook index. */
export function normalizeLogbookFilters(
  filters:
    | {
        readonly component?: string | undefined;
        readonly endDate?: string | undefined;
        readonly eventType?: string | undefined;
        readonly objectName?: string | undefined;
        readonly protocolId?: GenericId<"protocols"> | undefined;
        readonly recordType?: string | undefined;
        readonly responsibleParty?: string | undefined;
        readonly search?: string | undefined;
        readonly startDate?: string | undefined;
        readonly trade?: string | undefined;
      }
    | undefined
) {
  return {
    component: optionalText(filters?.component),
    endDate: optionalText(filters?.endDate),
    eventType: logbookEventType(filters?.eventType),
    objectName: optionalText(filters?.objectName),
    protocolId: filters?.protocolId,
    recordType: optionalText(filters?.recordType),
    responsibleParty: optionalText(filters?.responsibleParty),
    search: optionalText(filters?.search)?.toLowerCase(),
    startDate: optionalText(filters?.startDate),
    trade: optionalText(filters?.trade),
  };
}

interface FilterableLogbookEvent {
  readonly body: string;
  readonly chronologyDate: string;
  readonly component?: string | undefined;
  readonly eventType: string;
  readonly objectName?: string | undefined;
  readonly protocolId: GenericId<"protocols">;
  readonly responsibleParty?: string | undefined;
  readonly title: string;
  readonly trade?: string | undefined;
}

/** Applies filters that were not fully covered by the chosen logbook index. */
export function matchesLogbookFilters(
  event: FilterableLogbookEvent,
  filters: NormalizedLogbookFilters
) {
  if (!matchesLogbookEnums(event, filters)) {
    return false;
  }

  if (!matchesLogbookTextFilters(event, filters)) {
    return false;
  }

  if (!matchesLogbookDateRange(event, filters)) {
    return false;
  }

  return matchesLogbookSearch(event, filters.search);
}

/** Keeps logbook event filters inside canonical event names. */
function logbookEventType(
  value: string | undefined
): LogbookEventType | undefined {
  switch (optionalText(value)) {
    case "protocol_published":
      return "protocol_published";
    case "record_created":
      return "record_created";
    case "status_changed":
      return "status_changed";
    case "assignment_changed":
      return "assignment_changed";
    case "risk_detected":
      return "risk_detected";
    default:
      return;
  }
}

/** Checks exact logbook fields already normalized to canonical literals. */
function matchesLogbookEnums(
  event: FilterableLogbookEvent,
  filters: NormalizedLogbookFilters
) {
  if (filters.protocolId && event.protocolId !== filters.protocolId) {
    return false;
  }

  if (filters.eventType && event.eventType !== filters.eventType) {
    return false;
  }

  return true;
}

/** Checks text filters that are not always covered by one index. */
function matchesLogbookTextFilters(
  event: FilterableLogbookEvent,
  filters: NormalizedLogbookFilters
) {
  if (filters.component && !includesText(event.component, filters.component)) {
    return false;
  }

  if (
    filters.objectName &&
    !includesText(event.objectName, filters.objectName)
  ) {
    return false;
  }

  if (filters.trade && !includesText(event.trade, filters.trade)) {
    return false;
  }

  if (
    filters.responsibleParty &&
    !includesText(event.responsibleParty, filters.responsibleParty)
  ) {
    return false;
  }

  return true;
}

/** Checks the visible chronology range for timeline events. */
function matchesLogbookDateRange(
  event: FilterableLogbookEvent,
  filters: NormalizedLogbookFilters
) {
  if (filters.startDate && event.chronologyDate < filters.startDate) {
    return false;
  }

  if (filters.endDate && event.chronologyDate > filters.endDate) {
    return false;
  }

  return true;
}

/** Searches the user-facing fields shown in the logbook table. */
function matchesLogbookSearch(
  event: FilterableLogbookEvent,
  search: string | undefined
) {
  if (!search) {
    return true;
  }

  return [
    event.title,
    event.body,
    event.eventType.replaceAll("_", " "),
    event.component ?? "",
    event.objectName ?? "",
    event.trade ?? "",
    event.responsibleParty ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

/** Normalizes optional text filters. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}

/** Checks optional text fields against a normalized search term. */
function includesText(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}
