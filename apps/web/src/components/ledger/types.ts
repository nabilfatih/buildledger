import type { Table } from "@tanstack/react-table";

import type { RecordsResult } from "@/lib/confect-results";

export const ledgerPageSize = 8;

type QueryValue<Result> = Result extends {
  readonly _tag: "Success";
  readonly value: infer Value;
}
  ? Value
  : never;

export type LedgerRow = QueryValue<RecordsResult>["page"][number];

export type LedgerTable = Table<LedgerRow>;
