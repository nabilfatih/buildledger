import { FunctionImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect } from "effect";

import { optionalText } from "./text";

type RecordKind =
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
type RecordStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "recorded";
type RecordSeverity = "low" | "medium" | "high";

/** Lists project records with indexed pagination and server-side filters. */
export const listByProject = FunctionImpl.make(
  api,
  "records",
  "listByProject",
  ({ filters, paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const recordFilters = normalizeRecordFilters(filters);
        const page = yield* (() => {
          if (recordFilters.responsibleParty && recordFilters.status) {
            const responsibleParty = recordFilters.responsibleParty;
            const status = recordFilters.status;
            return reader
              .table("projectRecords")
              .index(
                "by_projectId_and_responsible_status_date",
                (q) => {
                  const query = q
                    .eq("projectId", projectId)
                    .eq("responsibleParty", responsibleParty)
                    .eq("status", status);

                  if (recordFilters.startDate && recordFilters.endDate) {
                    return query
                      .gte("sourceProtocolDate", recordFilters.startDate)
                      .lte("sourceProtocolDate", recordFilters.endDate);
                  }

                  if (recordFilters.startDate) {
                    return query.gte(
                      "sourceProtocolDate",
                      recordFilters.startDate
                    );
                  }

                  if (recordFilters.endDate) {
                    return query.lte(
                      "sourceProtocolDate",
                      recordFilters.endDate
                    );
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (recordFilters.status) {
            const status = recordFilters.status;
            return reader
              .table("projectRecords")
              .index(
                "by_projectId_and_status_and_sourceProtocolDate",
                (q) => {
                  const query = q
                    .eq("projectId", projectId)
                    .eq("status", status);

                  if (recordFilters.startDate && recordFilters.endDate) {
                    return query
                      .gte("sourceProtocolDate", recordFilters.startDate)
                      .lte("sourceProtocolDate", recordFilters.endDate);
                  }

                  if (recordFilters.startDate) {
                    return query.gte(
                      "sourceProtocolDate",
                      recordFilters.startDate
                    );
                  }

                  if (recordFilters.endDate) {
                    return query.lte(
                      "sourceProtocolDate",
                      recordFilters.endDate
                    );
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (recordFilters.kind) {
            const kind = recordFilters.kind;
            return reader
              .table("projectRecords")
              .index(
                "by_projectId_and_kind_and_sourceProtocolDate",
                (q) => {
                  const query = q.eq("projectId", projectId).eq("kind", kind);

                  if (recordFilters.startDate && recordFilters.endDate) {
                    return query
                      .gte("sourceProtocolDate", recordFilters.startDate)
                      .lte("sourceProtocolDate", recordFilters.endDate);
                  }

                  if (recordFilters.startDate) {
                    return query.gte(
                      "sourceProtocolDate",
                      recordFilters.startDate
                    );
                  }

                  if (recordFilters.endDate) {
                    return query.lte(
                      "sourceProtocolDate",
                      recordFilters.endDate
                    );
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (recordFilters.trade) {
            const trade = recordFilters.trade;
            return reader
              .table("projectRecords")
              .index(
                "by_projectId_and_trade_and_sourceProtocolDate",
                (q) => {
                  const query = q.eq("projectId", projectId).eq("trade", trade);

                  if (recordFilters.startDate && recordFilters.endDate) {
                    return query
                      .gte("sourceProtocolDate", recordFilters.startDate)
                      .lte("sourceProtocolDate", recordFilters.endDate);
                  }

                  if (recordFilters.startDate) {
                    return query.gte(
                      "sourceProtocolDate",
                      recordFilters.startDate
                    );
                  }

                  if (recordFilters.endDate) {
                    return query.lte(
                      "sourceProtocolDate",
                      recordFilters.endDate
                    );
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (recordFilters.startDate || recordFilters.endDate) {
            return reader
              .table("projectRecords")
              .index(
                "by_projectId_and_sourceProtocolDate",
                (q) => {
                  const query = q.eq("projectId", projectId);

                  if (recordFilters.startDate && recordFilters.endDate) {
                    return query
                      .gte("sourceProtocolDate", recordFilters.startDate)
                      .lte("sourceProtocolDate", recordFilters.endDate);
                  }

                  if (recordFilters.startDate) {
                    return query.gte(
                      "sourceProtocolDate",
                      recordFilters.startDate
                    );
                  }

                  if (recordFilters.endDate) {
                    return query.lte(
                      "sourceProtocolDate",
                      recordFilters.endDate
                    );
                  }

                  return query;
                },
                "desc"
              )
              .paginate(paginationOpts);
          }

          return reader
            .table("projectRecords")
            .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
            .paginate(paginationOpts);
        })();

        return {
          ...page,
          page: page.page.flatMap((record) =>
            matchesRecordFilters(record, recordFilters) ? [record] : []
          ),
        };
      })
    )
);

/** Normalizes record list filters before choosing an indexed read path. */
function normalizeRecordFilters(
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
function matchesRecordFilters(
  record: FilterableRecord,
  filters: ReturnType<typeof normalizeRecordFilters>
) {
  if (!matchesRecordEnums(record, filters)) {
    return false;
  }

  if (!matchesRecordTextFilters(record, filters)) {
    return false;
  }

  return matchesRecordSearch(record, filters.search);
}

/** Checks exact record fields already normalized to canonical literals. */
function matchesRecordEnums(
  record: FilterableRecord,
  filters: ReturnType<typeof normalizeRecordFilters>
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
  filters: ReturnType<typeof normalizeRecordFilters>
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
