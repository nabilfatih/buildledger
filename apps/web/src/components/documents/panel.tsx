import { QueryResult, useMutation } from "@confect/react";
import {
  File01Icon,
  Link02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useState } from "react";

import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import { titleCase } from "@/components/protocol/utils";
import type { DocumentsResult } from "@/lib/confect-results";
import { formatDisplayDateTime } from "@/lib/dates";
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
  const [selectedDocumentId, setSelectedDocumentId] =
    useState<GenericId<"sourceDocuments"> | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const selectedDocument =
    documents._tag === "Success"
      ? documents.value.page.find(
          (document) => document._id === selectedDocumentId
        )
      : undefined;
  const canAttachDocument = activeProtocolStatus === "draft";

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
          setSelectedDocumentId(documentId);
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
        if (selectedDocumentId) {
          const extractResult = yield* Effect.tryPromise({
            try: () =>
              extractText({
                documentId: selectedDocumentId,
                extractedText,
              }),
            catch: getErrorMessage,
          });

          yield* Either.match(extractResult, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: () => Effect.void,
          });

          return selectedDocumentId;
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
            setSelectedDocumentId(documentId);
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

  /** Saves extracted text and attaches the document to the active protocol. */
  function handleAttach() {
    if (!(canAttachDocument && selectedProtocolId && selectedDocumentId)) {
      toastManager.add({
        title: "Select a draft protocol and document first",
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
              documentId: selectedDocumentId,
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
              documentId: selectedDocumentId,
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
              disabled={!selectedProjectId || isUploading}
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
                !(canAttachDocument && selectedDocumentId && selectedProtocolId)
              }
              loading={isAttaching}
              onClick={handleAttach}
              size="sm"
              type="button"
            >
              <HugeIcons icon={Link02Icon} /> Attach to Protocol
            </Button>
          </ToolbarGroup>
        </Toolbar>

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
              <Table className="min-w-[48rem] table-fixed" variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-44">Updated</TableHead>
                    <TableHead className="w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentPage.page.map((document) => (
                    <TableRow
                      data-state={
                        selectedDocument?._id === document._id
                          ? "selected"
                          : undefined
                      }
                      key={document._id}
                    >
                      <TableCell className="min-w-0">
                        <span className="block truncate font-medium">
                          {document.fileName}
                        </span>
                        <span className="block truncate text-muted-foreground text-xs">
                          {document.mimeType ?? "Unknown Type"}
                        </span>
                      </TableCell>
                      <TableCell>{titleCase(document.status)}</TableCell>
                      <TableCell>
                        {formatDisplayDateTime(document.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            setSelectedDocumentId(document._id);
                            setExtractedText(document.extractedText ?? "");
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <HugeIcons icon={File01Icon} /> Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ),
        })}
      </FramePanel>
    </Frame>
  );
}
