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
import { searchText } from "@repo/backend/confect/search";
import { Effect, Layer } from "effect";

import { listByProject } from "./records/list";
import { optionalText } from "./records/text";

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
          searchText: searchText([
            record.recordNumber,
            record.kind,
            record.title,
            record.body,
            record.component,
            record.objectName,
            record.trade,
            record.responsibleParty,
            record.dueDate,
            record.severity,
            status,
            record.sourceProtocolTitle,
            record.sourceProtocolDate,
          ]),
          updatedAt: timestamp,
        });
        yield* writer.table("logbookEvents").insert({
          projectId: record.projectId,
          protocolId: record.protocolId,
          recordId,
          eventType: "status_changed",
          title: record.title,
          body: `Status changed to ${status}.`,
          component: record.component,
          objectName: record.objectName,
          trade: record.trade,
          responsibleParty: record.responsibleParty,
          chronologyDate: record.sourceProtocolDate,
          searchText: searchText([
            "status changed",
            record.title,
            `Status changed to ${status}.`,
            record.component,
            record.objectName,
            record.trade,
            record.responsibleParty,
            record.sourceProtocolTitle,
            record.sourceProtocolDate,
          ]),
          createdAt: timestamp,
        });

        return null;
      })
    )
);

/** Assigns ownership and due date metadata to a project record. */
const assign = FunctionImpl.make(
  api,
  "records",
  "assign",
  ({ recordId, responsibleParty, dueDate }) =>
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
        const nextResponsible = optionalText(responsibleParty);
        const nextDueDate = optionalText(dueDate);

        yield* writer.table("projectRecords").patch(recordId, {
          responsibleParty: nextResponsible,
          dueDate: nextDueDate,
          searchText: searchText([
            record.recordNumber,
            record.kind,
            record.title,
            record.body,
            record.component,
            record.objectName,
            record.trade,
            nextResponsible,
            nextDueDate,
            record.severity,
            record.status,
            record.sourceProtocolTitle,
            record.sourceProtocolDate,
          ]),
          updatedAt: timestamp,
        });
        yield* writer.table("logbookEvents").insert({
          projectId: record.projectId,
          protocolId: record.protocolId,
          recordId,
          eventType: "assignment_changed",
          title: record.title,
          body: "Responsible party or due date changed.",
          component: record.component,
          objectName: record.objectName,
          trade: record.trade,
          responsibleParty: nextResponsible,
          chronologyDate: record.sourceProtocolDate,
          searchText: searchText([
            "assignment changed",
            record.title,
            "Responsible party or due date changed.",
            record.component,
            record.objectName,
            record.trade,
            nextResponsible,
            record.sourceProtocolTitle,
            record.sourceProtocolDate,
          ]),
          createdAt: timestamp,
        });

        return null;
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
  Layer.provide(assign),
  Layer.provide(getByProtocol)
);
