import { Badge } from "@repo/design-system/components/ui/badge";

import {
  formatLogbookEvent,
  logbookEventVariant,
} from "@/components/logbook/format";

/** Shows logbook events with semantic COSS badge variants. */
export function LogbookEventBadge({
  eventType,
}: {
  readonly eventType: string;
}) {
  return (
    <Badge variant={logbookEventVariant(eventType)}>
      {formatLogbookEvent(eventType)}
    </Badge>
  );
}
