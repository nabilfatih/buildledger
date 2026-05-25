import type { Table } from "@tanstack/react-table";

import type { LogbookResult } from "@/lib/confect-results";

export const logbookPageSize = 8;

type QueryValue<Result> = Result extends {
  readonly _tag: "Success";
  readonly value: infer Value;
}
  ? Value
  : never;

export type LogbookRow = QueryValue<LogbookResult>["page"][number];

export interface LogbookFilterState {
  readonly eventType: string;
  readonly responsible: string;
  readonly search: string;
  readonly trade: string;
}

export type LogbookTable = Table<LogbookRow>;
