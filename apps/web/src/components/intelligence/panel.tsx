import { useAction, useMutation, useQuery } from "@confect/react";
import {
  Analytics01Icon,
  BubbleChatQuestionIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";
import type { GenericId } from "convex/values";
import { subDays } from "date-fns";
import { Effect, Either } from "effect";
import { useState } from "react";

import { formatDateInput } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

import { getShareLink, investigationSummary, ResultAlert } from "./result";

const defaultQuestion = "What changed about schedule and blockers?";

interface ProjectIntelligencePanelProps {
  readonly canUseProjectMemory: boolean;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly selectedProtocolId: GenericId<"protocols"> | null;
}

/** Runs project-level intelligence actions after protocols are published. */
export function ProjectIntelligencePanel(props: ProjectIntelligencePanelProps) {
  const resultKey = `${props.selectedProjectId ?? "project:none"}:${props.selectedProtocolId ?? "protocol:none"}`;

  return <ProjectIntelligenceSession key={resultKey} {...props} />;
}

/** Keeps generated intelligence results scoped to the active project protocol. */
function ProjectIntelligenceSession({
  canUseProjectMemory,
  selectedProtocolId,
  selectedProjectId,
}: ProjectIntelligencePanelProps) {
  const answerQuestion = useAction(refs.public.ai.answerProjectQuestion);
  const generateReport = useAction(refs.public.ai.generateProjectReport);
  const runInvestigation = useAction(refs.public.investigations.run);
  const createShareLink = useMutation(refs.public.shares.createReadOnlyLink);
  const reports = useQuery(
    refs.public.reports.listByProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );
  const investigations = useQuery(
    refs.public.investigations.listByProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );
  const [question, setQuestion] = useState(defaultQuestion);
  const [answer, setAnswer] = useState<string | null>(null);
  const [reportId, setReportId] = useState<GenericId<"reports"> | null>(null);
  const [investigationId, setInvestigationId] =
    useState<GenericId<"investigations"> | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const questionHelp = canUseProjectMemory
    ? "Ask cited questions from published project memory."
    : "Publish a protocol first so answers can cite project memory.";
  const report =
    reports._tag === "Success"
      ? reports.value.find((item) => item._id === reportId)
      : undefined;
  const investigation =
    investigations._tag === "Success"
      ? investigations.value.find((item) => item._id === investigationId)
      : undefined;

  /** Asks the project memory service for a cited answer. */
  function handleAskProject() {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before asking intelligence.",
        type: "warning",
      });
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish a protocol before asking project intelligence.",
        type: "warning",
      });
      return;
    }

    setIsAsking(true);
    setAnswer(null);
    setInvestigationId(null);
    setReportId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            answerQuestion({
              projectId: selectedProjectId,
              question,
            }),
          catch: getErrorMessage,
        });
        const projectAnswer = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setAnswer(projectAnswer.answer);
          toastManager.add({
            title: "Answer generated",
            type: "success",
          });
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Answer was not generated",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsAsking(false)))
      )
    );
  }

  /** Generates a weekly report draft from published project memory. */
  function handleGenerateReport() {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before generating a report.",
        type: "warning",
      });
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish a protocol before generating a project report.",
        type: "warning",
      });
      return;
    }

    setIsReporting(true);
    setAnswer(null);
    setInvestigationId(null);
    setReportId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const now = new Date();
        const result = yield* Effect.tryPromise({
          try: () =>
            generateReport({
              projectId: selectedProjectId,
              periodStart: formatDateInput(subDays(now, 7)),
              periodEnd: formatDateInput(now),
            }),
          catch: getErrorMessage,
        });
        const nextReportId = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setReportId(nextReportId);
          toastManager.add({
            title: "Report Draft Created",
            type: "success",
          });
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report was not generated",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsReporting(false)))
      )
    );
  }

  /** Runs a risk/root-cause investigation from published project memory. */
  function handleRunInvestigation() {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before running AI Detective.",
        type: "warning",
      });
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish a protocol before running AI Detective.",
        type: "warning",
      });
      return;
    }

    setIsInvestigating(true);
    setAnswer(null);
    setInvestigationId(null);
    setReportId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            runInvestigation({
              projectId: selectedProjectId,
              question,
            }),
          catch: getErrorMessage,
        });
        const nextInvestigationId = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setInvestigationId(nextInvestigationId);
          toastManager.add({
            title: "Investigation complete",
            type: "success",
          });
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Investigation was not completed",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsInvestigating(false)))
      )
    );
  }

  /** Creates a read-only share token for the active protocol. */
  function handleCreateShareLink() {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before sharing.",
        type: "warning",
      });
      return;
    }

    if (!selectedProtocolId) {
      toastManager.add({
        title: "Select a protocol first",
        description: "Create or select a protocol before sharing.",
        type: "warning",
      });
      return;
    }

    setIsSharing(true);
    setAnswer(null);
    setInvestigationId(null);
    setReportId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            createShareLink({
              projectId: selectedProjectId,
              protocolId: selectedProtocolId,
            }),
          catch: getErrorMessage,
        });
        const share = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setShareLink(getShareLink(share.token));
          toastManager.add({
            title: "Share Link Created",
            description: "Copy the read-only protocol link when you are ready.",
            type: "success",
          });
        });
      }).pipe(
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Share link was not created",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsSharing(false)))
      )
    );
  }

  /** Copies a generated token or identifier without rendering it inline. */
  function handleCopy(value: string) {
    if (!navigator.clipboard) {
      toastManager.add({
        title: "Clipboard unavailable",
        description: "Clipboard is not available in this browser.",
        type: "warning",
      });
      return;
    }

    return Effect.runPromise(
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(value),
        catch: () => undefined,
      }).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Copied",
              type: "success",
            })
          )
        ),
        Effect.catchAll(() =>
          Effect.sync(() =>
            toastManager.add({
              title: "Clipboard unavailable",
              description: "Clipboard is not available in this browser.",
              type: "warning",
            })
          )
        )
      )
    );
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Project Intelligence</FrameTitle>
            <FrameDescription>Answers, reports, and sharing.</FrameDescription>
          </div>
          <Badge variant="info">Cited Memory</Badge>
        </div>
      </FrameHeader>
      <FramePanel className="flex min-w-0 flex-col gap-4 p-4">
        <Fieldset className="grid gap-4">
          <FieldsetLegend className="sr-only">
            Project Intelligence Prompt
          </FieldsetLegend>
          <Field>
            <FieldLabel>Question</FieldLabel>
            <Textarea
              className="min-h-24"
              onChange={(event) => setQuestion(event.target.value)}
              value={question}
            />
            <FieldDescription>{questionHelp}</FieldDescription>
          </Field>
        </Fieldset>

        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              loading={isAsking}
              onClick={handleAskProject}
              size="sm"
              type="button"
            >
              <HugeIcons icon={BubbleChatQuestionIcon} /> Ask Project
            </Button>
            <Button
              loading={isInvestigating}
              onClick={handleRunInvestigation}
              size="sm"
              type="button"
              variant="secondary"
            >
              <HugeIcons icon={Analytics01Icon} /> AI Detective
            </Button>
            <Button
              loading={isReporting}
              onClick={handleGenerateReport}
              size="sm"
              type="button"
              variant="secondary"
            >
              <HugeIcons icon={Analytics01Icon} /> Generate Report
            </Button>
            <Button
              loading={isSharing}
              onClick={handleCreateShareLink}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeIcons icon={Link01Icon} /> Create Share Link
            </Button>
          </ToolbarGroup>
        </Toolbar>

        <div className="grid min-w-0 gap-2">
          {answer ? (
            <Alert variant="success">
              <AlertTitle>Answer</AlertTitle>
              <AlertDescription>
                <span className="break-words">{answer}</span>
              </AlertDescription>
            </Alert>
          ) : null}
          {reportId ? (
            <ResultAlert
              copyLabel="Copy Report"
              label="Report Draft"
              onCopy={() => handleCopy(report?.body ?? reportId)}
              value={report?.body ?? reportId}
            />
          ) : null}
          {investigationId ? (
            <ResultAlert
              copyLabel="Copy Investigation"
              label="AI Detective"
              onCopy={() =>
                handleCopy(
                  investigationSummary(investigation) ?? investigationId
                )
              }
              value={investigationSummary(investigation) ?? investigationId}
            />
          ) : null}
          {shareLink ? (
            <ResultAlert
              copyLabel="Copy Link"
              label="Share Link"
              onCopy={() => handleCopy(shareLink)}
              value={shareLink}
            />
          ) : null}
        </div>
      </FramePanel>
    </Frame>
  );
}
