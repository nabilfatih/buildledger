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

export interface LedgerFilterState {
  readonly endDate: string;
  readonly kind: string;
  readonly owner: string;
  readonly search: string;
  readonly severity: string;
  readonly source: string;
  readonly startDate: string;
  readonly status: string;
}

export type LedgerTable = Table<LedgerRow>;
