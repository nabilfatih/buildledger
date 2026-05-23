import {
  EvilLineChart,
  Grid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "@repo/design-system/components/evilcharts/charts/line-chart";
import type { ChartConfig } from "@repo/design-system/components/evilcharts/ui/chart";

export interface MeetingTrendPoint extends Record<string, unknown> {
  readonly decisions: number;
  readonly highRisks: number;
  readonly openActions: number;
  readonly week: string;
}

const chartConfig = {
  openActions: {
    label: "Open actions",
    colors: {
      light: ["#111827"],
      dark: ["#f9fafb"],
    },
  },
  highRisks: {
    label: "High risks",
    colors: {
      light: ["#d97706"],
      dark: ["#fbbf24"],
    },
  },
  decisions: {
    label: "Decisions",
    colors: {
      light: ["#059669"],
      dark: ["#34d399"],
    },
  },
} satisfies ChartConfig;

/** Renders the project trend chart with Evil Charts primitives. */
export function MeetingTrendChart({
  data,
}: {
  readonly data: readonly MeetingTrendPoint[];
}) {
  return (
    <EvilLineChart
      animationType="left-to-right"
      className="h-64"
      config={chartConfig}
      data={[...data]}
      xDataKey="week"
    >
      <Grid />
      <XAxis dataKey="week" />
      <YAxis allowDecimals={false} width={32} />
      <Tooltip />
      <Legend />
      <Line dataKey="openActions" />
      <Line dataKey="highRisks" />
      <Line dataKey="decisions" />
    </EvilLineChart>
  );
}
