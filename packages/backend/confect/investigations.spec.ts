import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { ProjectInvestigation } from "@repo/ai/schemas";
import { AppError } from "@repo/backend/confect/errors";
import { Investigations } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const investigations = GroupSpec.make("investigations")
  .addFunction(
    FunctionSpec.publicAction({
      name: "run",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        question: Schema.String,
      }),
      returns: GenericId.GenericId("investigations"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "saveResult",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        question: Schema.String,
        investigation: ProjectInvestigation,
      }),
      returns: GenericId.GenericId("investigations"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(Investigations.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "get",
      args: Schema.Struct({
        investigationId: GenericId.GenericId("investigations"),
      }),
      returns: Investigations.Doc,
      error: AppError,
    })
  );
