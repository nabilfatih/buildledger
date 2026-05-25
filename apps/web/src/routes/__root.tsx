/// <reference types="vite/client" />

import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  AnchoredToastProvider,
  ToastProvider,
} from "@repo/design-system/components/ui/toast";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ConvexClientProvider } from "@/lib/convex";
import {
  authRequiredMetaName,
  convexSiteUrlMetaName,
  convexUrlMetaName,
  getPublicAuthRequired,
  getPublicConvexSiteUrl,
  getPublicConvexUrl,
} from "@/lib/public-config";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
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
          "Open-source construction protocol intelligence with traceable project memory.",
      },
      {
        name: convexUrlMetaName,
        content: getPublicConvexUrl(),
      },
      {
        name: convexSiteUrlMetaName,
        content: getPublicConvexSiteUrl(),
      },
      {
        name: authRequiredMetaName,
        content: getPublicAuthRequired() ? "enabled" : "disabled",
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

/** Shows a product-safe recovery state when route rendering fails. */
function RootErrorComponent({ reset }: { readonly reset: () => void }) {
  return (
    <RootDocument>
      <main className="flex min-h-svh items-center justify-center p-6">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyTitle>BuildLedger needs a refresh</EmptyTitle>
            <EmptyDescription>
              The workspace could not finish loading. Refresh the workspace and
              try again.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={reset} type="button">
            Refresh Workspace
          </Button>
        </Empty>
      </main>
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
          <ConvexClientProvider>
            <ToastProvider position="top-center">
              <AnchoredToastProvider>{children}</AnchoredToastProvider>
            </ToastProvider>
          </ConvexClientProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
