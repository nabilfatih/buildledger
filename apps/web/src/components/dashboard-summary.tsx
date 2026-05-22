import {
  Badge,
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
  MeetingTrendChart,
} from "@repo/design-system";
import { useMemo } from "react";

import type { MemoryResult } from "@/lib/confect-results";

const demoTrend = [
  { week: "W18", openActions: 7, highRisks: 2, decisions: 3 },
  { week: "W19", openActions: 6, highRisks: 3, decisions: 5 },
  { week: "W20", openActions: 4, highRisks: 2, decisions: 6 },
  { week: "W21", openActions: 5, highRisks: 1, decisions: 8 },
];

/** Shows compact project memory totals and a small trend signal. */
export function DashboardSummary({
  memory,
}: {
  readonly memory: MemoryResult;
}) {
  const metrics = useMemo(() => {
    if (memory._tag !== "Success") {
      return {
        actions: 0,
        risks: 0,
        decisions: 0,
        trend: demoTrend,
      };
    }

    const actions = memory.value.actions.filter(
      (item) => item.status !== "done"
    ).length;
    const risks = memory.value.risks.filter(
      (risk) => risk.severity === "high"
    ).length;
    const decisions = memory.value.decisions.length;

    return {
      actions,
      risks,
      decisions,
      trend: [
        { week: "Live", openActions: actions, highRisks: risks, decisions },
      ],
    };
  }, [memory]);

  return (
    <Frame className="min-w-0">
      <FrameHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <FrameTitle>Project memory</FrameTitle>
            <FrameDescription>Published meeting intelligence.</FrameDescription>
          </div>
          <Badge variant="info">Live</Badge>
        </div>
      </FrameHeader>
      <FramePanel className="grid min-w-0 gap-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Actions" value={metrics.actions} />
          <Metric label="Risks" value={metrics.risks} />
          <Metric label="Decisions" value={metrics.decisions} />
        </div>
        <div className="min-w-0 [&_[data-slot=chart-container]]:h-40">
          <MeetingTrendChart data={metrics.trend} />
        </div>
      </FramePanel>
    </Frame>
  );
}

/** Displays one compact project memory metric. */
function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background px-3 py-2">
      <div className="truncate text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold text-lg leading-tight">{value}</div>
    </div>
  );
}
