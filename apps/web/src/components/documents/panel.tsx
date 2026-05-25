import { QueryResult, useMutation } from "@confect/react";
import { Link02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useMemo, useState } from "react";

import { documentColumns } from "@/components/documents/columns";
import { DocumentsDataTable } from "@/components/documents/data";
import { DocumentFilters } from "@/components/documents/filters";
import { matchesDocumentFilters } from "@/components/documents/format";
import {
  type DocumentRow,
  documentPageSize,
} from "@/components/documents/types";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import type { DocumentsResult } from "@/lib/confect-results";
import { getErrorMessage } from "@/lib/errors";

import { readTextPreview, uploadFile } from "./upload";

/** Manages uploaded protocol source documents and extracted source text. */
export function DocumentsPanel({
  activeProtocolStatus,
  documents,
  selectedProjectId,
  selectedProtocolId,
}: {
  readonly activeProtocolStatus: string | undefined;
  readonly documents: DocumentsResult;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
}) {
  const createUploadUrl = useMutation(refs.public.documents.createUploadUrl);
  const saveSourceDocument = useMutation(
    refs.public.documents.saveSourceDocument
  );
  const extractText = useMutation(refs.public.documents.extractText);
  const attachDocument = useMutation(refs.public.protocols.attachDocument);
  const [currentDocumentId, setCurrentDocumentId] =
    useState<GenericId<"sourceDocuments"> | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachingDocumentId, setAttachingDocumentId] =
    useState<GenericId<"sourceDocuments"> | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: documentPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);
  const canAttachDocument = activeProtocolStatus === "draft";
  const rows = documents._tag === "Success" ? documents.value.page : [];
  const currentDocument = rows.find(
    (document) => document._id === currentDocumentId
  );
  const filters = useMemo(() => ({ search, status }), [search, status]);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesDocumentFilters(row, filters)),
    [filters, rows]
  );
  const columns = documentColumns({
    attachingDocumentId,
    canAttachDocument,
    onAttachDocument: handleAttachExistingDocument,
  });
  const table = useReactTable({
    columns,
    data: filteredRows,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row._id,
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
  });

  /** Uploads one source file to Convex storage and registers it as a document. */
  function handleFile(file: File | undefined) {
    if (!(selectedProjectId && file)) {
      return;
    }

    setIsUploading(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const uploadUrlResult = yield* Effect.tryPromise({
          try: () => createUploadUrl({ projectId: selectedProjectId }),
          catch: getErrorMessage,
        });
        const uploadUrl = yield* Either.match(uploadUrlResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });
        const upload = yield* uploadFile({ file, uploadUrl });
        const preview = yield* readTextPreview(file);
        const documentResult = yield* Effect.tryPromise({
          try: () =>
            saveSourceDocument({
              projectId: selectedProjectId,
              protocolId: selectedProtocolId ?? undefined,
              fileName: file.name,
              mimeType: file.type || undefined,
              storageId: upload.storageId,
            }),
          catch: getErrorMessage,
        });
        const documentId = yield* Either.match(documentResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setCurrentDocumentId(documentId);
          setExtractedText(preview);
          toastManager.add({
            title: "Document uploaded",
            description: "Review extracted text before attaching it.",
            type: "success",
          });
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Document was not uploaded",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsUploading(false)))
      )
    );
  }

  /** Persists the current extracted document text. */
  function handleSaveText() {
    if (!extractedText.trim()) {
      toastManager.add({
        title: "Extracted text required",
        description: "Add source text before saving extraction.",
        type: "warning",
      });
      return;
    }

    setIsSavingText(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        if (currentDocument) {
          const extractResult = yield* Effect.tryPromise({
            try: () =>
              extractText({
                documentId: currentDocument._id,
                extractedText,
              }),
            catch: getErrorMessage,
          });

          yield* Either.match(extractResult, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: () => Effect.void,
          });

          return currentDocument._id;
        }

        if (!selectedProjectId) {
          return yield* Effect.fail(
            "Select a project before saving source text."
          );
        }

        const documentResult = yield* Effect.tryPromise({
          try: () =>
            saveSourceDocument({
              projectId: selectedProjectId,
              protocolId: selectedProtocolId ?? undefined,
              fileName: "Pasted source text",
              mimeType: "text/plain",
              extractedText,
            }),
          catch: getErrorMessage,
        });

        return yield* Either.match(documentResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });
      }).pipe(
        Effect.tap((documentId) =>
          Effect.sync(() => {
            setCurrentDocumentId(documentId);
            toastManager.add({
              title: "Extracted text saved",
              type: "success",
            });
          })
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Extracted text was not saved",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsSavingText(false)))
      )
    );
  }

  /** Saves extracted text and attaches the current source to the active protocol. */
  function handleAttachCurrentSource() {
    if (!(canAttachDocument && selectedProtocolId && currentDocument)) {
      toastManager.add({
        title: "Save source text first",
        description: "Attach source text after it has been saved.",
        type: "warning",
      });
      return;
    }

    if (!extractedText.trim()) {
      toastManager.add({
        title: "Extracted text required",
        description: "Add source text before attaching the document.",
        type: "warning",
      });
      return;
    }

    setIsAttaching(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const extractResult = yield* Effect.tryPromise({
          try: () =>
            extractText({
              documentId: currentDocument._id,
              extractedText,
            }),
          catch: getErrorMessage,
        });
        yield* Either.match(extractResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        const attachResult = yield* Effect.tryPromise({
          try: () =>
            attachDocument({
              documentId: currentDocument._id,
              protocolId: selectedProtocolId,
            }),
          catch: getErrorMessage,
        });
        yield* Either.match(attachResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        yield* Effect.sync(() =>
          toastManager.add({
            title: "Document attached",
            description: "The extracted text is now a protocol source.",
            type: "success",
          })
        );
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Document was not attached",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsAttaching(false)))
      )
    );
  }

  /** Attaches an existing extracted document without an intermediate selection step. */
  function handleAttachExistingDocument(document: DocumentRow) {
    if (!(canAttachDocument && selectedProtocolId)) {
      toastManager.add({
        title: "Draft protocol required",
        description:
          "Create or open a draft protocol before attaching sources.",
        type: "warning",
      });
      return;
    }

    if (!document.extractedText?.trim()) {
      toastManager.add({
        title: "Extracted text required",
        description: "Save extracted text before attaching this source.",
        type: "warning",
      });
      return;
    }

    setAttachingDocumentId(document._id);
    return Effect.runPromise(
      Effect.tryPromise({
        try: () =>
          attachDocument({
            documentId: document._id,
            protocolId: selectedProtocolId,
          }),
        catch: getErrorMessage,
      }).pipe(
        Effect.flatMap((result) =>
          Either.match(result, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: () => Effect.void,
          })
        ),
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Document attached",
              description: "The extracted text is now a protocol source.",
              type: "success",
            })
          )
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Document was not attached",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setAttachingDocumentId(null)))
      )
    );
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <FrameTitle>Documents</FrameTitle>
        <FrameDescription>
          Upload source files, save extracted text, and attach them to
          protocols.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="grid min-w-0 gap-4 p-4">
        <Fieldset className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <FieldsetLegend className="sr-only">
            Source Document Controls
          </FieldsetLegend>
          <Field>
            <FieldLabel>Source File</FieldLabel>
            <Input
              disabled={isUploading}
              onChange={(event) => {
                handleFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
              type="file"
            />
            <FieldDescription>
              Text files prefill extraction; other files can be pasted below.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Extracted Text</FieldLabel>
            <Textarea
              className="min-h-28"
              onChange={(event) => setExtractedText(event.target.value)}
              placeholder="Paste extracted document text before attaching it to a protocol."
              value={extractedText}
            />
          </Field>
        </Fieldset>

        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              disabled={!(selectedProjectId && extractedText.trim())}
              loading={isSavingText}
              onClick={handleSaveText}
              size="sm"
              type="button"
              variant="secondary"
            >
              <HugeIcons icon={Upload04Icon} /> Save Text
            </Button>
            <Button
              disabled={
                !(canAttachDocument && currentDocument && selectedProtocolId)
              }
              loading={isAttaching}
              onClick={handleAttachCurrentSource}
              size="sm"
              type="button"
            >
              <HugeIcons icon={Link02Icon} /> Attach Current Source
            </Button>
          </ToolbarGroup>
        </Toolbar>

        <DocumentFilters
          search={search}
          setSearch={setSearch}
          setStatus={setStatus}
          status={status}
        />
        {QueryResult.match(documents, {
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
                    Upload a document or paste extracted text for the active
                    protocol.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DocumentsDataTable table={table} />
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
