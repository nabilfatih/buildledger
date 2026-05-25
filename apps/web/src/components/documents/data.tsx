import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { flexRender } from "@tanstack/react-table";

import {
  type DocumentTable,
  documentPageSize,
} from "@/components/documents/types";
import { SortableHeader } from "@/components/table/header";
import { DataTablePagination } from "@/components/table/pagination";

export function DocumentsDataTable({
  table,
}: {
  readonly table: DocumentTable;
}) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const fillerRows = Array.from(
    { length: Math.max(documentPageSize - Math.max(rows.length, 1), 0) },
    (_, index) => `document-filler-${index + 1}`
  );

  return (
    <>
      <Table className="min-w-[68rem] table-fixed" variant="card">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: `${header.column.getSize()}px` }}
                >
                  {header.isPlaceholder ? null : (
                    <SortableHeader header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="h-14">
              <TableCell
                className="text-muted-foreground"
                colSpan={visibleColumns.length}
              >
                No documents match the current filters.
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow className="h-14" key={row.id}>
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
          {fillerRows.map((row) => (
            <TableRow aria-hidden="true" className="h-14" key={row}>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  style={{ width: `${column.getSize()}px` }}
                >
                  &nbsp;
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DataTablePagination label="documents" table={table} />
    </>
  );
}
