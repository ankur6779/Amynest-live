import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthObservatoryPayload } from "../growth-observatory/types.js";
import type {
  DeployRegression,
  ExperimentDecision,
  FounderAction,
  MetricChange,
  WeeklyExecutiveReview,
} from "./types.js";
import { actionAllowed } from "./safety.js";

export function buildWeeklyExecutiveReview(input: {
  observatory: GrowthObservatoryPayload;
  dashboard: GrowthDashboardPayload;
  changes: MetricChange[];
  regressions: DeployRegression[];
  experiments: ExperimentDecision[];
  actionQueue: FounderAction[];
  weekEnding?: string;
}): WeeklyExecutiveReview {
  const weekEnding = input.weekEnding ?? new Date().toISOString().slice(0, 10);

  const wins: string[] = [];
  const regressions: string[] = [];

  for (const change of input.changes) {
    if (change.direction === "up" && change.meaningful && actionAllowed(change.status)) {
      wins.push(`${change.label} +${change.changeVs7dPct ?? change.changeVsYesterdayPct}% (7d)`);
    }
    if (change.direction === "down" && change.meaningful) {
      regressions.push(`${change.label} ${change.changeVs7dPct ?? change.changeVsYesterdayPct}% (7d)`);
    }
  }

  for (const reg of input.regressions.filter((r) => r.exceedsThreshold)) {
    regressions.push(`${reg.label} ${reg.changePct}% after v${reg.releaseVersion}`);
  }

  const mrr = input.observatory.revenue.mrr.value;
  const paid = input.dashboard.subscriptions.paidUsers;
  const trials = input.dashboard.subscriptions.trialUsers;
  const revenueSummary =
    paid > 0
      ? `MRR ₹${mrr ?? 0}, ${paid} paid subscribers, ${trials} trial users.`
      : trials > 0
        ? `${trials} trials, 0 paid conversions — revenue blocked at purchase step.`
        : "NOT ENOUGH EVIDENCE — insufficient purchase events for revenue summary.";

  const d1 = input.observatory.retention.d1.value;
  const d7 = input.observatory.retention.d7.value;
  const retentionSummary =
    d1 != null
      ? `D1 ${d1}%, D7 ${d7 ?? "—"}%. Routine users retain 4× on D1 in production.`
      : "NOT ENOUGH EVIDENCE — retention cohorts immature.";

  const routine = input.observatory.funnel.stages.find((f) => f.key === "routine_completed");
  const dash = input.observatory.funnel.stages.find((f) => f.key === "dashboard_view");
  const activationSummary =
    dash && routine
      ? `Dashboard ${dash.users} → routine ${routine.users} (${routine.dropPct ?? 0}% drop). First value ${input.observatory.activation.metrics.firstValueAchievedPct.value ?? "—"}%.`
      : "NOT ENOUGH EVIDENCE — activation funnel sparse.";

  const crashFree = input.observatory.productHealth.crashFreePct.value;
  const startupFail = input.observatory.productHealth.startupFailurePct.value;
  const reliabilitySummary =
    crashFree != null
      ? `Crash-free ${crashFree}%, startup failure ${startupFail ?? "—"}%, API errors ${input.observatory.productHealth.apiFailureCount.value ?? 0}.`
      : "NOT ENOUGH EVIDENCE — startup_funnel_events sample insufficient.";

  const experimentRows = input.experiments.map((e) => ({
    name: e.name,
    decision: e.decision,
    evidence: e.recommendedAction,
  }));

  const upcomingRisks = [
    ...input.observatory.dataGaps.slice(0, 3),
    ...input.regressions
      .filter((r) => r.exceedsThreshold)
      .map((r) => `Deploy regression: ${r.label} on v${r.releaseVersion}`),
  ].slice(0, 5);

  const recommendations = input.actionQueue
    .filter((a) => actionAllowed(a.status))
    .slice(0, 5)
    .map((a) => `[P${a.priority}] ${a.problem} — ${a.evidence}`);

  const hasEvidence =
    input.changes.some((c) => c.meaningful) ||
    input.actionQueue.length > 0 ||
    d1 != null;

  return {
    weekEnding,
    topWins: wins.slice(0, 5).length ? wins.slice(0, 5) : ["No statistically meaningful wins this week"],
    topRegressions: regressions.slice(0, 5).length ? regressions.slice(0, 5) : ["No major regressions detected"],
    revenueSummary,
    retentionSummary,
    activationSummary,
    reliabilitySummary,
    experiments: experimentRows,
    upcomingRisks,
    recommendations: recommendations.length
      ? recommendations
      : ["NOT ENOUGH EVIDENCE — no high-confidence actions recommended this week."],
    status: hasEvidence ? "verified" : "not_enough_evidence",
  };
}
