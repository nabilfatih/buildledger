import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

import { AppError } from "./errors";
import { Reports } from "./tables/core";

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
