"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://127.0.0.1:3210";

const convex = new ConvexReactClient(convexUrl);

/** Provides the shared Convex client to the TanStack Start app. */
export function ConvexClientProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
