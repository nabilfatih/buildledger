export const kindFilters = [
  { label: "All types", value: "all" },
  { label: "Action", value: "action" },
  { label: "Decision", value: "decision" },
  { label: "Risk", value: "risk" },
  { label: "Discussion", value: "discussion" },
  { label: "Question", value: "question" },
] as const;

export const severityFilters = [
  { label: "All severities", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
] as const;

export const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
  { label: "Recorded", value: "recorded" },
] as const;
