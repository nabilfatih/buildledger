import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import {
  ActionItems,
  Decisions,
  MemoryChunks,
  Risks,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const memory = GroupSpec.make("memory")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "timelineByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Struct({
        actions: Schema.Array(ActionItems.Doc),
        decisions: Schema.Array(Decisions.Doc),
        risks: Schema.Array(Risks.Doc),
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "chunksByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(MemoryChunks.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "updateActionStatus",
      args: Schema.Struct({
        actionItemId: GenericId.GenericId("actionItems"),
        status: Schema.Literal("open", "blocked", "done"),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  );
