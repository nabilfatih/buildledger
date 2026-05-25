import {
  Analytics01Icon,
  BubbleChatQuestionIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";

import type { ShareTarget } from "@/components/intelligence/share";

/** Renders project intelligence actions with explicit labels. */
export function IntelligenceToolbar({
  hasReport,
  isAsking,
  isInvestigating,
  isPublishingReport,
  isReporting,
  isSharing,
  onAsk,
  onInvestigate,
  onPublishReport,
  onReport,
  onShare,
}: {
  readonly hasReport: boolean;
  readonly isAsking: boolean;
  readonly isInvestigating: boolean;
  readonly isPublishingReport: boolean;
  readonly isReporting: boolean;
  readonly isSharing: boolean;
  readonly onAsk: () => void;
  readonly onInvestigate: () => void;
  readonly onPublishReport: () => void;
  readonly onReport: () => void;
  readonly onShare: (target: ShareTarget) => void;
}) {
  return (
    <Toolbar className="flex-wrap">
      <ToolbarGroup className="flex-wrap">
        <Button loading={isAsking} onClick={onAsk} size="sm" type="button">
          <HugeIcons icon={BubbleChatQuestionIcon} /> Ask Project
        </Button>
        <Button
          loading={isInvestigating}
          onClick={onInvestigate}
          size="sm"
          type="button"
          variant="secondary"
        >
          <HugeIcons icon={Analytics01Icon} /> AI Detective
        </Button>
        <Button
          loading={isReporting}
          onClick={onReport}
          size="sm"
          type="button"
          variant="secondary"
        >
          <HugeIcons icon={Analytics01Icon} /> Generate Report
        </Button>
        {hasReport ? (
          <Button
            loading={isPublishingReport}
            onClick={onPublishReport}
            size="sm"
            type="button"
            variant="secondary"
          >
            <HugeIcons icon={Analytics01Icon} /> Publish Report
          </Button>
        ) : null}
        <Button
          loading={isSharing}
          onClick={() => onShare("protocol")}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeIcons icon={Link01Icon} /> Share Protocol
        </Button>
        <Button
          loading={isSharing}
          onClick={() => onShare("ledger")}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeIcons icon={Link01Icon} /> Share Ledger
        </Button>
        <Button
          loading={isSharing}
          onClick={() => onShare("logbook")}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeIcons icon={Link01Icon} /> Share Logbook
        </Button>
        {hasReport ? (
          <Button
            loading={isSharing}
            onClick={() => onShare("report")}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeIcons icon={Link01Icon} /> Share Report
          </Button>
        ) : null}
      </ToolbarGroup>
    </Toolbar>
  );
}
