/// <reference types="vite/client" />

import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ConvexClientProvider } from "@/lib/convex";
import { convexUrlMetaName, getPublicConvexUrl } from "@/lib/public-config";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "BuildLedger",
      },
      {
        name: "description",
        content:
          "Open-source construction meeting intelligence with realtime project memory.",
      },
      {
        name: convexUrlMetaName,
        content: getPublicConvexUrl(),
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

/** Renders the route outlet inside the app document shell. */
function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

/** Defines the HTML document and Base UI isolation root. */
function RootDocument({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="relative">
        <div className="relative isolate flex min-h-svh flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
