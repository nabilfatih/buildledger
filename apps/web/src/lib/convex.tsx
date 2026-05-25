import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { getPublicAuthRequired, getPublicConvexUrl } from "@/lib/public-config";

/** Provides the shared Convex client to the TanStack Start app. */
export function ConvexClientProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const convex = useMemo(() => new ConvexReactClient(getPublicConvexUrl()), []);
  const requiresAuth = getPublicAuthRequired();

  if (!requiresAuth) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
