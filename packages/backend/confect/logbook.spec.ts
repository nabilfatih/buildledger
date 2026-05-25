import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { LogbookEvents } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const LogbookPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(LogbookEvents.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

export const logbook = GroupSpec.make("logbook")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
      }),
      returns: LogbookPage,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByRecord",
      args: Schema.Struct({
        recordId: GenericId.GenericId("projectRecords"),
        paginationOpts: PaginationOpts,
      }),
      returns: LogbookPage,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByTaxonomy",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        kind: Schema.Literal("component", "object", "trade"),
        value: Schema.String,
        paginationOpts: PaginationOpts,
      }),
      returns: LogbookPage,
      error: AppError,
    })
  );
