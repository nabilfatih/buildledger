import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "../convex/_generated/api";
import type { DataModel } from "../convex/_generated/dataModel";
import authConfig from "../convex/auth.config";

const defaultSiteUrl = "http://127.0.0.1:3000";
const localAuthSecret = "buildledger-local-self-hosted-auth-secret";
const authRequired = process.env.BUILDLEDGER_AUTH_REQUIRED === "enabled";
const rateLimitEnabled = authRequired && process.env.NODE_ENV === "production";
const trustedIpHeaders = [
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
  "x-client-ip",
];

export const authComponent = createClient<DataModel>(components.betterAuth);

/** Resolves the auth secret without letting production auth run on a default. */
function resolveAuthSecret() {
  const secret =
    process.env.BETTER_AUTH_SECRET ?? process.env.BUILDLEDGER_SECRET_KEY;
  if (secret) {
    return secret;
  }

  if (authRequired) {
    throw new Error(
      "Set BETTER_AUTH_SECRET or BUILDLEDGER_SECRET_KEY before enabling BuildLedger auth."
    );
  }

  return localAuthSecret;
}

/** Returns the Convex compatibility plugin with optional static JWKS. */
function createConvexPlugin() {
  if (process.env.JWKS) {
    return convex({
      authConfig,
      jwks: process.env.JWKS,
    });
  }

  return convex({ authConfig });
}

/** Creates the Better Auth runtime backed by Convex component storage. */
export function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    advanced: {
      ipAddress: {
        disableIpTracking: !authRequired,
        ipAddressHeaders: trustedIpHeaders,
      },
    },
    baseURL: process.env.SITE_URL ?? defaultSiteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [createConvexPlugin()],
    rateLimit: {
      enabled: rateLimitEnabled,
    },
    secret: resolveAuthSecret(),
  });
}
