import type { LedgerRow } from "@/components/ledger/types";
import { formatDisplayDate } from "@/lib/dates";

/** Formats enum values for consistent user-facing labels. */
export function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Formats ledger item types for badges and copied rows. */
export function formatKind(value: string) {
  return titleCase(value);
}

/** Formats workflow status values for badges and copied rows. */
export function formatStatus(value: string) {
  return titleCase(value);
}

/** Formats optional severity values without exposing raw nulls. */
export function formatSeverity(value: string | null | undefined) {
  return value ? titleCase(value) : "No Severity";
}

/** Maps ledger status to semantic COSS badge variants. */
export function statusVariant(value: string) {
  if (value === "done" || value === "recorded") {
    return "success";
  }

  if (value === "blocked") {
    return "warning";
  }

  return "outline";
}

/** Maps ledger type to semantic COSS badge variants. */
export function kindVariant(value: string) {
  if (value === "risk") {
    return "warning";
  }

  if (value === "decision") {
    return "success";
  }

  if (value === "task" || value === "question") {
    return "info";
  }

  return "outline";
}

/** Formats selected ledger rows for sharing outside the table. */
export function formatSelectedRows(rows: readonly LedgerRow[]) {
  return rows
    .map(
      (row) =>
        `${formatKind(row.kind)}: ${row.title}\nSource: ${row.sourceProtocolTitle} (${formatDisplayDate(row.sourceProtocolDate)})\nStatus: ${formatStatus(row.status)}`
    )
    .join("\n\n");
}
