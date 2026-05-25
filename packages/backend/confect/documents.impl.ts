import { GenericId } from "@confect/core";
import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
  StorageWriter,
} from "@repo/backend/confect/_generated/services";
import {
  InvalidDocumentUpload,
  ProtocolNotFound,
  SourceDocumentNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer, Schema } from "effect";

const StorageId = GenericId.GenericId("_storage");

/** Creates a Convex upload URL for one accessible project. */
const createUploadUrl = FunctionImpl.make(
  api,
  "documents",
  "createUploadUrl",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const storage = yield* StorageWriter;
        const url = yield* storage.generateUploadUrl();
        return url.toString();
      })
    )
);

/** Registers an uploaded source document after project access is verified. */
const saveSourceDocument = FunctionImpl.make(
  api,
  "documents",
  "saveSourceDocument",
  ({ projectId, protocolId, fileName, mimeType, storageId, extractedText }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        if (protocolId) {
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

          if (protocol.projectId !== projectId) {
            return yield* Effect.fail(
              new ProtocolNotFound({
                protocolId,
                message: "Protocol does not belong to this project.",
              })
            );
          }
        }

        const parsedStorageId = yield* storageId
          ? Schema.decodeUnknown(StorageId)(storageId).pipe(
              Effect.mapError(
                () =>
                  new InvalidDocumentUpload({
                    message: "Uploaded storage id was not valid.",
                  })
              )
            )
          : Effect.succeed(undefined);
        const trimmedText = extractedText?.trim();
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        return yield* writer.table("sourceDocuments").insert({
          projectId,
          protocolId,
          fileName,
          mimeType,
          storageId: parsedStorageId,
          extractedText: trimmedText || undefined,
          status: trimmedText ? "extracted" : "uploaded",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      })
    )
);

/** Saves extracted text for a registered document. */
const extractText = FunctionImpl.make(
  api,
  "documents",
  "extractText",
  ({ documentId, extractedText }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const document = yield* reader
          .table("sourceDocuments")
          .get(documentId)
          .pipe(
            Effect.mapError(
              () =>
                new SourceDocumentNotFound({
                  documentId,
                  message: "Source document not found.",
                })
            )
          );

        yield* ensureProjectAccess(document.projectId);

        const writer = yield* DatabaseWriter;
        yield* writer.table("sourceDocuments").patch(documentId, {
          extractedText: extractedText.trim(),
          status: "extracted",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

/** Links an uploaded source document to a protocol in the same project. */
const attachToProtocol = FunctionImpl.make(
  api,
  "documents",
  "attachToProtocol",
  ({ documentId, protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const document = yield* reader
          .table("sourceDocuments")
          .get(documentId)
          .pipe(
            Effect.mapError(
              () =>
                new SourceDocumentNotFound({
                  documentId,
                  message: "Source document not found.",
                })
            )
          );
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

        yield* ensureProjectAccess(document.projectId);

        if (protocol.projectId !== document.projectId) {
          return yield* Effect.fail(
            new SourceDocumentNotFound({
              documentId,
              message: "Source document does not belong to this protocol.",
            })
          );
        }

        const writer = yield* DatabaseWriter;
        yield* writer.table("sourceDocuments").patch(documentId, {
          protocolId,
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

/** Lists recent source documents for one accessible project. */
const listByProject = FunctionImpl.make(
  api,
  "documents",
  "listByProject",
  ({ projectId, paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("sourceDocuments")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .paginate(paginationOpts);
      })
    )
);

export const documents = GroupImpl.make(api, "documents").pipe(
  Layer.provide(createUploadUrl),
  Layer.provide(saveSourceDocument),
  Layer.provide(extractText),
  Layer.provide(attachToProtocol),
  Layer.provide(listByProject)
);
