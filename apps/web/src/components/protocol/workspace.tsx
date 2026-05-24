import { useAction, useMutation } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@repo/design-system/components/ui/tabs";
import { toastManager } from "@repo/design-system/components/ui/toast";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useState } from "react";
import { NewProtocolSheet } from "@/components/protocol/create";
import { InputPanel, ProtocolsList } from "@/components/protocol/panels";
import { ReviewEditor } from "@/components/protocol/review";
import {
  canEditInput,
  getPrimaryTask,
  getWorkflowTab,
  isWorkflowTab,
  optionalText,
  protocolNotes,
  type ReviewDraft,
  type ReviewState,
  reviewDraftChanged,
  reviewDraftFromItem,
  type WorkflowTab,
} from "@/components/protocol/utils";
import type {
  ProtocolReviewResult,
  ProtocolsResult,
} from "@/lib/confect-results";
import { getErrorMessage } from "@/lib/errors";

interface ProtocolWorkspaceProps {
  readonly protocols: ProtocolsResult;
  readonly review: ProtocolReviewResult;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
  readonly setSelectedProtocolId: (
    protocolId: GenericId<"protocols"> | null
  ) => void;
}

/** Coordinates one protocol through input, generation, review, and publish. */
export function ProtocolWorkspace(props: ProtocolWorkspaceProps) {
  const reviewState =
    props.review._tag === "Success" ? props.review.value : null;
  const protocolStatus = reviewState?.protocol.status;
  const initialActiveTab = getWorkflowTab({
    protocolStatus,
    selectedProtocolId: props.selectedProtocolId,
  });
  const reviewVersion =
    reviewState?.items
      .map((item) => `${item._id}:${item.updatedAt ?? item.createdAt}`)
      .join("|") ?? "empty";
  const workflowKey = `${props.selectedProjectId ?? "project:none"}:${props.selectedProtocolId ?? "protocol:none"}:${protocolStatus ?? "status:none"}:${reviewVersion}`;

  return (
    <ProtocolWorkspaceSession
      key={workflowKey}
      {...props}
      initialActiveTab={initialActiveTab}
      initialNotes={reviewState ? protocolNotes(reviewState.sources) : ""}
      initialReviewDrafts={reviewState?.items.map(reviewDraftFromItem) ?? []}
      protocolStatus={protocolStatus}
      reviewState={reviewState}
    />
  );
}

interface ProtocolWorkspaceSessionProps extends ProtocolWorkspaceProps {
  readonly initialActiveTab: WorkflowTab;
  readonly initialNotes: string;
  readonly initialReviewDrafts: readonly ReviewDraft[];
  readonly protocolStatus: string | undefined;
  readonly reviewState: ReviewState | null;
}

