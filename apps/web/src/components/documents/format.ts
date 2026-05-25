import type { badgeVariants } from "@repo/design-system/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

import type {
  DocumentFilterState,
  DocumentRow,
} from "@/components/documents/types";
import { titleCase } from "@/components/protocol/utils";

export function documentStatus(row: DocumentRow) {
  if (row.protocolId) {
    return "attached";
  }

  return row.status;
}

export function documentStatusLabel(row: DocumentRow) {
  return titleCase(documentStatus(row));
}

export function documentStatusVariant(
  row: DocumentRow
): VariantProps<typeof badgeVariants>["variant"] {
  const status = documentStatus(row);

  if (status === "attached") {
    return "success";
  }

  if (status === "extracted") {
    return "info";
  }

  return "outline";
}

export function matchesDocumentFilters(
  row: DocumentRow,
  filters: DocumentFilterState
) {
  const query = filters.search.trim().toLowerCase();
  const status = documentStatus(row);

  if (filters.status !== "all" && status !== filters.status) {
    return false;
  }

  if (!query) {
    return true;
  }

  return `${row.fileName} ${row.mimeType ?? ""} ${status}`
    .toLowerCase()
    .includes(query);
}
