import { ChevronDown, ChevronUp } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { flexRender, type Header } from "@tanstack/react-table";

import { ColumnMenu } from "@/components/ledger/menu";
import { LedgerPagination } from "@/components/ledger/pagination";
import { SelectionActions } from "@/components/ledger/selection";
import type { LedgerRow, LedgerTable } from "@/components/ledger/types";

/** Renders the ledger table across all devices with contained table scrolling. */
export function LedgerDataTable({
  onCopySelectedRows,
  table,
}: {
  readonly onCopySelectedRows: () => void;
  readonly table: LedgerTable;
}) {
  return (
    <>
      <Table className="min-w-[58rem] table-fixed" variant="card">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: `${header.column.getSize()}px` }}
                >
                  {header.isPlaceholder ? null : (
                    <ColumnHeaderButton header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              data-state={row.getIsSelected() ? "selected" : undefined}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className="min-w-0 whitespace-normal align-top"
                  key={cell.id}
                  style={{ width: `${cell.column.getSize()}px` }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ColumnMenu table={table} />
          <SelectionActions
            onClearSelection={() => table.resetRowSelection()}
            onCopySelectedRows={onCopySelectedRows}
            selectedCount={table.getSelectedRowModel().rows.length}
          />
        </div>
        <LedgerPagination table={table} />
      </div>
    </>
  );
}

/** Renders sortable table headers with predictable icon placement. */
function ColumnHeaderButton({
  header,
}: {
  readonly header: Header<LedgerRow, unknown>;
}) {
  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext());
  }

  const sortDirection = header.column.getIsSorted();

  return (
    <Button
      className="h-full min-w-0 justify-between px-0 text-left"
      onClick={header.column.getToggleSortingHandler()}
      size="xs"
      type="button"
      variant="ghost"
    >
      <span className="min-w-0 truncate">
        {flexRender(header.column.columnDef.header, header.getContext())}
      </span>
      {sortDirection === "asc" ? (
        <HugeIcons
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground opacity-80"
          icon={ChevronUp}
        />
      ) : null}
      {sortDirection === "desc" ? (
        <HugeIcons
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground opacity-80"
          icon={ChevronDown}
        />
      ) : null}
    </Button>
  );
}
