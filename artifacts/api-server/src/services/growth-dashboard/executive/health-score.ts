import type {
  BusinessHealth,
  BusinessHealthStatus,
  GrowthDashboardPayload,
  GrowthScore,
  GrowthScoreCategory,
} from "../types.js";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreFromTrend(changePct: number | null | undefined, goodWhenUp = true): number {
  if (changePct == null) return 50;
  const delta = goodWhenUp ? changePct : -changePct;
  if (delta >= 20) return 90;
  if (delta >= 10) return 75;
  if (delta >= 0) return 60;
  if (delta >= -10) return 45;
  if (delta >= -20) return 30;
  return 15;
}

function scoreFromRate(rate: number | null | undefined, targets: [number, number, number]): number {
  if (rate == null) return 40;
  const [good, ok, low] = targets;
  if (rate >= good) return 90;
  if (rate >= ok) return 70;
  if (rate >= low) return 50;
  return 25;
}

export function computeGrowthScore(input: {
  kpis: GrowthDashboardPayload["kpis"];
  funnel: GrowthDashboardPayload["funnel"];
  retention: GrowthDashboardPayload["retention"];
  performance: GrowthDashboardPayload["performance"];
  subscriptions: GrowthDashboardPayload["subscriptions"];
}): GrowthScore {
  const installTrend = input.kpis.downloads?.changePct;
  const newUserTrend = input.kpis.newUsers?.changePct;
  const acquisition = clamp((scoreFromTrend(installTrend) + scoreFromTrend(newUserTrend)) / 2);

  const routine = input.funnel.find((f) => f.key === "routine_generated");
  const onboarding = input.funnel.find((f) => f.key === "onboarding_completed");
  const install = input.funnel.find((f) => f.key === "install");
  const routineRate =
    install && install.users > 0 && routine
      ? (routine.users / install.users) * 100
      : null;
  const onboardingRate =
    install && install.users > 0 && onboarding
      ? (onboarding.users / install.users) * 100
      : null;
  const activation = clamp(
    (scoreFromRate(routineRate, [25, 15, 8]) + scoreFromRate(onboardingRate, [40, 25, 15])) / 2,
  );

  const dauTrend = input.kpis.dau?.changePct;
  const sessionsTrend = input.kpis.sessions?.changePct;
  const engagement = clamp((scoreFromTrend(dauTrend) + scoreFromTrend(sessionsTrend)) / 2);

  const retention = clamp(
    (scoreFromRate(input.retention.summary.d1, [15, 8, 4]) +
      scoreFromRate(input.retention.summary.d7, [12, 8, 5])) /
      2,
  );

  const revenueTrend = input.kpis.mrr?.changePct ?? input.kpis.subscriptionRevenue?.changePct;
  const trialTrend = input.kpis.trialsStarted?.changePct;
  const revenue = clamp(
    (scoreFromTrend(revenueTrend) +
      scoreFromRate(input.subscriptions.conversionPct, [15, 8, 3]) +
      scoreFromTrend(trialTrend)) /
      3,
  );

  const crashFree = input.performance.crashFreePct ?? input.kpis.crashFreePct?.value ?? null;
  const reliability = clamp(
    scoreFromRate(crashFree, [99, 97, 95]) -
      Math.min(30, (input.performance.crashCount ?? 0) * 2),
  );

  const categories: GrowthScoreCategory[] = [
    { key: "acquisition", label: "Acquisition", score: acquisition, weight: 0.2 },
    { key: "activation", label: "Activation", score: activation, weight: 0.25 },
    { key: "engagement", label: "Engagement", score: engagement, weight: 0.15 },
    { key: "retention", label: "Retention", score: retention, weight: 0.2 },
    { key: "revenue", label: "Revenue", score: revenue, weight: 0.15 },
    { key: "reliability", label: "Reliability", score: reliability, weight: 0.05 },
  ];

  const overall = clamp(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  return { overall, categories };
}

export function computeBusinessHealth(input: {
  growthScore: GrowthScore;
  kpis: GrowthDashboardPayload["kpis"];
  funnel: GrowthDashboardPayload["funnel"];
  retention: GrowthDashboardPayload["retention"];
  performance: GrowthDashboardPayload["performance"];
}): BusinessHealth {
  const reasons: string[] = [];
  const score = input.growthScore.overall;

  const routine = input.funnel.find((f) => f.key === "routine_generated");
  if (routine?.trendPct != null && routine.trendPct <= -10) {
    reasons.push(`Routine generation dropped ${Math.abs(routine.trendPct)}%.`);
  }

  if (input.retention.summary.d1 != null && input.retention.summary.d1 < 8) {
    reasons.push(`D1 retention is ${input.retention.summary.d1}% (below target).`);
  }

  if (input.performance.crashCount > 0 && (input.performance.crashFreePct ?? 100) < 97) {
    reasons.push(`Crash rate elevated (${input.performance.crashCount} crashes in window).`);
  }

  const trials = input.kpis.trialsStarted;
  if (trials.changePct != null && trials.changePct <= -15) {
    reasons.push(`Trials decreased ${Math.abs(trials.changePct)}%.`);
  }

  if (input.kpis.subscriptionRevenue?.changePct != null && input.kpis.subscriptionRevenue.changePct <= -10) {
    reasons.push(`Subscription revenue declined ${Math.abs(input.kpis.subscriptionRevenue.changePct)}%.`);
  }

  if (reasons.length === 0 && score >= 70) {
    reasons.push("Core metrics are within healthy ranges for the selected window.");
  }

  let status: BusinessHealthStatus = "healthy";
  if (score >= 80 && reasons.length <= 1) status = "excellent";
  else if (score >= 65) status = "healthy";
  else if (score >= 45) status = "warning";
  else status = "critical";

  if (
    (input.performance.crashFreePct != null && input.performance.crashFreePct < 95) ||
    (routine?.trendPct != null && routine.trendPct <= -20)
  ) {
    status = status === "excellent" ? "warning" : status === "healthy" ? "warning" : "critical";
  }

  return { status, score, reasons: reasons.slice(0, 6) };
}
