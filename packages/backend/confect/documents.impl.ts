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
import type { GenericId as ConvexId } from "convex/values";
import { Effect, Layer, Schema } from "effect";

const StorageId = GenericId.GenericId("_storage");
type DocumentStatus = "uploaded" | "extracted" | "failed" | "attached";

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

/** Lists recent source documents for one accessible project with filters. */
const listByProject = FunctionImpl.make(
  api,
  "documents",
  "listByProject",
  ({ filters, paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const documentFilters = normalizeDocumentFilters(filters);
        const page = yield* (() => {
          if (documentFilters.protocolId) {
            return reader
              .table("sourceDocuments")
              .index(
                "by_protocolId",
                (q) => q.eq("protocolId", documentFilters.protocolId),
                "desc"
              )
              .paginate(paginationOpts);
          }

          if (documentFilters.status && documentFilters.status !== "attached") {
            const status = documentFilters.status;
            return reader
              .table("sourceDocuments")
              .index(
                "by_projectId_and_status",
                (q) => q.eq("projectId", projectId).eq("status", status),
                "desc"
              )
              .paginate(paginationOpts);
          }

          return reader
            .table("sourceDocuments")
            .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
            .paginate(paginationOpts);
        })();

        return {
          ...page,
          page: page.page.flatMap((document) =>
            matchesDocumentFilters(document, documentFilters, projectId)
              ? [document]
              : []
          ),
        };
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

/** Normalizes document list filters before choosing an index. */
function normalizeDocumentFilters(
  filters:
    | {
        readonly protocolId?: ConvexId<"protocols"> | undefined;
        readonly search?: string | undefined;
        readonly status?: string | undefined;
      }
    | undefined
) {
  return {
    protocolId: filters?.protocolId,
    search: optionalText(filters?.search)?.toLowerCase(),
    status: documentStatus(filters?.status),
  };
}

/** Keeps document status filters inside supported source states. */
function documentStatus(value: string | undefined): DocumentStatus | undefined {
  switch (optionalText(value)) {
    case "uploaded":
      return "uploaded";
    case "extracted":
      return "extracted";
    case "failed":
      return "failed";
    case "attached":
      return "attached";
    default:
      return;
  }
}

/** Keeps document result pages server-filtered and safe for the client. */
function matchesDocumentFilters(
  document: {
    readonly fileName: string;
    readonly mimeType?: string | undefined;
    readonly projectId: ConvexId<"projects">;
    readonly protocolId?: ConvexId<"protocols"> | undefined;
    readonly status: string;
  },
  filters: ReturnType<typeof normalizeDocumentFilters>,
  projectId: ConvexId<"projects">
) {
  if (document.projectId !== projectId) {
    return false;
  }

  if (filters.protocolId && document.protocolId !== filters.protocolId) {
    return false;
  }

  if (filters.status === "attached" && !document.protocolId) {
    return false;
  }

  if (
    filters.status &&
    filters.status !== "attached" &&
    document.status !== filters.status
  ) {
    return false;
  }

  if (!filters.search) {
    return true;
  }

  return `${document.fileName} ${document.mimeType ?? ""} ${document.status}`
    .toLowerCase()
    .includes(filters.search);
}

/** Normalizes optional text filters. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}
