import { FunctionImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect } from "effect";

import { matchesRecordFilters, normalizeRecordFilters } from "./filters";
import { readProjectRecordsPage } from "./query";

/** Lists project records with indexed pagination and server-side filters. */
export const listByProject = FunctionImpl.make(
  api,
  "records",
  "listByProject",
  ({ filters, paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const recordFilters = normalizeRecordFilters(filters);
        const page = yield* readProjectRecordsPage({
          filters: recordFilters,
          paginationOpts,
          projectId,
        });

        return {
          ...page,
          page: page.page.flatMap((record) =>
            matchesRecordFilters(record, recordFilters) ? [record] : []
          ),
        };
      })
    )
);