/** Keeps local editing state scoped to the selected protocol without render-time sync. */
function ProtocolWorkspaceSession({
  initialActiveTab,
  initialNotes,
  initialReviewDrafts,
  protocols,
  protocolStatus,
  review,
  reviewState,
  selectedProtocolId,
  selectedProjectId,
  setSelectedProtocolId,
}: ProtocolWorkspaceSessionProps) {
  const saveSource = useMutation(refs.public.protocols.saveSource);
  const updateReview = useMutation(refs.public.protocols.updateReview);
  const generateProtocol = useAction(refs.public.protocols.generate);
  const publishProtocol = useMutation(refs.public.protocols.publish);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [notes, setNotes] = useState(initialNotes);
  const [reviewDrafts, setReviewDrafts] = useState(() => initialReviewDrafts);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  const hasReviewItems = Boolean(reviewState?.items.length);
  const isReviewDirty = reviewState
    ? reviewDrafts.some((draft) => {
        const item = reviewState.items.find(
          (candidate) => candidate._id === draft.itemId
        );
        return item ? reviewDraftChanged(draft, item) : false;
      })
    : false;
  const primaryTask = getPrimaryTask({
    hasReviewItems,
    isGenerating,
    isPublishing,
    isReviewDirty,
    isSavingReview,
    protocolStatus,
    selectedProtocolId,
    selectedProjectId,
  });

  /** Persists protocol input and starts protocol generation. */
  function handleGenerate() {
    if (!selectedProtocolId) {
      return;
    }

    if (notes.trim().length === 0) {
      toastManager.add({
        title: "Notes required",
        description: "Add protocol notes before generating a protocol.",
        type: "warning",
      });
      return;
    }

    setIsGenerating(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const saveResult = yield* Effect.tryPromise({
          try: () =>
            saveSource({
              protocolId: selectedProtocolId,
              kind: "notes",
              text: notes,
            }),
          catch: getErrorMessage,
        });
        yield* Either.match(saveResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        const generateResult = yield* Effect.tryPromise({
          try: () => generateProtocol({ protocolId: selectedProtocolId }),
          catch: getErrorMessage,
        });
        yield* Either.match(generateResult, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        yield* Effect.sync(() => {
          toastManager.add({
            title: "Protocol ready",
            description: "Review generated items before publishing.",
            type: "success",
          });
          setActiveTab("review");
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Protocol was not generated",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsGenerating(false)))
      )
    );
  }

  /** Saves dirty generated review items before publishing. */
  function handleSaveReview() {
    if (!reviewState) {
      return;
    }

    const changedDrafts = changedReviewDrafts(reviewDrafts, reviewState.items);

    if (changedDrafts.length === 0) {
      return;
    }

    setIsSavingReview(true);
    return Effect.runPromise(
      saveChangedReviewDrafts(changedDrafts).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Review saved",
              description: "Publish when the protocol is ready.",
              type: "success",
            })
          )
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Review was not saved",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsSavingReview(false)))
      )
    );
  }

  /** Publishes reviewed protocol records into project memory and the ledger. */
  function handlePublish() {
    if (!selectedProtocolId) {
      return;
    }

    if (!(protocolStatus === "review" && hasReviewItems)) {
      toastManager.add({
        title: "Review first",
        description: "Generate and review the protocol before publishing.",
        type: "warning",
      });
      return;
    }

    setIsPublishing(true);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () => publishProtocol({ protocolId: selectedProtocolId }),
          catch: getErrorMessage,
        });
        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });

        yield* Effect.sync(() => {
          toastManager.add({
            title: "Protocol published",
            description: "Ledger rows and project intelligence are ready.",
            type: "success",
          });
          setActiveTab("protocols");
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Protocol was not published",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsPublishing(false)))
      )
    );
  }

  /** Runs the currently valid next step in the protocol workflow. */
  function handlePrimaryTask() {
    if (primaryTask.step === "generate") {
      handleGenerate();
      return;
    }

    if (primaryTask.step === "saveReview") {
      handleSaveReview();
      return;
    }

    if (primaryTask.step === "publish") {
      handlePublish();
    }
  }

  /** Updates one editable review item field in local form state. */
  function updateReviewDraft(
    itemId: GenericId<"protocolItems">,
    patch: Partial<ReviewDraft>
  ) {
    setReviewDrafts((drafts) =>
      drafts.map((draft) => {
        if (draft.itemId !== itemId) {
          return draft;
        }

        const next = { ...draft, ...patch };

        if (patch.kind && patch.kind !== "task") {
          next.responsibleParty = "";
          next.dueDate = "";
        }

        if (patch.kind && patch.kind !== "risk") {
          next.severity = "medium";
        }

        return next;
      })
    );
  }

  /** Persists edited review items sequentially so the first failure is visible. */
  function saveChangedReviewDrafts(drafts: readonly ReviewDraft[]) {
    return Effect.gen(function* () {
      for (const draft of drafts) {
        const result = yield* Effect.tryPromise({
          try: () =>
            updateReview({
              itemId: draft.itemId,
              kind: draft.kind,
              title: draft.title,
              body: draft.body,
              bauteil: optionalText(draft.bauteil),
              discipline: optionalText(draft.discipline),
              dueDate:
                draft.kind === "task" ? optionalText(draft.dueDate) : undefined,
              objectName: optionalText(draft.objectName),
              responsibleParty:
                draft.kind === "task"
                  ? optionalText(draft.responsibleParty)
                  : undefined,
              severity: draft.kind === "risk" ? draft.severity : undefined,
              status: draft.status,
            }),
          catch: getErrorMessage,
        });
        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: () => Effect.void,
        });
      }
    });
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Protocol Workspace</FrameTitle>
            <FrameDescription>
              Capture sources, review generated records, then publish memory.
            </FrameDescription>
          </div>
          <div className="flex min-h-9 min-w-44 justify-end">
            {primaryTask.step === "newProtocol" ? (
              <NewProtocolSheet
                disabled={primaryTask.disabled}
                onCreated={(protocolId) => {
                  setSelectedProtocolId(protocolId);
                }}
                selectedProjectId={selectedProjectId}
              />
            ) : (
              <Button
                disabled={primaryTask.disabled}
                loading={primaryTask.loading}
                onClick={handlePrimaryTask}
                size="sm"
                type="button"
              >
                <HugeIcons icon={primaryTask.icon} /> {primaryTask.label}
              </Button>
            )}
          </div>
        </div>
        {isGenerating || protocolStatus === "processing" ? (
          <p className="text-muted-foreground text-sm">
            Generating a structured protocol from saved sources.
          </p>
        ) : null}
      </FrameHeader>
      <FramePanel className="min-w-0 p-4">
        <Tabs
          onValueChange={(value) => {
            if (!isWorkflowTab(value)) {
              return;
            }

            setActiveTab(value);
          }}
          value={activeTab}
        >
          <TabsList className="max-w-full flex-wrap">
            <TabsTab value="input">Input</TabsTab>
            <TabsTab value="review">Review</TabsTab>
            <TabsTab value="protocols">Protocols</TabsTab>
          </TabsList>
          <TabsPanel value="input">
            <InputPanel
              canEdit={canEditInput(protocolStatus)}
              notes={notes}
              onNotesChange={setNotes}
              selectedProtocolId={selectedProtocolId}
            />
          </TabsPanel>
          <TabsPanel value="review">
            <ReviewEditor
              drafts={reviewDrafts}
              onDraftChange={updateReviewDraft}
              review={review}
            />
          </TabsPanel>
          <TabsPanel value="protocols">
            <ProtocolsList
              protocols={protocols}
              selectedProtocolId={selectedProtocolId}
              setSelectedProtocolId={setSelectedProtocolId}
            />
          </TabsPanel>
        </Tabs>
      </FramePanel>
    </Frame>
  );
}

/** Returns only edited review drafts for the current review state. */
function changedReviewDrafts(
  drafts: readonly ReviewDraft[],
  items: ReviewState["items"]
) {
  return drafts.filter((draft) => {
    const item = items.find((candidate) => candidate._id === draft.itemId);
    return item ? reviewDraftChanged(draft, item) : false;
  });
}
