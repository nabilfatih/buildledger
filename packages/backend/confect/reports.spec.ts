import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { MemoryChunk, ProjectReport } from "@repo/ai/schemas";
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
    FunctionSpec.internalQuery({
      name: "getWeeklyDraftInput",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        periodStart: Schema.String,
        periodEnd: Schema.String,
      }),
      returns: Schema.Struct({
        projectName: Schema.String,
        periodLabel: Schema.String,
        chunks: Schema.Array(MemoryChunk),
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "saveWeeklyDraft",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        periodStart: Schema.String,
        periodEnd: Schema.String,
        report: ProjectReport,
      }),
      returns: GenericId.GenericId("reports"),
      error: AppError,
    })
  );
