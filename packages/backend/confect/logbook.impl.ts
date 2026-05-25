import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { ProjectRecordNotFound } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Lists logbook events for one accessible project with Convex pagination. */
const listByProject = FunctionImpl.make(
  api,
  "logbook",
  "listByProject",
  ({ projectId, paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("logbookEvents")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .paginate(paginationOpts);
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

        if (kind === "bauteil") {
          return yield* reader
            .table("logbookEvents")
            .index(
              "by_projectId_and_bauteil",
              (q) => q.eq("projectId", projectId).eq("bauteil", value),
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
