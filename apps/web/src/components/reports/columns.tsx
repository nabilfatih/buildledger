import { Link01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { createColumnHelper } from "@tanstack/react-table";

import { ReportStatusBadge } from "@/components/reports/badges";
import type { ReportRow } from "@/components/reports/types";
import { formatDisplayDateRange, formatDisplayDateTime } from "@/lib/dates";

const columnHelper = createColumnHelper<ReportRow>();

/** Creates report table columns with one direct row action. */
export function reportColumns({
  onPublish,
  onShare,
}: {
  readonly onPublish: (row: ReportRow) => void;
  readonly onShare: (row: ReportRow) => void;
}) {
  return [
    columnHelper.display({
      cell: ({ row }) => (
        <ReportAction
          onPublish={() => onPublish(row.original)}
          onShare={() => onShare(row.original)}
          report={row.original}
        />
      ),
      enableSorting: false,
      header: "Action",
      id: "action",
      size: 132,
    }),
    columnHelper.accessor("title", {
      cell: ({ row }) => (
        <div className="grid min-w-0 gap-1">
          <span className="truncate font-medium">{row.original.title}</span>
          <span className="line-clamp-2 text-muted-foreground text-xs leading-snug">
            {row.original.body}
          </span>
        </div>
      ),
      header: "Report",
      size: 360,
    }),
    columnHelper.accessor("periodStart", {
      cell: ({ row }) =>
        formatDisplayDateRange(
          row.original.periodStart,
          row.original.periodEnd
        ),
      header: "Period",
      size: 180,
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => <ReportStatusBadge status={getValue()} />,
      header: "Status",
      size: 120,
    }),
    columnHelper.accessor("updatedAt", {
      cell: ({ getValue }) => formatDisplayDateTime(getValue()),
      header: "Updated",
      size: 180,
    }),
  ];
}

/** Renders the single next action available for one report row. */
function ReportAction({
  onPublish,
  onShare,
  report,
}: {
  readonly onPublish: () => void;
  readonly onShare: () => void;
  readonly report: ReportRow;
}) {
  const actionContext = `${report.title} updated ${formatDisplayDateTime(
    report.updatedAt
  )}`;

  if (report.status === "published") {
    return (
      <Button
        aria-label={`Share ${actionContext}`}
        onClick={onShare}
        size="sm"
        type="button"
        variant="outline"
      >
        <HugeIcons icon={Link01Icon} /> Share
      </Button>
    );
  }

  return (
    <Button
      aria-label={`Publish ${actionContext}`}
      onClick={onPublish}
      size="sm"
      type="button"
      variant="default"
    >
      <HugeIcons icon={Upload04Icon} /> Publish
    </Button>
  );
}
