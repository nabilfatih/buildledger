const defaultConvexUrl = "http://127.0.0.1:3210";

export const convexUrlMetaName = "buildledger:convex-url";

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

/** Reads the public Convex URL already rendered into the document head. */
function getBrowserConvexUrl() {
  const meta = document.querySelector(`meta[name="${convexUrlMetaName}"]`);
  const content = meta?.getAttribute("content");

  if (content) {
    return content;
  }

  return defaultConvexUrl;
}
