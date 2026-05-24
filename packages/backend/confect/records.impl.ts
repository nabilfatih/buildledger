import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import {
  ProjectRecordNotFound,
  ProtocolNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Lists project records with Convex pagination on the primary project index. */
const listByProject = FunctionImpl.make(
  api,
  "records",
  "listByProject",
  ({ projectId, paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("projectRecords")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .paginate(paginationOpts);
      })
    )
);

/** Updates a record status and appends a traceable logbook event. */
const updateStatus = FunctionImpl.make(
  api,
  "records",
  "updateStatus",
  ({ recordId, status }) =>
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

        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        yield* writer.table("projectRecords").patch(recordId, {
          status,
          updatedAt: timestamp,
        });
        yield* writer.table("logbookEvents").insert({
          projectId: record.projectId,
          protocolId: record.protocolId,
          recordId,
          eventType: "status_changed",
          title: record.title,
          body: `Status changed to ${status}.`,
          bauteil: record.bauteil,
          objectName: record.objectName,
          discipline: record.discipline,
          responsibleParty: record.responsibleParty,
          chronologyDate: record.sourceProtocolDate,
          createdAt: timestamp,
        });

        return null;
      })
    )
);

/** Lists project logbook events with Convex pagination. */
const getTimeline = FunctionImpl.make(
  api,
  "records",
  "getTimeline",
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

/** Lists all records derived from one protocol after checking project access. */
const getByProtocol = FunctionImpl.make(
  api,
  "records",
  "getByProtocol",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const protocol = yield* reader
          .table("protocols")
          .get(protocolId)
          .pipe(
            Effect.mapError(
              () =>
                new ProtocolNotFound({
                  protocolId,
                  message: "Protocol not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);

        return yield* reader
          .table("projectRecords")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(200);
      })
    )
);

export const records = GroupImpl.make(api, "records").pipe(
  Layer.provide(listByProject),
  Layer.provide(updateStatus),
  Layer.provide(getTimeline),
  Layer.provide(getByProtocol)
);
