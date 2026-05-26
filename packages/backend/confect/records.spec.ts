import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { ProjectRecords } from "@repo/backend/confect/tables/core";
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

const RecordFilters = Schema.Struct({
  component: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
  objectName: Schema.optional(Schema.String),
  responsibleParty: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  severity: Schema.optional(Schema.String),
  sourceProtocol: Schema.optional(Schema.String),
  startDate: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  trade: Schema.optional(Schema.String),
});

export const records = GroupSpec.make("records")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
        filters: Schema.optional(RecordFilters),
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
    FunctionSpec.publicMutation({
      name: "assign",
      args: Schema.Struct({
        recordId: GenericId.GenericId("projectRecords"),
        responsibleParty: Schema.optional(Schema.String),
        dueDate: Schema.optional(Schema.String),
      }),
      returns: Schema.Null,
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
