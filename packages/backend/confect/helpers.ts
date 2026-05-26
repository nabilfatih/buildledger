import {
  Auth,
  DatabaseReader,
} from "@repo/backend/confect/_generated/services";
import {
  Forbidden,
  normalizeAppError,
  ProjectNotFound,
} from "@repo/backend/confect/errors";
import type schema from "@repo/backend/confect/schema";
import type { GenericId } from "convex/values";
import type { Effect as EffectType } from "effect";
import { Effect, Option } from "effect";

type ProjectId = GenericId<"projects">;

const selfHostedUserToken = "buildledger:self-hosted-workspace";

/** Reads Convex environment values without blocking short-lived mutations. */
function readEnvValue(key: string, fallback: string) {
  if (typeof process === "undefined") {
    return fallback;
  }

  return process.env[key] ?? fallback;
}

/** Checks whether this deployment requires an external auth identity. */
function requiresExternalAuth() {
  return readEnvValue("BUILDLEDGER_AUTH_REQUIRED", "disabled") === "enabled";
}

/** Returns the single-tenant self-hosted identity when external auth is absent. */
const getSelfHostedUserToken = Effect.fn("auth.getSelfHostedUserToken")(
  function* () {
    if (requiresExternalAuth()) {
      return yield* Effect.fail(
        new Forbidden({
          message: "Sign in before accessing BuildLedger.",
        })
      );
    }

    return selfHostedUserToken;
  }
);

/** Maps unknown boundary failures into the public app error union. */
export function asAppError<A, R>(effect: EffectType.Effect<A, unknown, R>) {
  return effect.pipe(Effect.mapError(normalizeAppError));
}

/** Returns the authenticated Convex identity token for access checks. */
export const getUserToken = Effect.fn("auth.getUserToken")(function* () {
  if (!requiresExternalAuth()) {
    return selfHostedUserToken;
  }

  const identity = yield* Auth.getUserIdentity.pipe(
    Effect.catchTag("NoUserIdentityFoundError", () => Effect.succeed(null))
  );

  if (!identity) {
    return yield* getSelfHostedUserToken();
  }

  return identity.tokenIdentifier;
});

/** Returns the current identity token when a viewer is signed in. */
export const getOptionalUserToken = Effect.fn("auth.getOptionalUserToken")(
  function* () {
    if (!requiresExternalAuth()) {
      return selfHostedUserToken;
    }

    const identity = yield* Auth.getUserIdentity.pipe(
      Effect.catchTag("NoUserIdentityFoundError", () => Effect.succeed(null))
    );

    if (identity) {
      return identity.tokenIdentifier;
    }

    return yield* getSelfHostedUserToken();
  }
);

/** Loads a project only when the current identity is a project member. */
export const ensureProjectAccess = Effect.fn("auth.ensureProjectAccess")(
  function* (projectId: ProjectId) {
    const userToken = yield* getUserToken();
    const reader = yield* DatabaseReader;

    const project = yield* reader
      .table("projects")
      .get(projectId)
      .pipe(
        Effect.mapError(
          () =>
            new ProjectNotFound({
              projectId,
              message: "Project not found.",
            })
        )
      );

    if (project.status !== "active") {
      return yield* Effect.fail(
        new ProjectNotFound({
          projectId,
          message: "Project is not active.",
        })
      );
    }

    const membership = yield* reader
      .table("projectMembers")
      .index("by_projectId_and_userToken", (q) =>
        q.eq("projectId", projectId).eq("userToken", userToken)
      )
      .first()
      .pipe(
        Effect.map(
          Option.match({
            onNone: () => null,
            onSome: (membership) => membership,
          })
        ),
        Effect.mapError(
          () =>
            new Forbidden({
              message: "Project membership could not be verified.",
            })
        )
      );

    if (!membership) {
      return yield* Effect.fail(
        new Forbidden({
          message: "You do not have access to this project.",
        })
      );
    }

    if (membership.projectStatus === "archived") {
      return yield* Effect.fail(
        new Forbidden({
          message: "Project membership is not active.",
        })
      );
    }

    return project;
  }
);

export type BackendSchema = typeof schema;
