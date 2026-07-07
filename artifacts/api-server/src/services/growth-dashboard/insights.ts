import type {
  FeatureMetric,
  FunnelStage,
  GrowthDashboardPayload,
  GrowthTimeRange,
  RetentionSummary,
} from "./types.js";

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function generateInsights(input: {
  range: GrowthTimeRange;
  funnel: FunnelStage[];
  features: FeatureMetric[];
  retention: RetentionSummary;
  previousRetention: RetentionSummary;
  kpis: GrowthDashboardPayload["kpis"];
}): Array<{ id: string; severity: "info" | "warning" | "positive"; message: string }> {
  const insights: Array<{ id: string; severity: "info" | "warning" | "positive"; message: string }> = [];

  const routineStage = input.funnel.find((f) => f.key === "routine_generated");
  if (routineStage?.trendPct != null && routineStage.trendPct <= -10) {
    insights.push({
      id: "routine_drop",
      severity: "warning",
      message: `Routine generation dropped ${Math.abs(routineStage.trendPct)}% vs prior period.`,
    });
  } else if (routineStage?.trendPct != null && routineStage.trendPct >= 10) {
    insights.push({
      id: "routine_up",
      severity: "positive",
      message: `Routine generation increased ${routineStage.trendPct}% vs prior period.`,
    });
  }

  const speech = input.features.find((f) => f.key === "speech_coach");
  if (speech?.trendPct != null && speech.trendPct >= 15) {
    insights.push({
      id: "speech_up",
      severity: "positive",
      message: `Speech Coach usage increased ${speech.trendPct}%.`,
    });
  }

  const nutrition = input.features.find((f) => f.key === "nutrition_hub");
  if (nutrition && nutrition.dau > 0) {
    const top = [...input.features].sort((a, b) => b.dau - a.dau)[0];
    if (top?.key === nutrition.key) {
      insights.push({
        id: "top_feature",
        severity: "info",
        message: `Highest performing feature in window: ${nutrition.label}.`,
      });
    }
  }

  const d7Change = pctChange(input.retention.d7, input.previousRetention.d7);
  if (d7Change != null && d7Change >= 5) {
    insights.push({
      id: "retention_up",
      severity: "positive",
      message: `D7 retention improved (${d7Change >= 0 ? "+" : ""}${d7Change}% vs prior window).`,
    });
  } else if (d7Change != null && d7Change <= -5) {
    insights.push({
      id: "retention_down",
      severity: "warning",
      message: `D7 retention declined ${Math.abs(d7Change)}% vs prior window.`,
    });
  }

  const trials = input.kpis.trialsStarted;
  if (trials.changePct != null && trials.changePct <= -15) {
    insights.push({
      id: "trials_down",
      severity: "warning",
      message: `Trials decreased ${Math.abs(trials.changePct)}% after recent product changes.`,
    });
  }

  const dau = input.kpis.dau;
  if (dau.changePct != null && dau.changePct >= 10) {
    insights.push({
      id: "dau_up",
      severity: "positive",
      message: `DAU grew ${dau.changePct}% in ${input.range.label}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable",
      severity: "info",
      message: "Metrics are stable in the selected window. No significant anomalies detected.",
    });
  }

  return insights.slice(0, 8);
}
