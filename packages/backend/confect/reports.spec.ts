import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Reports } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const reports = GroupSpec.make("reports")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(Reports.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createWeeklyDraft",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        periodStart: Schema.String,
        periodEnd: Schema.String,
      }),
      returns: GenericId.GenericId("reports"),
      error: AppError,
    })
  );
