import { Skeleton } from "@repo/design-system/components/ui/skeleton";

/** Mirrors the loaded workflow panel height while query data resolves. */
export function WorkflowPanelSkeleton() {
  return (
    <div className="grid min-h-56 content-start gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-11/12" />
      <Skeleton className="h-10 w-4/5" />
    </div>
  );
}
