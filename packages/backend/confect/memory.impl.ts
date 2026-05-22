import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Returns action, decision, and risk timeline data for a project. */
const timelineByProject = FunctionImpl.make(
  api,
  "memory",
  "timelineByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        const actions = yield* reader
          .table("actionItems")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
        const decisions = yield* reader
          .table("decisions")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
        const risks = yield* reader
          .table("risks")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);

        return { actions, decisions, risks };
      })
    )
);

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

/** Updates an action item status after checking project access. */
const updateActionStatus = FunctionImpl.make(
  api,
  "memory",
  "updateActionStatus",
  ({ actionItemId, status }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const actionItem = yield* reader.table("actionItems").get(actionItemId);

        yield* ensureProjectAccess(actionItem.projectId);

        yield* writer.table("actionItems").patch(actionItemId, {
          status,
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

export const memory = GroupImpl.make(api, "memory").pipe(
  Layer.provide(timelineByProject),
  Layer.provide(chunksByProject),
  Layer.provide(updateActionStatus)
);
