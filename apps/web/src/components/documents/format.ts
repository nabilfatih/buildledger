import type { badgeVariants } from "@repo/design-system/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

import type { DocumentRow } from "@/components/documents/types";
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
