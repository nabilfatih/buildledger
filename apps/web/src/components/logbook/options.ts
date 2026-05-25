interface EventFilterOption {
  readonly label: string;
  readonly value: string;
}

export const eventFilters: readonly EventFilterOption[] = [
  { label: "All events", value: "all" },
  { label: "Protocol Published", value: "protocol_published" },
  { label: "Record Created", value: "record_created" },
  { label: "Status Changed", value: "status_changed" },
  { label: "Assignment Changed", value: "assignment_changed" },
  { label: "Risk Detected", value: "risk_detected" },
] as const;
