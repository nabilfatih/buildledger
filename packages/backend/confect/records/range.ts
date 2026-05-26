import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { Effect } from "effect";

import type { RecordSeverity } from "./filters";
import type { RecordPageInput } from "./query";

/** Reads records by severity with date-bounded pagination. */
export const readBySeverity = Effect.fn("records.readBySeverity")(function* (
  input: RecordPageInput,
  severity: RecordSeverity
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_severity_and_sourceProtocolDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("severity", severity);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("sourceProtocolDate", filters.startDate)
            .lte("sourceProtocolDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("sourceProtocolDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("sourceProtocolDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads records by trade with date-bounded pagination. */
export const readByTrade = Effect.fn("records.readByTrade")(function* (
  input: RecordPageInput,
  trade: string
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_trade_and_sourceProtocolDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("trade", trade);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("sourceProtocolDate", filters.startDate)
            .lte("sourceProtocolDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("sourceProtocolDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("sourceProtocolDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads records by project with a source protocol date range. */
export const readByDate = Effect.fn("records.readByDate")(function* (
  input: RecordPageInput
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_sourceProtocolDate",
      (q) => {
        const query = q.eq("projectId", projectId);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("sourceProtocolDate", filters.startDate)
            .lte("sourceProtocolDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("sourceProtocolDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("sourceProtocolDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads the default project ledger page. */
export const readByProject = Effect.fn("records.readByProject")(function* (
  input: RecordPageInput
) {
  const { paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
    .paginate(paginationOpts);
});
