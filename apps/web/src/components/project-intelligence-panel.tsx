import { useAction, useMutation, useQuery } from "@confect/react";
import {
  Analytics01Icon,
  BubbleChatQuestionIcon,
  ClipboardCopyIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertAction,
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

const defaultQuestion = "What changed about schedule and blockers?";

/** Runs project-level intelligence actions after minutes are published. */
export function ProjectIntelligencePanel({
  canUseProjectMemory,
  selectedMeetingId,
  selectedProjectId,
}: {
  readonly canUseProjectMemory: boolean;
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const answerQuestion = useAction(refs.public.ai.answerProjectQuestion);
  const generateReport = useAction(refs.public.ai.generateProjectReport);
  const createShareLink = useMutation(refs.public.shares.createReadOnlyLink);
  const reports = useQuery(
    refs.public.reports.listByProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );
  const [question, setQuestion] = useState(defaultQuestion);
  const [answer, setAnswer] = useState<string | null>(null);
  const [reportId, setReportId] = useState<GenericId<"reports"> | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canAskProject = Boolean(
    selectedProjectId && canUseProjectMemory && !isAsking
  );
  const canGenerateReport = Boolean(
    selectedProjectId && canUseProjectMemory && !isReporting
  );
  const canShareMeeting = Boolean(
    selectedProjectId && selectedMeetingId && !isSharing
  );
  const questionHelp = canUseProjectMemory
    ? "Ask cited questions from published project memory."
    : "Publish minutes first so answers can cite project memory.";
  const report =
    reports._tag === "Success"
      ? reports.value.find((item) => item._id === reportId)
      : undefined;

  /** Asks the project memory service for a cited answer. */
  function handleAskProject() {
    if (!selectedProjectId) {
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish minutes before asking project intelligence.",
        type: "warning",
      });
      return;
    }

    setIsAsking(true);
    setAnswer(null);
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

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: (projectAnswer) =>
            Effect.sync(() => {
              setAnswer(projectAnswer.answer);
              toastManager.add({
                title: "Answer generated",
                type: "success",
              });
            }),
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
      return;
    }

    if (!canUseProjectMemory) {
      toastManager.add({
        title: "Publish first",
        description: "Publish minutes before generating a project report.",
        type: "warning",
      });
      return;
    }

    setIsReporting(true);
    setAnswer(null);
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

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: (nextReportId) =>
            Effect.sync(() => {
              setReportId(nextReportId);
              toastManager.add({
                title: "Report Draft Created",
                type: "success",
              });
            }),
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

  /** Creates a read-only share token for the active meeting. */
  function handleCreateShareLink() {
    if (!(selectedProjectId && selectedMeetingId)) {
      return;
    }

    setIsSharing(true);
    setAnswer(null);
    setReportId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            createShareLink({
              projectId: selectedProjectId,
              meetingId: selectedMeetingId,
            }),
          catch: getErrorMessage,
        });

        yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: (share) =>
            Effect.sync(() => {
              setShareLink(getShareLink(share.token));
              toastManager.add({
                title: "Share Link Created",
                description:
                  "Copy the read-only meeting link when you are ready.",
                type: "success",
              });
            }),
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
              disabled={!selectedProjectId}
              onChange={(event) => setQuestion(event.target.value)}
              value={question}
            />
            <FieldDescription>{questionHelp}</FieldDescription>
          </Field>
        </Fieldset>

        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              disabled={!canAskProject}
              loading={isAsking}
              onClick={handleAskProject}
              size="sm"
              type="button"
            >
              <HugeIcons icon={BubbleChatQuestionIcon} /> Ask Project
            </Button>
            <Button
              disabled={!canGenerateReport}
              loading={isReporting}
              onClick={handleGenerateReport}
              size="sm"
              type="button"
              variant="secondary"
            >
              <HugeIcons icon={Analytics01Icon} /> Generate Report
            </Button>
            <Button
              disabled={!canShareMeeting}
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

/** Shows a copyable identifier without letting long tokens break layout. */
function ResultAlert({
  copyLabel,
  label,
  onCopy,
  value,
}: {
  readonly copyLabel: string;
  readonly label: string;
  readonly onCopy: () => void;
  readonly value: string;
}) {
  return (
    <Alert variant="success">
      <AlertTitle>{label}</AlertTitle>
      <AlertDescription>
        <span className="line-clamp-4 whitespace-pre-wrap break-words text-xs">
          {value.length > 120 ? value : shortIdentifier(value)}
        </span>
      </AlertDescription>
      <AlertAction>
        <Button onClick={onCopy} size="sm" type="button" variant="outline">
          <HugeIcons icon={ClipboardCopyIcon} /> {copyLabel}
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** Builds a public share URL from the current deployment origin. */
function getShareLink(token: string) {
  const url = new URL("/share", window.location.origin);
  url.searchParams.set("token", token);

  return url.toString();
}

/** Shortens generated ids and tokens for display only. */
function shortIdentifier(value: string) {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
