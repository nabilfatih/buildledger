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
import { Config, Effect } from "effect";

type ProjectId = GenericId<"projects">;

const devAuthConfig = Config.string("BUILDLEDGER_DEV_AUTH").pipe(
  Config.withDefault("disabled")
);
const nodeEnvConfig = Config.string("NODE_ENV").pipe(
  Config.withDefault("development")
);
const devUserToken = "buildledger:local-dev-user";

/** Returns the local Browser test identity when development auth is enabled. */
const getDevUserToken = Effect.fn("auth.getDevUserToken")(function* () {
  const mode = yield* devAuthConfig;

  if (mode !== "enabled") {
    return null;
  }

  const nodeEnv = yield* nodeEnvConfig;

  if (nodeEnv === "production") {
    return yield* Effect.fail(
      new Forbidden({
        message: "BUILDLEDGER_DEV_AUTH cannot run in production.",
      })
    );
  }

  return devUserToken;
});

/** Maps unknown boundary failures into the public app error union. */
export function asAppError<A, R>(effect: EffectType.Effect<A, unknown, R>) {
  return effect.pipe(Effect.mapError(normalizeAppError));
}

/** Returns the authenticated Convex identity token for access checks. */
export const getUserToken = Effect.fn("auth.getUserToken")(function* () {
  const identity = yield* Auth.getUserIdentity.pipe(
    Effect.catchTag("NoUserIdentityFoundError", () => Effect.succeed(null))
  );

  if (!identity) {
    const token = yield* getDevUserToken();

    if (token) {
      return token;
    }

    return yield* Effect.fail(
      new Forbidden({
        message: "Sign in before accessing BuildLedger.",
      })
    );
  }

  return identity.tokenIdentifier;
});

/** Returns the current identity token when a viewer is signed in. */
export const getOptionalUserToken = Effect.fn("auth.getOptionalUserToken")(
  function* () {
    const identity = yield* Auth.getUserIdentity.pipe(
      Effect.catchTag("NoUserIdentityFoundError", () => Effect.succeed(null))
    );

    if (identity) {
      return identity.tokenIdentifier;
    }

    return yield* getDevUserToken();
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

    const membership = yield* reader
      .table("projectMembers")
      .index("by_projectId_and_userToken", (q) =>
        q.eq("projectId", projectId).eq("userToken", userToken)
      )
      .first()
      .pipe(
        Effect.map((result) => (result._tag === "Some" ? result.value : null)),
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

    return project;
  }
);

export type BackendSchema = typeof schema;
