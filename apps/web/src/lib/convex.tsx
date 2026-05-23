import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { getPublicConvexUrl } from "@/lib/public-config";

/** Provides the shared Convex client to the TanStack Start app. */
export function ConvexClientProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const convex = useMemo(() => new ConvexReactClient(getPublicConvexUrl()), []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
