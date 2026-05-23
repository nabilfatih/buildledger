import { useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { formatDisplayDate, formatDisplayDateRange } from "@/lib/dates";

export const Route = createFileRoute("/share")({
  validateSearch: (search) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ShareRoute,
});

/** Renders a public read-only meeting or report shared from BuildLedger. */
function ShareRoute() {
  const { token } = Route.useSearch();
  const resource = useQuery(
    refs.public.shares.resolvePublicResource,
    token ? { token } : "skip"
  );

  if (!token) {
    return (
      <ShareShell>
        <Empty className="min-h-96">
          <EmptyHeader>
            <EmptyTitle>Share link unavailable</EmptyTitle>
            <EmptyDescription>
              The share link is missing a token.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ShareShell>
    );
  }

  return (
    <ShareShell>
      {resource._tag === "Loading" ? <ShareSkeleton /> : null}
      {resource._tag === "Failure" ? (
        <Empty className="min-h-96">
          <EmptyHeader>
            <EmptyTitle>Share link unavailable</EmptyTitle>
            <EmptyDescription>{resource.error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      <SharedResource resource={resource} />
    </ShareShell>
  );
}

/** Keeps the public share page centered and bounded. */
function ShareShell({ children }: { readonly children: ReactNode }) {
  return (
    <main className="min-h-svh bg-background p-4 md:p-8">
      <div className="mx-auto grid max-w-5xl gap-4">{children}</div>
    </main>
  );
}

/** Chooses the concrete shared resource view after the query succeeds. */
function SharedResource({
  resource,
}: {
  readonly resource: ReturnType<
    typeof useQuery<typeof refs.public.shares.resolvePublicResource>
  >;
}) {
  if (resource._tag !== "Success") {
    return null;
  }

  if (resource.value.resourceType === "meeting") {
    return <SharedMeeting value={resource.value} />;
  }

  return <SharedReport value={resource.value} />;
}

/** Shows a stable loading surface for shared resources. */
function ShareSkeleton() {
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

/** Displays a shared meeting with published inputs and review items. */
function SharedMeeting({
  value,
}: {
  readonly value: {
    readonly projectCode: string;
    readonly projectName: string;
    readonly meeting: {
      readonly meetingDate: string;
      readonly title: string;
    };
    readonly inputs: ReadonlyArray<{ readonly text?: string }>;
    readonly items: ReadonlyArray<{
      readonly body: string;
      readonly kind: string;
      readonly title: string;
    }>;
  };
}) {
  return (
    <Frame>
      <FrameHeader>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>{value.meeting.title}</FrameTitle>
            <FrameDescription>
              {value.projectName} ·{" "}
              {formatDisplayDate(value.meeting.meetingDate)}
            </FrameDescription>
          </div>
          <Badge variant="outline">{value.projectCode}</Badge>
        </div>
      </FrameHeader>
      <FramePanel className="grid gap-4 p-4">
        <Alert variant="success">
          <AlertTitle>Published Meeting</AlertTitle>
          <AlertDescription>
            This read-only record was shared from BuildLedger.
          </AlertDescription>
        </Alert>
        <SharedNotes inputs={value.inputs} />
        <Table className="table-fixed" variant="card">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Type</TableHead>
              <TableHead>Record</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.items.map((item) => (
              <TableRow key={`${item.kind}:${item.title}`}>
                <TableCell className="align-top">
                  <Badge variant={sharedKindVariant(item.kind)}>
                    {formatSharedLabel(item.kind)}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-0 align-top">
                  <div className="grid gap-1">
                    <span className="break-words font-medium">
                      {item.title}
                    </span>
                    <span className="break-words text-muted-foreground text-sm">
                      {item.body}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FramePanel>
    </Frame>
  );
}

/** Displays a shared report draft or published report. */
function SharedReport({
  value,
}: {
  readonly value: {
    readonly projectCode: string;
    readonly projectName: string;
    readonly report: {
      readonly body: string;
      readonly periodEnd: string;
      readonly periodStart: string;
      readonly status: string;
      readonly title: string;
    };
  };
}) {
  return (
    <Frame>
      <FrameHeader>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>{value.report.title}</FrameTitle>
            <FrameDescription>
              {value.projectName} ·{" "}
              {formatDisplayDateRange(
                value.report.periodStart,
                value.report.periodEnd
              )}
            </FrameDescription>
          </div>
          <Badge variant="outline">{value.projectCode}</Badge>
        </div>
      </FrameHeader>
      <FramePanel className="p-4">
        <Alert variant="success">
          <AlertTitle>
            {formatSharedLabel(value.report.status)} Report
          </AlertTitle>
          <AlertDescription>
            <span className="whitespace-pre-wrap break-words">
              {value.report.body}
            </span>
          </AlertDescription>
        </Alert>
      </FramePanel>
    </Frame>
  );
}

/** Shows shared source notes without rendering empty sections. */
function SharedNotes({
  inputs,
}: {
  readonly inputs: ReadonlyArray<{ readonly text?: string }>;
}) {
  const text = inputs
    .map((input) => input.text ?? "")
    .join("\n\n")
    .trim();

  if (!text) {
    return null;
  }

  return (
    <Alert>
      <AlertTitle>Source Notes</AlertTitle>
      <AlertDescription>
        <span className="line-clamp-6 whitespace-pre-wrap break-words">
          {text}
        </span>
      </AlertDescription>
    </Alert>
  );
}

/** Formats persisted enum strings for public labels. */
function formatSharedLabel(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Keeps shared record colors aligned with the private ledger table. */
function sharedKindVariant(value: string) {
  if (value === "risk") {
    return "warning";
  }

  if (value === "decision") {
    return "success";
  }

  if (value === "action" || value === "question") {
    return "info";
  }

  return "outline";
}
