import { Badge } from "@repo/design-system/components/ui/badge";

import {
  formatKind,
  formatSeverity,
  formatStatus,
  kindVariant,
  statusVariant,
} from "@/components/ledger/format";
import { formatDisplayDate } from "@/lib/dates";

/** Shows ledger item type using semantic COSS badge variants. */
export function KindBadge({ kind }: { readonly kind: string }) {
  return <Badge variant={kindVariant(kind)}>{formatKind(kind)}</Badge>;
}

/** Shows status with semantic color and consistent capitalization. */
export function StatusBadge({ status }: { readonly status: string }) {
  return <Badge variant={statusVariant(status)}>{formatStatus(status)}</Badge>;
}

/** Shows severity only when project memory has one. */
export function SeverityBadge({
  severity,
}: {
  readonly severity: string | null | undefined;
}) {
  if (!severity) {
    return <MutedValue fallback="No Severity" value={severity} />;
  }

  return (
    <Badge variant={severity === "high" ? "warning" : "outline"}>
      {formatSeverity(severity)}
    </Badge>
  );
}

/** Displays optional values without heavy badges. */
export function MutedValue({
  fallback,
  value,
}: {
  readonly fallback: string;
  readonly value: string | null | undefined;
}) {
  return (
    <span className={value ? undefined : "text-muted-foreground"}>
      {value ?? fallback}
    </span>
  );
}

/** Displays optional ISO date values as readable dates. */
export function DateValue({
  fallback,
  value,
}: {
  readonly fallback: string;
  readonly value: string | null | undefined;
}) {
  const displayDate = formatDisplayDate(value);

  return <MutedValue fallback={fallback} value={displayDate || undefined} />;
}
