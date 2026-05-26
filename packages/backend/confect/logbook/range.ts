import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { Effect } from "effect";

import type { LogbookPageInput } from "./query";

/** Reads logbook events by trade and chronology range. */
export const readByTrade = Effect.fn("logbook.readByTrade")(function* (
  input: LogbookPageInput,
  trade: string
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_trade_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId).eq("trade", trade);

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

/** Reads logbook events by responsible party and chronology range. */
export const readByResponsible = Effect.fn("logbook.readByResponsible")(
  function* (input: LogbookPageInput, responsibleParty: string) {
    const { filters, paginationOpts, projectId } = input;
    const reader = yield* DatabaseReader;

    return yield* reader
      .table("logbookEvents")
      .index(
        "by_projectId_and_responsibleParty_and_chronologyDate",
        (q) => {
          const query = q
            .eq("projectId", projectId)
            .eq("responsibleParty", responsibleParty);

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
  }
);

/** Reads logbook events by project chronology range. */
export const readByDate = Effect.fn("logbook.readByDate")(function* (
  input: LogbookPageInput
) {
  const { filters, paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index(
      "by_projectId_and_chronologyDate",
      (q) => {
        const query = q.eq("projectId", projectId);

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

/** Reads the default project logbook page. */
export const readByProject = Effect.fn("logbook.readByProject")(function* (
  input: LogbookPageInput
) {
  const { paginationOpts, projectId } = input;
  const reader = yield* DatabaseReader;

  return yield* reader
    .table("logbookEvents")
    .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
    .paginate(paginationOpts);
});
