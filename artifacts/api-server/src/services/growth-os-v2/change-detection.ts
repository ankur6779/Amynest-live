import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthObservatoryPayload } from "../growth-observatory/types.js";
import type { MetricChange } from "./types.js";
import {
  directionFromChange,
  isMeaningfulChange,
  pctChange,
  validateEvidence,
} from "./safety.js";

type MetricSpec = {
  id: string;
  metric: string;
  label: string;
  category: MetricChange["category"];
  current: number | null;
  yesterday: number | null;
  avg7d: number | null;
  avg30d: number | null;
  users: number;
  evidence: string;
  verified: boolean;
  negativeIsBad?: boolean;
};

function buildChange(spec: MetricSpec): MetricChange {
  const changeVsYesterday = pctChange(spec.current, spec.yesterday);
  const changeVs7d = pctChange(spec.current, spec.avg7d);
  const changeVs30d = pctChange(spec.current, spec.avg30d);
  const meaningful =
    isMeaningfulChange(changeVsYesterday, spec.users) ||
    isMeaningfulChange(changeVs7d, spec.users) ||
    isMeaningfulChange(changeVs30d, spec.users);

  const confidence = meaningful
    ? Math.min(95, 55 + Math.max(Math.abs(changeVs7d ?? 0), Math.abs(changeVsYesterday ?? 0)) * 1.2)
    : 40;

  return {
    id: `change_${spec.id}`,
    metric: spec.metric,
    label: spec.label,
    category: spec.category,
    current: spec.current,
    baseline7d: spec.avg7d,
    baseline30d: spec.avg30d,
    changeVsYesterdayPct: changeVsYesterday,
    changeVs7dPct: changeVs7d,
    changeVs30dPct: changeVs30d,
    direction: directionFromChange(changeVs7d ?? changeVsYesterday),
    meaningful,
    affectedUsers: spec.users,
    evidence: spec.evidence,
    status: validateEvidence({ verified: spec.verified, users: spec.users, confidence }),
  };
}

