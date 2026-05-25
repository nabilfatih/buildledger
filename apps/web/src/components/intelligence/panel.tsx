import { useAction, useMutation, useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import type { GenericId } from "convex/values";
import { subDays } from "date-fns";
import { Effect, Either } from "effect";
import { useState } from "react";

import {
  type ShareTarget,
  shareArgs,
  shareLabelForTarget,
} from "@/components/intelligence/share";
import { IntelligenceToolbar } from "@/components/intelligence/toolbar";
import { formatDateInput } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

import { getShareLink, IntelligenceResults } from "./result";

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
  const generateReport = useAction(refs.public.reports.generate);
  const runInvestigation = useAction(refs.public.investigations.run);
  const publishReport = useMutation(refs.public.reports.publish);
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
  const [shareLabel, setShareLabel] = useState("Share Link");
  const [isAsking, setIsAsking] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isPublishingReport, setIsPublishingReport] = useState(false);
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
    setShareLabel("Share Link");
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
    setShareLabel("Share Link");
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
    setShareLabel("Share Link");
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

  /** Publishes the latest report draft into project memory. */
  function handlePublishReport() {
    if (!reportId) {
      toastManager.add({
        title: "Generate a report first",
        type: "warning",
      });
      return;
    }

    setIsPublishingReport(true);
    return Effect.runPromise(
      Effect.tryPromise({
        try: () => publishReport({ reportId }),
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
              title: "Report published",
              description: "The report is now part of project memory.",
              type: "success",
            })
          )
        ),
        Effect.catchAll((description) =>
          Effect.sync(() =>
            toastManager.add({
              title: "Report was not published",
              description,
              type: "error",
            })
          )
        ),
        Effect.ensuring(Effect.sync(() => setIsPublishingReport(false)))
      )
    );
  }

  /** Creates a read-only share token for a project resource. */
  function handleCreateShareLink(target: ShareTarget) {
    if (!selectedProjectId) {
      toastManager.add({
        title: "Select a project first",
        description: "Create or select a project before sharing.",
        type: "warning",
      });
      return;
    }

    if (target === "protocol" && !selectedProtocolId) {
      toastManager.add({
        title: "Select a protocol first",
        description: "Create or select a protocol before sharing.",
        type: "warning",
      });
      return;
    }

    if (target === "report" && !reportId) {
      toastManager.add({
        title: "Generate a report first",
        description: "A report share link needs a generated report.",
        type: "warning",
      });
      return;
    }

    setIsSharing(true);
    setAnswer(null);
    setInvestigationId(null);
    setShareLink(null);
    return Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            createShareLink(
              shareArgs(target, {
                projectId: selectedProjectId,
                protocolId: selectedProtocolId,
                reportId,
              })
            ),
          catch: getErrorMessage,
        });
        const share = yield* Either.match(result, {
          onLeft: (error) => Effect.fail(error.message),
          onRight: Effect.succeed,
        });

        yield* Effect.sync(() => {
          setShareLink(getShareLink(share.token));
          setShareLabel(shareLabelForTarget(target));
          toastManager.add({
            title: "Share Link Created",
            description: "Copy the read-only link when you are ready.",
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

        <IntelligenceToolbar
          hasReport={Boolean(reportId)}
          isAsking={isAsking}
          isInvestigating={isInvestigating}
          isPublishingReport={isPublishingReport}
          isReporting={isReporting}
          isSharing={isSharing}
          onAsk={handleAskProject}
          onInvestigate={handleRunInvestigation}
          onPublishReport={handlePublishReport}
          onReport={handleGenerateReport}
          onShare={handleCreateShareLink}
        />

        <IntelligenceResults
          answer={answer}
          investigation={investigation}
          investigationId={investigationId}
          onCopy={handleCopy}
          report={report}
          reportId={reportId}
          shareLabel={shareLabel}
          shareLink={shareLink}
        />
      </FramePanel>
    </Frame>
  );
}
