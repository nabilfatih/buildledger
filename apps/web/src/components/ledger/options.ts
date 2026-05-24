export const kindFilters = [
  { label: "All types", value: "all" },
  { label: "Task", value: "task" },
  { label: "Change", value: "change" },
  { label: "Information", value: "information" },
  { label: "Concern", value: "concern" },
  { label: "Obstruction", value: "obstruction" },
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
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Resolved", value: "resolved" },
  { label: "Recorded", value: "recorded" },
] as const;
