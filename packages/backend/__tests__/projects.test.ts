import { convexTest } from "convex-test";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("../convex/**/*.*s");

process.env.BUILDLEDGER_AUTH_REQUIRED = "disabled";

afterEach(() => {
  vi.useRealTimers();
});

describe("projects", () => {
  it(
    "archives every active membership through scheduled bounded batches",
    () =>
      Effect.runPromise(
        Effect.gen(function* () {
          vi.useFakeTimers();
          const t = convexTest({ modules, schema });
          const projectId = yield* Effect.promise(() =>
            t.mutation(api.projects.create, {
              code: "HT-01",
              description: "Construction protocol workspace.",
              name: "Harbor Tower",
              organizationName: "BuildLedger Test",
            })
          );

          yield* Effect.promise(() =>
            t.run((ctx) =>
              Effect.runPromise(
                Effect.all(
                  Array.from({ length: 205 }, (_, index) =>
                    Effect.promise(() =>
                      ctx.db.insert("projectMembers", {
                        createdAt: Date.now() + index,
                        projectId,
                        projectStatus: "active",
                        role: "viewer",
                        userToken: `user:${index}`,
                      })
                    )
                  )
                )
              )
            )
          );

          yield* Effect.promise(() =>
            t.mutation(api.projects.archive, { projectId })
          );

          const visibleProjects = yield* Effect.promise(() =>
            t.query(api.projects.listForCurrentUser, {
              paginationOpts: { cursor: null, numItems: 10 },
            })
          );
          expect(visibleProjects.page).toHaveLength(0);

          yield* Effect.promise(() =>
            t.finishAllScheduledFunctions(() => vi.runAllTimers())
          );

          const activeMemberships = yield* Effect.promise(() =>
            t.run((ctx) =>
              ctx.db
                .query("projectMembers")
                .withIndex("by_projectId_and_projectStatus", (q) =>
                  q.eq("projectId", projectId).eq("projectStatus", "active")
                )
                .take(1)
            )
          );
          expect(activeMemberships).toHaveLength(0);
        })
      ),
    10_000
  );
});
