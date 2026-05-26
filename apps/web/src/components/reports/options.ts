interface ReportStatusOption {
  readonly label: string;
  readonly value: string;
}

export const reportStatusOptions: readonly ReportStatusOption[] = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
] as const;
