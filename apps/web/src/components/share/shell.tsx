import {
  Frame,
  FrameHeader,
  FramePanel,
} from "@repo/design-system/components/ui/frame";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { ReactNode } from "react";

/** Keeps the public share page centered and bounded. */
export function ShareShell({ children }: { readonly children: ReactNode }) {
  return (
    <main className="min-h-svh bg-background p-4 md:p-8">
      <div className="mx-auto grid max-w-5xl gap-4">{children}</div>
    </main>
  );
}

/** Shows a stable loading surface for shared resources. */
export function ShareSkeleton() {
  return (
    <Frame>
      <FrameHeader>
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-72" />
      </FrameHeader>
      <FramePanel className="grid gap-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </FramePanel>
    </Frame>
  );
}
