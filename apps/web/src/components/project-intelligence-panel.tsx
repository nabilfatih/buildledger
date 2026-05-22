"use client";

import { useAction, useMutation } from "@confect/react";
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
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
  HugeIcons,
  Input,
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { useState } from "react";

const defaultQuestion = "What changed about schedule and blockers?";

/** Runs project-level intelligence actions after minutes are published. */
export function ProjectIntelligencePanel({
  selectedMeetingId,
  selectedProjectId,
  setNotice,
}: {
  readonly selectedMeetingId: GenericId<"meetings"> | null;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setNotice: (message: string | null) => void;
}) {
  const answerQuestion = useAction(refs.public.ai.answerProjectQuestion);
  const generateReport = useAction(refs.public.ai.generateProjectReport);
  const createShareLink = useMutation(refs.public.shares.createReadOnlyLink);
  const [question, setQuestion] = useState(defaultQuestion);
  const [answer, setAnswer] = useState<string | null>(null);
  const [reportId, setReportId] = useState<GenericId<"reports"> | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  /** Asks the project memory service for a cited answer. */
  async function handleAskProject() {
    if (!selectedProjectId) {
      return;
    }

    setNotice(null);
    const result = await answerQuestion({
      projectId: selectedProjectId,
      question,
    });

    if (result._tag === "Left") {
      setNotice(result.left.message);
      return;
    }

    setAnswer(result.right.answer);
  }

  /** Generates a weekly report draft from published project memory. */
  async function handleGenerateReport() {
    if (!selectedProjectId) {
      return;
    }

    setNotice(null);
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const result = await generateReport({
      projectId: selectedProjectId,
      periodStart: weekAgo.toISOString().slice(0, 10),
      periodEnd: now.toISOString().slice(0, 10),
    });

    if (result._tag === "Left") {
      setNotice(result.left.message);
      return;
    }

    setReportId(result.right);
  }

  /** Creates a read-only share token for the active meeting. */
  async function handleCreateShareLink() {
    if (!(selectedProjectId && selectedMeetingId)) {
      return;
    }

    setNotice(null);
    const result = await createShareLink({
      projectId: selectedProjectId,
      meetingId: selectedMeetingId,
    });

    if (result._tag === "Left") {
      setNotice(result.left.message);
      return;
    }

    setShareToken(result.right.token);
  }

  /** Copies a generated token or identifier without rendering it inline. */
  async function handleCopy(value: string) {
    if (!navigator.clipboard) {
      setNotice("Clipboard is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied.");
    } catch {
      setNotice("Clipboard is not available in this browser.");
    }
  }

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Project intelligence</FrameTitle>
            <FrameDescription>Answers, reports, and sharing.</FrameDescription>
          </div>
          <Badge variant="info">Cited</Badge>
        </div>
      </FrameHeader>
      <FramePanel className="flex min-w-0 flex-col gap-4 p-4">
        <Field>
          <FieldLabel>Question</FieldLabel>
          <Input
            disabled={!selectedProjectId}
            onChange={(event) => setQuestion(event.target.value)}
            value={question}
          />
          <FieldDescription>
            Publish minutes first so answers can cite project memory.
          </FieldDescription>
        </Field>

        <Toolbar className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Button
              disabled={!selectedProjectId}
              onClick={handleAskProject}
              size="sm"
            >
              <HugeIcons icon={BubbleChatQuestionIcon} /> Ask project
            </Button>
            <Button
              disabled={!selectedProjectId}
              onClick={handleGenerateReport}
              size="sm"
            >
              <HugeIcons icon={Analytics01Icon} /> Generate report
            </Button>
            <Button
              disabled={!(selectedProjectId && selectedMeetingId)}
              onClick={handleCreateShareLink}
              size="sm"
              variant="secondary"
            >
              <HugeIcons icon={Link01Icon} /> Share
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
              label="Report draft"
              onCopy={() => handleCopy(reportId)}
              value={reportId}
            />
          ) : null}
          {shareToken ? (
            <ResultAlert
              label="Share token"
              onCopy={() => handleCopy(shareToken)}
              value={shareToken}
            />
          ) : null}
        </div>
      </FramePanel>
    </Frame>
  );
}

/** Shows a copyable identifier without letting long tokens break layout. */
function ResultAlert({
  label,
  onCopy,
  value,
}: {
  readonly label: string;
  readonly onCopy: () => void;
  readonly value: string;
}) {
  return (
    <Alert variant="success">
      <AlertTitle>{label}</AlertTitle>
      <AlertDescription>
        <code className="block max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
          {shortIdentifier(value)}
        </code>
      </AlertDescription>
      <AlertAction>
        <Button onClick={onCopy} size="sm" type="button" variant="outline">
          <HugeIcons icon={ClipboardCopyIcon} /> Copy
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** Shortens generated ids and tokens for display only. */
function shortIdentifier(value: string) {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
