import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

import { ledgerPageSize } from "@/components/ledger/types";

const rows = Array.from(
  { length: ledgerPageSize },
  (_, index) => `row-${index + 1}`
);

/** Keeps the ledger surface stable during query refreshes. */
export function LedgerTableSkeleton() {
  return (
    <>
      <Table className="min-w-[58rem] table-fixed" variant="card">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead style={{ width: "54px" }}>
              <Skeleton className="size-5 rounded-md" />
            </TableHead>
            <TableHead style={{ width: "116px" }}>
              <Skeleton className="h-4 w-14" />
            </TableHead>
            <TableHead style={{ width: "340px" }}>
              <Skeleton className="h-4 w-28" />
            </TableHead>
            <TableHead style={{ width: "220px" }}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead style={{ width: "126px" }}>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead style={{ width: "126px" }}>
              <Skeleton className="h-4 w-14" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row}>
              <TableCell>
                <Skeleton className="size-5 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-18" />
              </TableCell>
              <TableCell>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-72" />
      </div>
    </>
  );
}
