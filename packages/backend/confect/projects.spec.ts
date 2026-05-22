import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Projects } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const projects = GroupSpec.make("projects")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listForCurrentUser",
      args: Schema.Struct({}),
      returns: Schema.Array(Projects.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "create",
      args: Schema.Struct({
        organizationName: Schema.String,
        name: Schema.String,
        code: Schema.String,
        description: Schema.optional(Schema.String),
      }),
      returns: GenericId.GenericId("projects"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "get",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Projects.Doc,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "archive",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Null,
      error: AppError,
    })
  );
