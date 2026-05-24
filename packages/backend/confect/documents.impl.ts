import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
  StorageWriter,
} from "@repo/backend/confect/_generated/services";
import { InternalFailure } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

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
  ({ projectId, protocolId, fileName, mimeType, storageId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        return yield* writer.table("sourceDocuments").insert({
          projectId,
          protocolId,
          fileName,
          mimeType,
          storageId,
          status: "uploaded",
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
                new InternalFailure({
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

/** Lists recent source documents for one accessible project. */
const listByProject = FunctionImpl.make(
  api,
  "documents",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("sourceDocuments")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
      })
    )
);

export const documents = GroupImpl.make(api, "documents").pipe(
  Layer.provide(createUploadUrl),
  Layer.provide(saveSourceDocument),
  Layer.provide(extractText),
  Layer.provide(listByProject)
);
