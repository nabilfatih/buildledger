interface DocumentStatusOption {
  readonly label: string;
  readonly value: string;
}

export const documentStatusOptions: readonly DocumentStatusOption[] = [
  { label: "All statuses", value: "all" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Extracted", value: "extracted" },
  { label: "Attached", value: "attached" },
];
