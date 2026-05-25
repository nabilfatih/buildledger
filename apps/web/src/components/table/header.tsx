import { ChevronDown, ChevronUp } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { flexRender, type Header } from "@tanstack/react-table";

/** Renders sortable TanStack table headers with COSS button styling. */
export function SortableHeader<Row>({
  header,
}: {
  readonly header: Header<Row, unknown>;
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
