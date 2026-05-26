import { Link01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";

import type { ReportRow } from "@/components/reports/types";
import { formatDisplayDateTime } from "@/lib/dates";

/** Renders the single next action available for one report row. */
export function ReportAction({
  onPublish,
  onShare,
  report,
}: {
  readonly onPublish: () => void;
  readonly onShare: () => void;
  readonly report: ReportRow;
}) {
  const actionContext = `${report.title} updated ${formatDisplayDateTime(
    report.updatedAt
  )}`;

  if (report.status === "published") {
    return (
      <Button
        aria-label={`Share ${actionContext}`}
        onClick={onShare}
        size="sm"
        type="button"
        variant="outline"
      >
        <HugeIcons icon={Link01Icon} /> Share
      </Button>
    );
  }

  return (
    <Button
      aria-label={`Publish ${actionContext}`}
      onClick={onPublish}
      size="sm"
      type="button"
      variant="default"
    >
      <HugeIcons icon={Upload04Icon} /> Publish
    </Button>
  );
}
