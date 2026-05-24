import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { SourceDocuments } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

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
        storageId: GenericId.GenericId("_storage"),
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
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(SourceDocuments.Doc),
      error: AppError,
    })
  );
