import type { Table } from "@tanstack/react-table";

import type { DocumentsResult } from "@/lib/confect-results";

export const documentPageSize = 8;

type QueryValue<Result> = Result extends {
  readonly _tag: "Success";
  readonly value: infer Value;
}
  ? Value
  : never;

export type DocumentRow = QueryValue<DocumentsResult>["page"][number];

export interface DocumentFilterState {
  readonly search: string;
  readonly status: string;
}

export type DocumentTable = Table<DocumentRow>;
