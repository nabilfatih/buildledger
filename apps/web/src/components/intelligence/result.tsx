import { ClipboardCopyIcon } from "@hugeicons/core-free-icons";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";

/** Renders the current intelligence output without duplicating result UI. */
export function IntelligenceResults({
  answer,
  investigation,
  investigationId,
  onCopy,
  shareLabel,
  shareLink,
}: {
  readonly answer: string | null;
  readonly investigation:
    | {
        readonly detectedRisk: string;
        readonly likelyCause: string;
        readonly recommendedActionsJson: string;
      }
    | undefined;
  readonly investigationId: string | null;
  readonly onCopy: (value: string) => void;
  readonly shareLabel: string;
  readonly shareLink: string | null;
}) {
  const investigationValue = investigationSummary(investigation);

  return (
    <div className="grid min-w-0 gap-2">
      {answer ? (
        <Alert variant="success">
          <AlertTitle>Answer</AlertTitle>
          <AlertDescription>
            <span className="break-words">{answer}</span>
          </AlertDescription>
        </Alert>
      ) : null}
      {investigationId ? (
        <ResultAlert
          copyLabel="Copy Investigation"
          label="AI Detective"
          onCopy={() => onCopy(investigationValue ?? investigationId)}
          value={investigationValue ?? investigationId}
        />
      ) : null}
      {shareLink ? (
        <ResultAlert
          copyLabel="Copy Link"
          label={shareLabel}
          onCopy={() => onCopy(shareLink)}
          value={shareLink}
        />
      ) : null}
    </div>
  );
}

/** Shows a copyable intelligence result without letting long tokens break layout. */
export function ResultAlert({
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
export function getShareLink(token: string) {
  const url = new URL("/share", window.location.origin);
  url.searchParams.set("token", token);

  return url.toString();
}

/** Formats an investigation document as copyable plain text. */
export function investigationSummary(
  investigation:
    | {
        readonly detectedRisk: string;
        readonly likelyCause: string;
        readonly recommendedActionsJson: string;
      }
    | undefined
) {
  if (!investigation) {
    return;
  }

  return [
    `Risk: ${investigation.detectedRisk}`,
    `Likely cause: ${investigation.likelyCause}`,
    `Recommended actions: ${investigation.recommendedActionsJson}`,
  ].join("\n");
}

/** Shortens generated ids and tokens for display only. */
function shortIdentifier(value: string) {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
