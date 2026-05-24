import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { createColumnHelper } from "@tanstack/react-table";

import {
  DateValue,
  KindBadge,
  MutedValue,
  SeverityBadge,
  StatusBadge,
} from "@/components/ledger/badges";
import type { LedgerRow } from "@/components/ledger/types";
import { formatDisplayDate } from "@/lib/dates";

const columnHelper = createColumnHelper<LedgerRow>();

export const ledgerColumns = [
  columnHelper.display({
    id: "select",
    size: 36,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all ledger rows"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.title}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  }),
  columnHelper.accessor("kind", {
    header: "Type",
    size: 92,
    cell: (info) => <KindBadge kind={info.getValue()} />,
  }),
  columnHelper.accessor("title", {
    header: "Description",
    size: 300,
    cell: (info) => (
      <div className="grid min-w-0 gap-1">
        <span className="break-words font-medium leading-snug">
          {info.getValue()}
        </span>
        {info.row.original.body ? (
          <span className="line-clamp-2 break-words text-muted-foreground text-xs leading-snug">
            {info.row.original.body}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor("meetingTitle", {
    header: "Source",
    size: 156,
    cell: (info) => (
      <span className="block min-w-0 truncate">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("ownerName", {
    header: "Owner",
    size: 132,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("dueDate", {
    header: "Due",
    size: 112,
    cell: (info) => (
      <DateValue fallback="No Due Date" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("severity", {
    header: "Severity",
    size: 112,
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 96,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("meetingDate", {
    header: "Date",
    size: 100,
    cell: (info) => formatDisplayDate(info.getValue()),
  }),
  columnHelper.accessor("citationCount", {
    header: "Citations",
    size: 88,
    cell: (info) => info.getValue(),
  }),
];
