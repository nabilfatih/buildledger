import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { SourceDocuments } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const DocumentsPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(SourceDocuments.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

const DocumentFilters = Schema.Struct({
  protocolId: Schema.optional(GenericId.GenericId("protocols")),
  search: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
});

export const documents = GroupSpec.make("documents")
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createUploadUrl",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.String,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "saveSourceDocument",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        protocolId: Schema.optional(GenericId.GenericId("protocols")),
        fileName: Schema.String,
        mimeType: Schema.optional(Schema.String),
        storageId: Schema.optional(Schema.String),
        extractedText: Schema.optional(Schema.String),
      }),
      returns: GenericId.GenericId("sourceDocuments"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "extractText",
      args: Schema.Struct({
        documentId: GenericId.GenericId("sourceDocuments"),
        extractedText: Schema.String,
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "attachToProtocol",
      args: Schema.Struct({
        documentId: GenericId.GenericId("sourceDocuments"),
        protocolId: GenericId.GenericId("protocols"),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
        filters: Schema.optional(DocumentFilters),
      }),
      returns: DocumentsPage,
      error: AppError,
    })
  );
