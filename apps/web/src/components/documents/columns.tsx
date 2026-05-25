import { Link02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { createColumnHelper } from "@tanstack/react-table";

import { DocumentStatusBadge } from "@/components/documents/badges";
import type { DocumentRow } from "@/components/documents/types";
import { MutedValue } from "@/components/ledger/badges";
import { formatDisplayDateTime } from "@/lib/dates";

const columnHelper = createColumnHelper<DocumentRow>();

export function documentColumns({
  attachingDocumentId,
  canAttachDocument,
  onAttachDocument,
}: {
  readonly attachingDocumentId: DocumentRow["_id"] | null;
  readonly canAttachDocument: boolean;
  readonly onAttachDocument: (row: DocumentRow) => void;
}) {
  return [
    columnHelper.accessor("fileName", {
      cell: ({ row }) => (
        <div className="grid min-w-0 gap-1">
          <span className="truncate font-medium">{row.original.fileName}</span>
          <MutedValue
            fallback="Unknown Type"
            value={row.original.mimeType ?? undefined}
          />
        </div>
      ),
      header: "Document",
      id: "fileName",
      size: 360,
    }),
    columnHelper.accessor("status", {
      cell: ({ row }) => <DocumentStatusBadge row={row.original} />,
      header: "Status",
      id: "status",
      size: 140,
    }),
    columnHelper.accessor("updatedAt", {
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">
          {formatDisplayDateTime(getValue())}
        </span>
      ),
      header: "Updated",
      id: "updatedAt",
      size: 200,
    }),
    columnHelper.display({
      cell: ({ row }) => {
        if (row.original.protocolId) {
          return <span className="text-muted-foreground">Attached</span>;
        }

        if (row.original.status !== "extracted") {
          return <span className="text-muted-foreground">Extract Text</span>;
        }

        return (
          <Button
            disabled={!canAttachDocument}
            loading={attachingDocumentId === row.original._id}
            onClick={() => onAttachDocument(row.original)}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeIcons icon={Link02Icon} /> Attach
          </Button>
        );
      },
      header: "Attach",
      id: "action",
      size: 180,
    }),
  ];
}
