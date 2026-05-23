import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Projects } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const ProjectPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(Projects.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

export const projects = GroupSpec.make("projects")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listForCurrentUser",
      args: Schema.Struct({
        paginationOpts: PaginationOpts,
      }),
      returns: ProjectPage,
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
