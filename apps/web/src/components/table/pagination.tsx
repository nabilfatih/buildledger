import { Button } from "@repo/design-system/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@repo/design-system/components/ui/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { Table } from "@tanstack/react-table";

/** Controls TanStack pagination without adding another primary action. */
export function DataTablePagination<Row>({
  className,
  label,
  table,
}: {
  readonly className?: string;
  readonly label: string;
  readonly table: Table<Row>;
}) {
  const pageOptions = Array.from({ length: table.getPageCount() }, (_, index) =>
    getPageOption(table, index)
  );
  const currentPage = pageOptions[table.getState().pagination.pageIndex];

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-between gap-2 text-muted-foreground text-sm lg:justify-end ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>Viewing</span>
        <Select
          items={pageOptions}
          itemToStringValue={(item) => item.label}
          onValueChange={(item) => {
            if (!item) {
              return;
            }

            table.setPageIndex(item.value);
          }}
          value={currentPage ?? null}
        >
          <SelectTrigger
            aria-label={`Select ${label} result range`}
            className="w-fit min-w-24"
            size="sm"
          >
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {pageOptions.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span>
          of{" "}
          <strong className="font-medium text-foreground">
            {table.getRowCount()}
          </strong>{" "}
          Results
        </span>
      </div>
      <Pagination className="mx-0 w-fit justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              render={
                <Button
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              render={
                <Button
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

/** Creates the displayed page range for the pagination select. */
function getPageOption<Row>(table: Table<Row>, index: number) {
  const pageSize = table.getState().pagination.pageSize;
  const start = index * pageSize + 1;
  const end = Math.min((index + 1) * pageSize, table.getRowCount());

  return {
    label: `${start}-${end}`,
    value: index,
  };
}
