import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import type { GenericId } from "convex/values";
import { Effect } from "effect";

import type { LogbookEventType, NormalizedLogbookFilters } from "./filters";
import {
  readByDate,
  readByProject,
  readByResponsible,
  readByTrade,
} from "./range";

type ProjectId = GenericId<"projects">;
type ProtocolId = GenericId<"protocols">;

export interface PaginationOpts {
  readonly cursor: string | null;
  readonly endCursor?: string | null | undefined;
  readonly id?: number | undefined;
  readonly maximumBytesRead?: number | undefined;
  readonly maximumRowsRead?: number | undefined;
  readonly numItems: number;
}

export interface LogbookPageInput {
  readonly filters: NormalizedLogbookFilters;
  readonly paginationOpts: PaginationOpts;
  readonly projectId: ProjectId;
}

/** Chooses the narrowest index available for a logbook list page. */
export const readLogbookPage = Effect.fn("logbook.readLogbookPage")(function* (
  input: LogbookPageInput
) {
  const { filters } = input;

  if (filters.search) {
    return yield* readBySearch(input, filters.search);
  }

  if (filters.protocolId) {
    return yield* readByProtocol(input, filters.protocolId);
  }

  if (filters.eventType) {
    return yield* readByEventType(input, filters.eventType);
  }

  if (filters.component) {
    return yield* readByComponent(input, filters.component);
  }

  if (filters.objectName) {
    return yield* readByObject(input, filters.objectName);
  }

  if (filters.trade) {
    return yield* readByTrade(input, filters.trade);
  }

  if (filters.responsibleParty) {
    return yield* readByResponsible(input, filters.responsibleParty);
  }

  if (filters.startDate || filters.endDate) {
    return yield* readByDate(input);
  }

  return yield* readByProject(input);
});

/** Reads logbook events by full-text search scoped to one project. */
const readBySearch = Effect.fn("logbook.readBySearch")(function* (
  input: LogbookPageInput,
  search: string
) {
  const { paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .search("by_projectId_and_searchText", (q) =>
      q.search("searchText", search).eq("projectId", projectId)
    )
    .paginate(paginationOpts);
});

/** Reads logbook events by source protocol and chronology range. */
const readByProtocol = Effect.fn("logbook.readByProtocol")(function* (
  input: LogbookPageInput,
  protocolId: ProtocolId
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_protocolId_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("protocolId", protocolId);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("chronologyDate", filters.startDate)
            .lte("chronologyDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("chronologyDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("chronologyDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads logbook events by event type and chronology range. */
const readByEventType = Effect.fn("logbook.readByEventType")(function* (
  input: LogbookPageInput,
  eventType: LogbookEventType
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_eventType_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("eventType", eventType);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("chronologyDate", filters.startDate)
            .lte("chronologyDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("chronologyDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("chronologyDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads logbook events by component and chronology range. */
const readByComponent = Effect.fn("logbook.readByComponent")(function* (
  input: LogbookPageInput,
  component: string
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_component_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("component", component);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("chronologyDate", filters.startDate)
            .lte("chronologyDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("chronologyDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("chronologyDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});

/** Reads logbook events by object and chronology range. */
const readByObject = Effect.fn("logbook.readByObject")(function* (
  input: LogbookPageInput,
  objectName: string
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_objectName_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("objectName", objectName);

        if (filters.startDate && filters.endDate) {
          return query
            .gte("chronologyDate", filters.startDate)
            .lte("chronologyDate", filters.endDate);
        }

        if (filters.startDate) {
          return query.gte("chronologyDate", filters.startDate);
        }

        if (filters.endDate) {
          return query.lte("chronologyDate", filters.endDate);
        }

        return query;
      },
      "desc"
    )
    .paginate(paginationOpts);
});
