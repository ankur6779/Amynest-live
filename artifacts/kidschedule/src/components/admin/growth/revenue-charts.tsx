import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SeriesPoint } from "./types";

const chartConfig = {
  value: { label: "Value", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function MiniChart({ title, data, suffix = "" }: { title: string; data: SeriesPoint[]; suffix?: string }) {
  const formatted = data.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs font-semibold mb-2">{title}</p>
      {formatted.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No data in window</p>
      ) : (
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <AreaChart data={formatted} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={32} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${v}${suffix}`, ""]} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

type Charts = {
  dau: SeriesPoint[];
  wau: SeriesPoint[];
  revenue: SeriesPoint[];
  subscriptionGrowth: SeriesPoint[];
  featureUsage: SeriesPoint[];
  routineGenerated: SeriesPoint[];
  trialStarted: SeriesPoint[];
  subscriptionPurchased: SeriesPoint[];
  retention: SeriesPoint[];
  sessions: SeriesPoint[];
};

export function RevenueCharts({ charts }: { charts: Charts }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <MiniChart title="Daily Active Users" data={charts.dau} />
      <MiniChart title="Weekly Active Users (rolling)" data={charts.wau} />
      <MiniChart title="Sessions" data={charts.sessions} />
      <MiniChart title="Revenue Events" data={charts.revenue} />
      <MiniChart title="Subscription Growth" data={charts.subscriptionGrowth} />
      <MiniChart title="Feature Usage" data={charts.featureUsage} />
      <MiniChart title="Routine Generated" data={charts.routineGenerated} />
      <MiniChart title="Trial Started" data={charts.trialStarted} />
      <MiniChart title="Subscription Purchased" data={charts.subscriptionPurchased} />
      <MiniChart title="D1 Retention %" data={charts.retention} suffix="%" />
    </div>
  );
}
