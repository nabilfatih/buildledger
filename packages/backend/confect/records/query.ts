import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import type { GenericId } from "convex/values";
import { Effect } from "effect";

import type {
  NormalizedRecordFilters,
  RecordKind,
  RecordStatus,
} from "./filters";
import {
  readByDate,
  readByProject,
  readBySeverity,
  readByTrade,
} from "./range";

type ProjectId = GenericId<"projects">;

export interface PaginationOpts {
  readonly cursor: string | null;
  readonly endCursor?: string | null | undefined;
  readonly id?: number | undefined;
  readonly maximumBytesRead?: number | undefined;
  readonly maximumRowsRead?: number | undefined;
  readonly numItems: number;
}

export interface RecordPageInput {
  readonly filters: NormalizedRecordFilters;
  readonly paginationOpts: PaginationOpts;
  readonly projectId: ProjectId;
}

/** Chooses the narrowest index available for the current record filters. */
export const readProjectRecordsPage = Effect.fn(
  "records.readProjectRecordsPage"
)(function* (input: RecordPageInput) {
  const { filters } = input;

  if (filters.search) {
    return yield* readBySearch(input, filters.search);
  }

  if (filters.responsibleParty && filters.status) {
    return yield* readByResponsibleStatus(
      input,
      filters.responsibleParty,
      filters.status
    );
  }

  if (filters.responsibleParty) {
    return yield* readByResponsible(input, filters.responsibleParty);
  }

  if (filters.status) {
    return yield* readByStatus(input, filters.status);
  }

  if (filters.kind) {
    return yield* readByKind(input, filters.kind);
  }

  if (filters.severity) {
    return yield* readBySeverity(input, filters.severity);
  }

  if (filters.trade) {
    return yield* readByTrade(input, filters.trade);
  }

  if (filters.startDate || filters.endDate) {
    return yield* readByDate(input);
  }

  return yield* readByProject(input);
});

/** Reads records by full-text search scoped to one project. */
const readBySearch = Effect.fn("records.readBySearch")(function* (
  input: RecordPageInput,
  search: string
) {
  const { paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .search("by_projectId_and_searchText", (q) =>
      q.search("searchText", search).eq("projectId", projectId)
    )
    .paginate(paginationOpts);
});

/** Reads records by responsible party and status with date-bounded pagination. */
const readByResponsibleStatus = Effect.fn("records.readByResponsibleStatus")(
  function* (
    input: RecordPageInput,
    responsibleParty: string,
    status: RecordStatus
  ) {
    const { filters, paginationOpts, projectId } = input;
    const reader = yield* DatabaseReader;

    return yield* reader
      .table("projectRecords")
      .index(
        "by_projectId_and_responsibleParty_and_status_and_sourceProtocolDate",
        (q) => {
          const query = q
            .eq("projectId", projectId)
            .eq("responsibleParty", responsibleParty)
            .eq("status", status);

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
  }
);

/** Reads records by responsible party with date-bounded pagination. */
const readByResponsible = Effect.fn("records.readByResponsible")(function* (
  input: RecordPageInput,
  responsibleParty: string
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_responsibleParty_and_sourceProtocolDate",
      (q) => {
        const query = q
          .eq("projectId", projectId)
          .eq("responsibleParty", responsibleParty);

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

/** Reads records by status with date-bounded pagination. */
const readByStatus = Effect.fn("records.readByStatus")(function* (
  input: RecordPageInput,
  status: RecordStatus
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_status_and_sourceProtocolDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("status", status);

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

/** Reads records by protocol item kind with date-bounded pagination. */
const readByKind = Effect.fn("records.readByKind")(function* (
  input: RecordPageInput,
  kind: RecordKind
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("projectRecords")
    .index(
      "by_projectId_and_kind_and_sourceProtocolDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("kind", kind);

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
