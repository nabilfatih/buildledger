import {
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MeetingTrendChart,
} from "@repo/design-system";
import { Brain } from "lucide-react";
import { useMemo } from "react";

import type { MemoryResult } from "@/lib/confect-results";

const demoTrend = [
  { week: "W18", openActions: 7, highRisks: 2, decisions: 3 },
  { week: "W19", openActions: 6, highRisks: 3, decisions: 5 },
  { week: "W20", openActions: 4, highRisks: 2, decisions: 6 },
  { week: "W21", openActions: 5, highRisks: 1, decisions: 8 },
];

/** Shows realtime project memory totals and the meeting trend chart. */
export function DashboardSummary({
  memory,
}: {
  readonly memory: MemoryResult;
}) {
  const data = useMemo(() => {
    if (memory._tag !== "Success") {
      return demoTrend;
    }

    return [
      {
        week: "Live",
        openActions: memory.value.actions.filter(
          (item) => item.status !== "done"
        ).length,
        highRisks: memory.value.risks.filter((risk) => risk.severity === "high")
          .length,
        decisions: memory.value.decisions.length,
      },
    ];
  }, [memory]);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl">Project memory</h2>
          <Badge variant="info">Realtime from Convex</Badge>
        </div>
        <MeetingTrendChart data={data} />
      </div>
      <Empty className="justify-center">
        <EmptyHeader>
          <EmptyMedia>
            <Brain />
          </EmptyMedia>
          <EmptyTitle>Ask with citations</EmptyTitle>
          <EmptyDescription>
            Published minutes become memory chunks, vectors, actions, decisions,
            and risks before answers are generated.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
}
