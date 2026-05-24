import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { MemoryChunks } from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const memory = GroupSpec.make("memory").addFunction(
  FunctionSpec.publicQuery({
    name: "chunksByProject",
    args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
    returns: Schema.Array(MemoryChunks.Doc),
    error: AppError,
  })
);
