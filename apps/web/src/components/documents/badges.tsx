import { Badge } from "@repo/design-system/components/ui/badge";

import {
  documentStatusLabel,
  documentStatusVariant,
} from "@/components/documents/format";
import type { DocumentRow } from "@/components/documents/types";

export function DocumentStatusBadge({ row }: { readonly row: DocumentRow }) {
  return (
    <Badge variant={documentStatusVariant(row)}>
      {documentStatusLabel(row)}
    </Badge>
  );
}