function avgFromSeries(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function yesterdayFromSeries(series: Array<{ day: string; value: number }>): number | null {
  if (series.length < 2) return null;
  return series[series.length - 2]?.value ?? null;
}

export function detectMeaningfulChanges(input: {
  observatory: GrowthObservatoryPayload;
  dashboard: GrowthDashboardPayload;
}): MetricChange[] {
  const { observatory, dashboard } = input;
  const funnel = observatory.funnel.stages;
  const install = funnel.find((f) => f.key === "install");
  const signup = funnel.find((f) => f.key === "signup");
  const routine = funnel.find((f) => f.key === "routine_completed");
  const trial = funnel.find((f) => f.key === "trial_started");
  const purchase = funnel.find((f) => f.key === "purchase");

  const dauSeries = observatory.historicalTrends.dau;
  const dau7 = avgFromSeries(dauSeries.slice(-7).map((d) => d.value));
  const dau30 = avgFromSeries(dauSeries.slice(-30).map((d) => d.value));
  const dauYesterday = yesterdayFromSeries(dauSeries);

  const specs: MetricSpec[] = [
    {
      id: "installs",
      metric: "installs",
      label: "Installs",
      category: "acquisition",
      current: install?.users ?? observatory.acquisition.installs.value,
      yesterday: install?.trendVsYesterday != null ? (install?.users ?? 0) : null,
      avg7d: install?.trendVs7d != null ? Math.round(((install?.users ?? 0) / (1 + (install.trendVs7d ?? 0) / 100)) * 10) / 10 : null,
      avg30d: install?.trendVs30d != null ? Math.round(((install?.users ?? 0) / (1 + (install.trendVs30d ?? 0) / 100)) * 10) / 10 : null,
      users: install?.users ?? 0,
      evidence: "analytics_events: device_registered",
      verified: (install?.users ?? 0) > 0,
    },
    {
      id: "signup_rate",
      metric: "signup_rate",
      label: "Signup Rate",
      category: "acquisition",
      current: observatory.acquisition.signupRate.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: signup?.users ?? 0,
      evidence: "funnel: install → signup conversion",
      verified: observatory.acquisition.signupRate.verified,
    },
    {
      id: "routine_generation",
      metric: "routine_generation",
      label: "Routine Generation",
      category: "activation",
      current: routine?.users ?? null,
      yesterday: routine?.trendVsYesterday != null && routine.users > 0
        ? Math.round(routine.users / (1 + routine.trendVsYesterday / 100))
        : null,
      avg7d: routine?.trendVs7d != null && routine.users > 0
        ? Math.round(routine.users / (1 + routine.trendVs7d / 100))
        : null,
      avg30d: routine?.trendVs30d != null && routine.users > 0
        ? Math.round(routine.users / (1 + routine.trendVs30d / 100))
        : null,
      users: routine?.users ?? 0,
      evidence: "analytics_events: routine_generated + routine_generation_completed",
      verified: (routine?.users ?? 0) > 0,
    },
    {
      id: "first_value_rate",
      metric: "first_value_rate",
      label: "First Value Rate",
      category: "activation",
      current: observatory.activation.metrics.firstValueAchievedPct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: funnel.find((f) => f.key === "first_value")?.users ?? 0,
      evidence: "analytics_events: first_value_achieved",
      verified: (funnel.find((f) => f.key === "first_value")?.users ?? 0) > 0,
    },
    {
      id: "d1",
      metric: "d1_retention",
      label: "D1 Retention",
      category: "retention",
      current: observatory.retention.d1.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.dau?.value ?? 0,
      evidence: "analytics_events: cohort day+1 activity",
      verified: observatory.retention.d1.value != null,
    },
    {
      id: "d3",
      metric: "d3_retention",
      label: "D3 Retention",
      category: "retention",
      current: observatory.retention.d3.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.dau?.value ?? 0,
      evidence: "analytics_events: cohort day+3 activity",
      verified: observatory.retention.d3.value != null,
    },
    {
      id: "d7",
      metric: "d7_retention",
      label: "D7 Retention",
      category: "retention",
      current: observatory.retention.d7.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.mau?.value ?? 0,
      evidence: "analytics_events: cohort day+7 activity",
      verified: observatory.retention.d7.value != null,
    },
    {
      id: "trial_starts",
      metric: "trial_starts",
      label: "Trial Starts",
      category: "revenue",
      current: trial?.users ?? observatory.revenue.trialStarted.value,
      yesterday: trial?.trendVsYesterday != null && (trial?.users ?? 0) > 0
        ? Math.round((trial!.users) / (1 + trial!.trendVsYesterday! / 100))
        : null,
      avg7d: trial?.trendVs7d != null && (trial?.users ?? 0) > 0
        ? Math.round((trial!.users) / (1 + trial!.trendVs7d! / 100))
        : null,
      avg30d: null,
      users: trial?.users ?? 0,
      evidence: "subscription_funnel_event trial_started",
      verified: (trial?.users ?? 0) > 0,
    },
    {
      id: "trial_conversion",
      metric: "trial_to_paid",
      label: "Trial → Paid",
      category: "revenue",
      current: observatory.revenue.trialToPaidPct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.subscriptions.trialUsers,
      evidence: "subscriptions: trial → paid conversion",
      verified: dashboard.subscriptions.trialUsers > 0,
    },
    {
      id: "purchase_success",
      metric: "purchase_success",
      label: "Purchase Success",
      category: "revenue",
      current: observatory.revenue.purchaseSuccessPct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: purchase?.users ?? 0,
      evidence: "subscription_funnel_event purchase_success vs purchase_failed",
      verified: observatory.revenue.purchaseSuccessPct.verified,
    },
    {
      id: "mrr",
      metric: "mrr",
      label: "MRR",
      category: "revenue",
      current: observatory.revenue.mrr.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.subscriptions.paidUsers,
      evidence: "subscriptions: active paid MRR estimate",
      verified: dashboard.subscriptions.paidUsers > 0,
    },
    {
      id: "crash_rate",
      metric: "crash_free",
      label: "Crash-Free Rate",
      category: "reliability",
      current: observatory.productHealth.crashFreePct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.appOpens?.value ?? 0,
      evidence: "crash_events vs app_open",
      verified: observatory.productHealth.crashFreePct.verified,
      negativeIsBad: true,
    },
    {
      id: "startup_failure",
      metric: "startup_failure",
      label: "Startup Failure",
      category: "reliability",
      current: observatory.productHealth.startupFailurePct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.appOpens?.value ?? 0,
      evidence: "startup_funnel_events",
      verified: observatory.productHealth.startupFailurePct.verified,
    },
    {
      id: "blank_screen",
      metric: "blank_screen",
      label: "Blank Screen",
      category: "reliability",
      current: observatory.productHealth.blankScreenPct.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: dashboard.kpis.appOpens?.value ?? 0,
      evidence: "startup_funnel_events blank_screen",
      verified: observatory.productHealth.blankScreenPct.verified,
    },
    {
      id: "api_failure",
      metric: "api_failure",
      label: "API Failures",
      category: "reliability",
      current: observatory.productHealth.apiFailureCount.value,
      yesterday: null,
      avg7d: null,
      avg30d: null,
      users: observatory.productHealth.apiFailureCount.value ?? 0,
      evidence: "analytics_events network_error + api errors",
      verified: true,
    },
    {
      id: "dau",
      metric: "dau",
      label: "DAU",
      category: "retention",
      current: observatory.retention.dau.value,
      yesterday: dauYesterday,
      avg7d: dau7,
      avg30d: dau30,
      users: observatory.retention.dau.value ?? 0,
      evidence: "analytics_events: daily active users",
      verified: observatory.retention.dau.value != null,
    },
  ];

  return specs
    .map(buildChange)
    .filter((c) => c.meaningful)
    .sort((a, b) => Math.abs(b.changeVs7dPct ?? 0) - Math.abs(a.changeVs7dPct ?? 0));
}
