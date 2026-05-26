import type { Table } from "@tanstack/react-table";

import type { ReportsResult } from "@/lib/confect-results";

export const reportPageSize = 8;

type QueryValue<Result> = Result extends {
  readonly _tag: "Success";
  readonly value: infer Value;
}
  ? Value
  : never;

export type ReportRow = QueryValue<ReportsResult>["page"][number];

export type ReportTable = Table<ReportRow>;
