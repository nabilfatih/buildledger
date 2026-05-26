import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { MemoryChunk, ProjectReport } from "@repo/ai/schemas";
import { AppError } from "@repo/backend/confect/errors";
import { Reports } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const ReportsPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(Reports.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

const ReportFilters = Schema.Struct({
  search: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
});

export const reports = GroupSpec.make("reports")
  .addFunction(
    FunctionSpec.publicAction({
      name: "generate",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        periodEnd: Schema.String,
        periodStart: Schema.String,
      }),
      returns: GenericId.GenericId("reports"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
        filters: Schema.optional(ReportFilters),
      }),
      returns: ReportsPage,
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
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "publish",
      args: Schema.Struct({
        reportId: GenericId.GenericId("reports"),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  );
