import { createColumnHelper } from "@tanstack/react-table";

import { ReportAction } from "@/components/reports/action";
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
