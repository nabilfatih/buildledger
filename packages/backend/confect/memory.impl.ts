import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Returns recent vector-searchable memory chunks for a project. */
const chunksByProject = FunctionImpl.make(
  api,
  "memory",
  "chunksByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("memoryChunks")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(100);
      })
    )
);

export const memory = GroupImpl.make(api, "memory").pipe(
  Layer.provide(chunksByProject)
);
