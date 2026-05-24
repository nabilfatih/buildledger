import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import {
  LogbookEvents,
  ProjectRecords,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const RecordsPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(ProjectRecords.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

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

export const records = GroupSpec.make("records")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
      }),
      returns: RecordsPage,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "updateStatus",
      args: Schema.Struct({
        recordId: GenericId.GenericId("projectRecords"),
        status: Schema.Literal(
          "open",
          "in_progress",
          "blocked",
          "resolved",
          "recorded"
        ),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getTimeline",
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
      name: "getByProtocol",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: Schema.Array(ProjectRecords.Doc),
      error: AppError,
    })
  );
