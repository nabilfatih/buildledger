import { FunctionImpl } from "@confect/server";
import { MemoryChunkingService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
} from "@repo/backend/confect/_generated/services";
import {
  InvalidProtocolState,
  ProtocolNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Schema } from "effect";

import { maxProtocolItems, zeroEmbedding } from "./helpers";

const CitationPayload = Schema.parseJson(Schema.Array(Schema.Unknown));

/** Counts citations from the persisted protocol item citation payload. */
function countCitations(citationsJson: string) {
  return Effect.runSync(
    Schema.decodeUnknown(CitationPayload)(citationsJson).pipe(
      Effect.map((citations) => citations.length),
      Effect.catchAll(() => Effect.succeed(0))
    )
  );
}

/** Orchestrates protocol publishing across small Convex mutations. */
export const publish = FunctionImpl.make(
  api,
  "protocols",
  "publish",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const runMutation = yield* MutationRunner;

        yield* runMutation(refs.internal.protocols.writePublishRecords, {
          protocolId,
        });
        yield* runMutation(refs.internal.protocols.writePublishMemory, {
          protocolId,
        });

        return null;
      })
    )
);

/** Writes reviewed items into ledger records and logbook events once. */
export const writePublishRecords = FunctionImpl.make(
  api,
  "protocols",
  "writePublishRecords",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
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

        if (protocol.status === "published") {
          return null;
        }

        if (protocol.status !== "review") {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol must be in review before publishing.",
            })
          );
        }

        const items = yield* reader
          .table("protocolItems")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);

        const existingRecords = yield* reader
          .table("projectRecords")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);

        if (existingRecords.length === 0) {
          const timestamp = Date.now();
          yield* Effect.all(
            items.map((item, index) =>
              Effect.gen(function* () {
                const recordId = yield* writer.table("projectRecords").insert({
                  projectId: protocol.projectId,
                  protocolId,
                  protocolItemId: item._id,
                  recordNumber: `${protocol.protocolNumber}-${index + 1}`,
                  kind: item.kind,
                  title: item.title,
                  body: item.body,
                  component: item.component,
                  objectName: item.objectName,
                  trade: item.trade,
                  responsibleParty: item.responsibleParty,
                  dueDate: item.dueDate,
                  severity: item.severity,
                  status: item.status,
                  citationCount: countCitations(item.citationsJson),
                  sourceProtocolTitle: protocol.title,
                  sourceProtocolDate: protocol.protocolDate,
                  createdAt: timestamp,
                  updatedAt: timestamp,
                });

                yield* writer.table("logbookEvents").insert({
                  projectId: protocol.projectId,
                  protocolId,
                  recordId,
                  eventType:
                    item.kind === "risk" ? "risk_detected" : "record_created",
                  title: item.title,
                  body: item.body,
                  component: item.component,
                  objectName: item.objectName,
                  trade: item.trade,
                  responsibleParty: item.responsibleParty,
                  chronologyDate: protocol.protocolDate,
                  createdAt: timestamp,
                });
              })
            )
          );
        }

        return null;
      })
    )
);

/** Writes project memory chunks and marks the protocol as published once. */
export const writePublishMemory = FunctionImpl.make(
  api,
  "protocols",
  "writePublishMemory",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
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

        if (protocol.status === "published") {
          return null;
        }

        if (protocol.status !== "review") {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol must be in review before publishing.",
            })
          );
        }

        const items = yield* reader
          .table("protocolItems")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);

        const existingChunks = yield* reader
          .table("memoryChunks")
          .index("by_projectId_and_sourceId", (q) =>
            q.eq("projectId", protocol.projectId).eq("sourceId", protocolId)
          )
          .take(1);

        if (existingChunks.length === 0) {
          const chunks = yield* MemoryChunkingService.chunk({
            sourceTitle: protocol.title,
            chronologyDate: protocol.protocolDate,
            text: items
              .map((item) => `${item.title}\n${item.body}`)
              .join("\n\n"),
          }).pipe(Effect.provide(MemoryChunkingService.Default));

          yield* Effect.all(
            chunks.map((chunk) =>
              writer.table("memoryChunks").insert({
                projectId: protocol.projectId,
                sourceType: "protocol",
                sourceId: protocolId,
                text: chunk.text,
                chronologyDate: chunk.chronologyDate,
                embedding: zeroEmbedding,
                metadataJson: JSON.stringify({
                  sourceTitle: chunk.sourceTitle,
                }),
                createdAt: Date.now(),
              })
            )
          );
        }

        yield* writer.table("protocols").patch(protocolId, {
          status: "published",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);
