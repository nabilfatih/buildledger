import { titleCase } from "@/components/ledger/format";

/** Formats logbook event values without exposing storage underscores. */
export function formatLogbookEvent(value: string) {
  return titleCase(value.replaceAll("_", " "));
}

/** Maps logbook events to semantic COSS badge variants. */
export function logbookEventVariant(value: string) {
  if (value === "risk_detected") {
    return "warning";
  }

  if (value === "status_changed" || value === "protocol_published") {
    return "success";
  }

  if (value === "assignment_changed" || value === "record_created") {
    return "info";
  }

  return "outline";
}
