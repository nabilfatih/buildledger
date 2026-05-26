import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { ProjectRecordNotFound } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import type { GenericId } from "convex/values";
import { Effect, Layer } from "effect";

type LogbookEventType =
  | "protocol_published"
  | "record_created"
  | "status_changed"
  | "assignment_changed"
  | "risk_detected";

/** Lists logbook events for one accessible project with indexed filters. */
const listByProject = FunctionImpl.make(
  api,
  "logbook",
  "listByProject",
  ({ filters, paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const logbookFilters = normalizeLogbookFilters(filters);
        const page = yield* (() => {
          if (logbookFilters.protocolId) {
            const protocolId = logbookFilters.protocolId;
            return reader
              .table("logbookEvents")
              .index(
                "by_projectId_and_protocolId",
                (q) =>
                  q.eq("projectId", projectId).eq("protocolId", protocolId),
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (logbookFilters.eventType) {
            const eventType = logbookFilters.eventType;
            return reader
              .table("logbookEvents")
              .index(
                "by_projectId_and_eventType_and_chronologyDate",
                (q) => {
                  const query = q
                    .eq("projectId", projectId)
                    .eq("eventType", eventType);

                  if (logbookFilters.startDate && logbookFilters.endDate) {
                    return query
                      .gte("chronologyDate", logbookFilters.startDate)
                      .lte("chronologyDate", logbookFilters.endDate);
                  }

                  if (logbookFilters.startDate) {
                    return query.gte(
                      "chronologyDate",
                      logbookFilters.startDate
                    );
                  }

                  if (logbookFilters.endDate) {
                    return query.lte("chronologyDate", logbookFilters.endDate);
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (logbookFilters.trade) {
            const trade = logbookFilters.trade;
            return reader
              .table("logbookEvents")
              .index(
                "by_projectId_and_trade_and_chronologyDate",
                (q) => {
                  const query = q.eq("projectId", projectId).eq("trade", trade);

                  if (logbookFilters.startDate && logbookFilters.endDate) {
                    return query
                      .gte("chronologyDate", logbookFilters.startDate)
                      .lte("chronologyDate", logbookFilters.endDate);
                  }

                  if (logbookFilters.startDate) {
                    return query.gte(
                      "chronologyDate",
                      logbookFilters.startDate
                    );
                  }

                  if (logbookFilters.endDate) {
                    return query.lte("chronologyDate", logbookFilters.endDate);
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (logbookFilters.responsibleParty) {
            const responsibleParty = logbookFilters.responsibleParty;
            return reader
              .table("logbookEvents")
              .index(
                "by_projectId_and_responsibleParty",
                (q) =>
                  q
                    .eq("projectId", projectId)
                    .eq("responsibleParty", responsibleParty),
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (logbookFilters.startDate || logbookFilters.endDate) {
            return reader
              .table("logbookEvents")
              .index(
                "by_projectId_and_chronologyDate",
                (q) => {
                  const query = q.eq("projectId", projectId);

                  if (logbookFilters.startDate && logbookFilters.endDate) {
                    return query
                      .gte("chronologyDate", logbookFilters.startDate)
                      .lte("chronologyDate", logbookFilters.endDate);
                  }

                  if (logbookFilters.startDate) {
                    return query.gte(
                      "chronologyDate",
                      logbookFilters.startDate
                    );
                  }

                  if (logbookFilters.endDate) {
                    return query.lte("chronologyDate", logbookFilters.endDate);
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          return reader
            .table("logbookEvents")
            .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
            .paginate(paginationOpts);
        })();

        return {
          ...page,
          page: page.page.flatMap((event) =>
            matchesLogbookFilters(event, logbookFilters) ? [event] : []
          ),
        };
      })
    )
);

/** Lists logbook events for one record after verifying access through the record. */
const listByRecord = FunctionImpl.make(
  api,
  "logbook",
  "listByRecord",
  ({ recordId, paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const record = yield* reader
          .table("projectRecords")
          .get(recordId)
          .pipe(
            Effect.mapError(
              () =>
                new ProjectRecordNotFound({
                  recordId,
                  message: "Project record not found.",
                })
            )
          );

        yield* ensureProjectAccess(record.projectId);

        return yield* reader
          .table("logbookEvents")
          .index("by_recordId", (q) => q.eq("recordId", recordId), "desc")
          .paginate(paginationOpts);
      })
    )
);

/** Lists project logbook events for one taxonomy value using explicit indexes. */
const listByTaxonomy = FunctionImpl.make(
  api,
  "logbook",
  "listByTaxonomy",
  ({ projectId, kind, value, paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        if (kind === "component") {
          return yield* reader
            .table("logbookEvents")
            .index(
              "by_projectId_and_component",
              (q) => q.eq("projectId", projectId).eq("component", value),
              "desc"
            )
            .paginate(paginationOpts);
        }

        if (kind === "object") {
          return yield* reader
            .table("logbookEvents")
            .index(
              "by_projectId_and_objectName",
              (q) => q.eq("projectId", projectId).eq("objectName", value),
              "desc"
            )
            .paginate(paginationOpts);
        }

        return yield* reader
          .table("logbookEvents")
          .index(
            "by_projectId_and_trade",
            (q) => q.eq("projectId", projectId).eq("trade", value),
            "desc"
          )
          .paginate(paginationOpts);
      })
    )
);

export const logbook = GroupImpl.make(api, "logbook").pipe(
  Layer.provide(listByProject),
  Layer.provide(listByRecord),
  Layer.provide(listByTaxonomy)
);

/** Normalizes list filters before selecting a logbook index. */
function normalizeLogbookFilters(
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
function matchesLogbookFilters(
  event: FilterableLogbookEvent,
  filters: ReturnType<typeof normalizeLogbookFilters>
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

/** Checks exact logbook fields already normalized to canonical literals. */
function matchesLogbookEnums(
  event: FilterableLogbookEvent,
  filters: ReturnType<typeof normalizeLogbookFilters>
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
  filters: ReturnType<typeof normalizeLogbookFilters>
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
  filters: ReturnType<typeof normalizeLogbookFilters>
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
