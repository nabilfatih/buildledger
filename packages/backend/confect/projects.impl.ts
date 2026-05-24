import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import {
  asAppError,
  ensureProjectAccess,
  getOptionalUserToken,
  getUserToken,
} from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Lists one active project membership page for the signed-in user. */
const listForCurrentUser = FunctionImpl.make(
  api,
  "projects",
  "listForCurrentUser",
  ({ paginationOpts }) =>
    asAppError(
      Effect.gen(function* () {
        const userToken = yield* getOptionalUserToken();
        if (!userToken) {
          return {
            continueCursor: paginationOpts.cursor ?? "",
            isDone: true,
            page: [],
          };
        }

        const reader = yield* DatabaseReader;

        const memberships = yield* reader
          .table("projectMembers")
          .index("by_userToken", (q) => q.eq("userToken", userToken), "desc")
          .paginate(paginationOpts);

        const projects = yield* Effect.all(
          memberships.page.map((membership) =>
            reader.table("projects").get(membership.projectId)
          )
        );

        return {
          ...memberships,
          page: projects.filter((project) => project.status === "active"),
        };
      })
    )
);

/** Creates an organization, owner membership, project, and manager membership. */
const create = FunctionImpl.make(
  api,
  "projects",
  "create",
  ({ organizationName, name, code, description }) =>
    asAppError(
      Effect.gen(function* () {
        const userToken = yield* getUserToken();
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        const organizationId = yield* writer.table("organizations").insert({
          name: organizationName,
          slug: organizationName.toLowerCase().replaceAll(/\s+/g, "-"),
          createdByToken: userToken,
          createdAt: timestamp,
        });

        yield* writer.table("organizationMembers").insert({
          organizationId,
          userToken,
          role: "owner",
          createdAt: timestamp,
        });

        const projectId = yield* writer.table("projects").insert({
          organizationId,
          name,
          code,
          description,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        yield* writer.table("projectMembers").insert({
          projectId,
          userToken,
          role: "manager",
          createdAt: timestamp,
        });

        return projectId;
      })
    )
);

/** Reads a project after verifying membership. */
const get = FunctionImpl.make(api, "projects", "get", ({ projectId }) =>
  asAppError(ensureProjectAccess(projectId))
);

/** Archives a project after verifying membership. */
const archive = FunctionImpl.make(api, "projects", "archive", ({ projectId }) =>
  asAppError(
    Effect.gen(function* () {
      yield* ensureProjectAccess(projectId);
      const writer = yield* DatabaseWriter;

      yield* writer.table("projects").patch(projectId, {
        status: "archived",
        updatedAt: Date.now(),
      });

      return null;
    })
  )
);

export const projects = GroupImpl.make(api, "projects").pipe(
  Layer.provide(listForCurrentUser),
  Layer.provide(create),
  Layer.provide(get),
  Layer.provide(archive)
);
