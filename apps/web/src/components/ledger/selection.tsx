import { ClipboardCopyIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";

/** Shows the concrete action available after rows are selected. */
export function SelectionActions({
  isResolving,
  onClearSelection,
  onCopySelectedRows,
  onResolveSelectedRows,
  selectedCount,
}: {
  readonly isResolving: boolean;
  readonly onClearSelection: () => void;
  readonly onCopySelectedRows: () => void;
  readonly onResolveSelectedRows: () => void;
  readonly selectedCount: number;
}) {
  if (selectedCount === 0) {
    return <p className="text-muted-foreground text-sm">0 Selected</p>;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-muted-foreground text-sm">{selectedCount} Selected</p>
      <Button
        onClick={onCopySelectedRows}
        size="sm"
        type="button"
        variant="outline"
      >
        <HugeIcons icon={ClipboardCopyIcon} />
        Copy Selected
      </Button>
      <Button
        loading={isResolving}
        onClick={onResolveSelectedRows}
        size="sm"
        type="button"
        variant="secondary"
      >
        <HugeIcons icon={Tick02Icon} />
        Mark Resolved
      </Button>
      <Button
        onClick={onClearSelection}
        size="sm"
        type="button"
        variant="ghost"
      >
        Clear
      </Button>
    </div>
  );
}
