import {
  AiSearchIcon,
  Analytics01Icon,
  BubbleChatQuestionIcon,
  Link01Icon,
  Share02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@repo/design-system/components/ui/menu";
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
          <HugeIcons icon={BubbleChatQuestionIcon} /> Ask
        </Button>
        <Button
          loading={isInvestigating}
          onClick={onInvestigate}
          size="sm"
          type="button"
          variant="secondary"
        >
          <HugeIcons icon={AiSearchIcon} /> Investigate
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
        <ShareMenu
          hasReport={hasReport}
          isSharing={isSharing}
          onShare={onShare}
        />
      </ToolbarGroup>
    </Toolbar>
  );
}

/** Keeps all share targets behind one compact COSS menu action. */
function ShareMenu({
  hasReport,
  isSharing,
  onShare,
}: {
  readonly hasReport: boolean;
  readonly isSharing: boolean;
  readonly onShare: (target: ShareTarget) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            loading={isSharing}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <HugeIcons icon={Share02Icon} /> Share
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuItem onClick={() => onShare("protocol")}>
            <HugeIcons icon={Link01Icon} />
            Protocol
          </MenuItem>
          <MenuItem onClick={() => onShare("ledger")}>
            <HugeIcons icon={Link01Icon} />
            Ledger
          </MenuItem>
          <MenuItem onClick={() => onShare("logbook")}>
            <HugeIcons icon={Link01Icon} />
            Logbook
          </MenuItem>
          {hasReport ? (
            <MenuItem onClick={() => onShare("report")}>
              <HugeIcons icon={Link01Icon} />
              Report
            </MenuItem>
          ) : null}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
