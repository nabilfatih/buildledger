import { QueryResult, useAction, useMutation, useQuery } from "@confect/react";
import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { useDebouncedValue } from "@mantine/hooks";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
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
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { GenericId } from "convex/values";
import { subDays } from "date-fns";
import { Effect, Either } from "effect";
import { useMemo, useState } from "react";
import { getShareLink } from "@/components/intelligence/result";
import { shareArgs } from "@/components/intelligence/share";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import { reportColumns } from "@/components/reports/columns";
import { ReportsDataTable } from "@/components/reports/data";
import { ReportFilters } from "@/components/reports/filters";
import { type ReportRow, reportPageSize } from "@/components/reports/types";
import { formatDateInput } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

/** Owns report generation, publishing, listing, and sharing. */
export function ReportsPanel({
  canUseProjectMemory,
  selectedProjectId,
}: {
  readonly canUseProjectMemory: boolean;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const generateReport = useAction(refs.public.reports.generate);
  const publishReport = useMutation(refs.public.reports.publish);
  const createShareLink = useMutation(refs.public.shares.createReadOnlyLink);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: reportPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);
  const reportFilters = useMemo(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(status === "all" ? {} : { status }),
    }),
    [debouncedSearch, status]
  );
  const reports = useQuery(
    refs.public.reports.listByProject,
    selectedProjectId
      ? {
          filters: reportFilters,
          paginationOpts: { cursor: null, numItems: reportPageSize * 8 },
          projectId: selectedProjectId,
        }
      : "skip"
  );
  const rows = reports._tag === "Success" ? reports.value.page : [];
  const columns = reportColumns({
    onPublish: handlePublishReport,
    onShare: handleShareReport,
  });
  const table = useReactTable({
    columns,
    data: rows,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row._id,
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
  });

  /** Generates a report draft from the last seven days of project memory. */
  function handleGenerateReport() {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before generating a report.",
        type: "warning",
      });
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish a protocol before generating a project report.",
        type: "warning",
      });
      return;
    }

    setIsGenerating(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const now = new Date();
        const result = yield* Effect.tryPromise({
          try: () =>
            generateReport({
              projectId: selectedProjectId,
              periodEnd: formatDateInput(now),
              periodStart: formatDateInput(subDays(now, 7)),
            }),
          catch: getErrorMessage,
        });

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        yield* Effect.sync(() =>
          toastManager.add({
            title: "Report draft created",
            type: "success",
          })
        );
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report was not generated",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsGenerating(false)))
      )
    );
  }

  /** Publishes a report draft into project memory. */
  function handlePublishReport(report: ReportRow) {
    if (report.status === "published") {
      return;
    }

    return Effect.runPromise(
      Effect.tryPromise({
        try: () => publishReport({ reportId: report._id }),
        catch: getErrorMessage,
      }).pipe(
        Effect.flatMap((result) =>
          Either.match(result, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: () => Effect.void,
          })
        ),
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report published",
              description: "The report is now part of project memory.",
              type: "success",
            })
          )
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report was not published",
              description,
              type: "error",
            })
          )
        )
      )
    );
  }

  /** Creates and copies one read-only report share link. */
  function handleShareReport(report: ReportRow) {
    if (!selectedProjectId) {
      return;
    }

    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            createShareLink(
              shareArgs("report", {
                projectId: selectedProjectId,
                protocolId: null,
                reportId: report._id,
              })
            ),
          catch: getErrorMessage,
        });
        const share = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.tryPromise({
          try: () => navigator.clipboard.writeText(getShareLink(share.token)),
          catch: () => "Clipboard permission denied.",
        });

        yield* Effect.sync(() =>
          toastManager.add({
            title: "Report share link copied",
            type: "success",
          })
        );
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report was not shared",
              description,
              type: "error",
            })
          )
        )
      )
    );
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Reports</FrameTitle>
        <FrameDescription>
          Generate project reports from published protocol memory.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="grid min-w-0 gap-4 p-4">
        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              disabled={!selectedProjectId}
              loading={isGenerating}
              onClick={handleGenerateReport}
              size="sm"
              type="button"
            >
              <HugeIcons icon={Analytics01Icon} /> Generate Report
            </Button>
          </ToolbarGroup>
        </Toolbar>
        <ReportFilters
          search={search}
          setSearch={setSearch}
          setStatus={setStatus}
          status={status}
        />
        {QueryResult.match(reports, {
          onLoading: () => <WorkflowPanelSkeleton />,
          onFailure: (error) => (
            <Empty className="min-h-48">
              <EmptyHeader>
                <EmptyTitle>Reports unavailable</EmptyTitle>
                <EmptyDescription>{error.message}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ),
          onSuccess: (reportPage) =>
            reportPage.page.length === 0 ? (
              <Empty className="min-h-48">
                <EmptyHeader>
                  <EmptyTitle>No reports yet</EmptyTitle>
                  <EmptyDescription>
                    Publish a protocol, then generate a project report.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ReportsDataTable table={table} />
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
