const defaultConvexUrl = "http://127.0.0.1:3210";
const defaultConvexSiteUrl = "http://127.0.0.1:3211";
const defaultSiteUrl = "http://127.0.0.1:3000";

export const convexUrlMetaName = "buildledger:convex-url";
export const convexSiteUrlMetaName = "buildledger:convex-site-url";
export const authRequiredMetaName = "buildledger:auth-required";

/** Returns the public Convex URL for server-rendered configuration. */
export function getPublicConvexUrl() {
  if (typeof document !== "undefined") {
    return getBrowserConvexUrl();
  }

  return (
    process.env.BUILDLEDGER_PUBLIC_CONVEX_URL ??
    process.env.VITE_CONVEX_URL ??
    defaultConvexUrl
  );
}

/** Returns the public Convex HTTP actions URL for Better Auth routes. */
export function getPublicConvexSiteUrl() {
  if (typeof document !== "undefined") {
    const meta = document.querySelector(
      `meta[name="${convexSiteUrlMetaName}"]`
    );
    const content = meta?.getAttribute("content");

    if (content) {
      return content;
    }

    return defaultConvexSiteUrl;
  }

  return (
    process.env.BUILDLEDGER_PUBLIC_CONVEX_SITE_URL ??
    process.env.VITE_CONVEX_SITE_URL ??
    defaultConvexSiteUrl
  );
}

/** Returns the public site URL used by Better Auth redirects and cookies. */
export function getPublicSiteUrl() {
  return process.env.VITE_SITE_URL ?? process.env.SITE_URL ?? defaultSiteUrl;
}

/** Returns whether production auth is required for the current deployment. */
export function getPublicAuthRequired() {
  if (typeof document !== "undefined") {
    const meta = document.querySelector(`meta[name="${authRequiredMetaName}"]`);

    return meta?.getAttribute("content") === "enabled";
  }

  return (
    (process.env.BUILDLEDGER_AUTH_REQUIRED ??
      process.env.VITE_BUILDLEDGER_AUTH_REQUIRED ??
      "disabled") === "enabled"
  );
}

/** Reads the public Convex URL already rendered into the document head. */
function getBrowserConvexUrl() {
  const meta = document.querySelector(`meta[name="${convexUrlMetaName}"]`);
  const content = meta?.getAttribute("content");

  if (content) {
    return content;
  }

  return defaultConvexUrl;
}
