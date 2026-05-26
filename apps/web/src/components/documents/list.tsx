import { QueryResult } from "@confect/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";

import { DocumentsDataTable } from "@/components/documents/data";
import type { DocumentTable } from "@/components/documents/types";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import type { DocumentsResult } from "@/lib/confect-results";

interface DocumentListProps {
  readonly documents: DocumentsResult;
  readonly table: DocumentTable;
}

/** Renders the source document table without mixing query state into the page. */
export function DocumentList({ documents, table }: DocumentListProps) {
  return QueryResult.match(documents, {
    onLoading: () => <WorkflowPanelSkeleton />,
    onFailure: (error) => (
      <Empty className="min-h-48">
        <EmptyHeader>
          <EmptyTitle>Documents unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
    onSuccess: (documentPage) =>
      documentPage.page.length === 0 ? (
        <Empty className="min-h-48">
          <EmptyHeader>
            <EmptyTitle>No source documents yet</EmptyTitle>
            <EmptyDescription>
              Upload a document or paste extracted text for the active protocol.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DocumentsDataTable table={table} />
      ),
  });
}
