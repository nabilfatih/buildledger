import { createColumnHelper } from "@tanstack/react-table";

import { DateValue, MutedValue } from "@/components/ledger/badges";
import { LogbookEventBadge } from "@/components/logbook/badges";
import type { LogbookRow } from "@/components/logbook/types";

const columnHelper = createColumnHelper<LogbookRow>();

export const logbookColumns = [
  columnHelper.accessor("chronologyDate", {
    header: "Date",
    size: 120,
    cell: (info) => <DateValue fallback="No Date" value={info.getValue()} />,
  }),
  columnHelper.accessor("eventType", {
    header: "Event",
    size: 148,
    cell: (info) => <LogbookEventBadge eventType={info.getValue()} />,
  }),
  columnHelper.accessor("title", {
    header: "Description",
    size: 320,
    cell: (info) => (
      <div className="grid min-w-0 gap-1">
        <span className="block min-w-0 truncate font-medium leading-snug">
          {info.getValue()}
        </span>
        {info.row.original.body ? (
          <span className="block min-w-0 truncate text-muted-foreground text-xs leading-snug">
            {info.row.original.body}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor("component", {
    header: "Component",
    size: 120,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("objectName", {
    header: "Object",
    size: 120,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("trade", {
    header: "Trade",
    size: 112,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
  columnHelper.accessor("responsibleParty", {
    header: "Responsible",
    size: 132,
    cell: (info) => (
      <MutedValue fallback="Unassigned" value={info.getValue()} />
    ),
  }),
];
