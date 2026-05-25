import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { ProjectTaxonomy } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const taxonomy = GroupSpec.make("taxonomy")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(ProjectTaxonomy.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "upsert",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        kind: Schema.Literal("bauteil", "object", "trade"),
        label: Schema.String,
      }),
      returns: GenericId.GenericId("projectTaxonomy"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "archive",
      args: Schema.Struct({
        taxonomyId: GenericId.GenericId("projectTaxonomy"),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  );
