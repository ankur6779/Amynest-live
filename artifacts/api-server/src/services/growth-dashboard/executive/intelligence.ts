import type {
  AmyInsight,
  FeatureMetric,
  FunnelStage,
  GrowthAlert,
  GrowthDashboardPayload,
  InsightPriority,
  Recommendation,
  RootCause,
} from "../types.js";

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function confidenceFromDelta(delta: number | null): number {
  if (delta == null) return 55;
  const abs = Math.abs(delta);
  if (abs >= 30) return 92;
  if (abs >= 20) return 85;
  if (abs >= 10) return 75;
  return 65;
}

function priorityFromDelta(delta: number | null, negativeIsBad = true): InsightPriority {
  if (delta == null) return "low";
  const bad = negativeIsBad ? delta < 0 : delta > 0;
  const abs = Math.abs(delta);
  if (bad && abs >= 20) return "critical";
  if (bad && abs >= 10) return "high";
  if (!bad && abs >= 15) return "medium";
  return "low";
}

export function generateAmyInsights(input: {
  funnel: FunnelStage[];
  features: FeatureMetric[];
  kpis: GrowthDashboardPayload["kpis"];
  retention: GrowthDashboardPayload["retention"];
  previousRetention: GrowthDashboardPayload["retention"];
}): AmyInsight[] {
  const insights: AmyInsight[] = [];

  const routine = input.funnel.find((f) => f.key === "routine_generated");
  if (routine && routine.trendPct != null) {
    const drop = routine.trendPct <= -10;
    if (drop || routine.trendPct >= 10) {
      insights.push({
        id: "insight_routine",
        priority: priorityFromDelta(routine.trendPct, true),
        title: drop ? "Routine generation decreased" : "Routine generation increased",
        description: drop
          ? `Routine generation decreased ${Math.abs(routine.trendPct)}% vs the prior period.`
          : `Routine generation increased ${routine.trendPct}% vs the prior period.`,
        affectedUsers: routine.users,
        trendPct: routine.trendPct,
        confidence: confidenceFromDelta(routine.trendPct),
        suggestedAction: drop
          ? "Review latest onboarding changes and finish→generate routing."
          : "Double down on the activation path driving routine creation.",
      });
    }
  }

  const onboarding = input.funnel.find((f) => f.key === "onboarding_completed");
  if (onboarding?.trendPct != null && onboarding.trendPct <= -10) {
    insights.push({
      id: "insight_onboarding",
      priority: priorityFromDelta(onboarding.trendPct, true),
      title: "Onboarding completion declined",
      description: `Onboarding completions dropped ${Math.abs(onboarding.trendPct)}% in the selected window.`,
      affectedUsers: onboarding.users,
      trendPct: onboarding.trendPct,
      confidence: confidenceFromDelta(onboarding.trendPct),
      suggestedAction: "Audit onboarding step drop-offs and reduce friction on high-abandon steps.",
    });
  }

  const speech = input.features.find((f) => f.key === "speech_coach");
  if (speech?.trendPct != null && speech.trendPct >= 15) {
    insights.push({
      id: "insight_speech",
      priority: "medium",
      title: "Speech Coach usage surged",
      description: `Speech Coach DAU increased ${speech.trendPct}% — strong engagement signal.`,
      affectedUsers: speech.dau,
      trendPct: speech.trendPct,
      confidence: confidenceFromDelta(speech.trendPct),
      suggestedAction: "Promote Speech Coach earlier in the parent journey.",
    });
  }

  const d7Change = pctChange(input.retention.summary.d7, input.previousRetention.summary.d7);
  if (d7Change != null && Math.abs(d7Change) >= 5) {
    insights.push({
      id: "insight_retention",
      priority: d7Change < 0 ? "high" : "medium",
      title: d7Change < 0 ? "D7 retention weakened" : "D7 retention improved",
      description:
        d7Change < 0
          ? `D7 retention declined ${Math.abs(d7Change)}% vs prior window.`
          : `D7 retention improved ${d7Change}% vs prior window.`,
      affectedUsers: 0,
      trendPct: d7Change,
      confidence: confidenceFromDelta(d7Change),
      suggestedAction:
        d7Change < 0
          ? "Trigger D1 win-back for finishers who did not generate a routine."
          : "Maintain retention loops; avoid regressing check-in and streak UX.",
    });
  }

  const trials = input.kpis.trialsStarted;
  if (trials.changePct != null && trials.changePct <= -15) {
    insights.push({
      id: "insight_trials",
      priority: "critical",
      title: "Trial starts decreased sharply",
      description: `Trials decreased ${Math.abs(trials.changePct)}% after recent product changes.`,
      affectedUsers: trials.value ?? 0,
      trendPct: trials.changePct,
      confidence: confidenceFromDelta(trials.changePct),
      suggestedAction: "Review paywall timing, trial auto-start rules, and onboarding deploys.",
    });
  }

  const crashFree = input.kpis.crashFreePct?.value;
  if (crashFree != null && crashFree < 97) {
    insights.push({
      id: "insight_crashes",
      priority: crashFree < 95 ? "critical" : "high",
      title: "Crash-free rate below target",
      description: `Crash-free rate is ${crashFree}% in the selected window.`,
      affectedUsers: input.kpis.appOpens?.value ?? 0,
      trendPct: input.kpis.crashFreePct?.changePct ?? null,
      confidence: 88,
      suggestedAction: "Investigate Android crash fingerprints and recent release adoption.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "insight_stable",
      priority: "low",
      title: "Metrics stable",
      description: "No significant anomalies detected in the selected window.",
      affectedUsers: 0,
      trendPct: null,
      confidence: 60,
      suggestedAction: "Continue monitoring acquisition quality and activation funnel.",
    });
  }

  const order: Record<InsightPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return insights.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 10);
}

export function generateRootCauses(input: {
  funnel: FunnelStage[];
  features: FeatureMetric[];
  kpis: GrowthDashboardPayload["kpis"];
  performance: GrowthDashboardPayload["performance"];
  retention: GrowthDashboardPayload["retention"];
}): RootCause[] {
  const causes: RootCause[] = [];

  const routine = input.funnel.find((f) => f.key === "routine_generated");
  const onboarding = input.funnel.find((f) => f.key === "onboarding_completed");

  if (
    routine?.trendPct != null &&
    routine.trendPct <= -10 &&
    onboarding?.trendPct != null &&
    onboarding.trendPct <= -5
  ) {
    causes.push({
      id: "rc_routine_onboarding",
      title: "Routine drop linked to onboarding decline",
      explanation:
        "Routine generation dropped after onboarding completion declined in the same window — activation leak is likely upstream of routine generation.",
      confidence: Math.min(95, confidenceFromDelta(routine.trendPct) + 5),
      metrics: ["onboarding_completed", "routine_generated"],
    });
  }

  const trials = input.kpis.trialsStarted;
  if (
    trials.changePct != null &&
    trials.changePct <= -10 &&
    input.performance.crashCount > 0
  ) {
    const androidHeavy =
      input.performance.crashCount >= 2;
    causes.push({
      id: "rc_trial_crashes",
      title: "Trial conversion pressure from reliability issues",
      explanation: androidHeavy
        ? "Trial starts declined while crash volume increased — reliability may be suppressing monetization intent."
        : "Trial volume softened alongside elevated error signals in the same period.",
      confidence: 78,
      metrics: ["trial_started", "crash_count", "error_captured"],
    });
  }

  const speech = input.features.find((f) => f.key === "speech_coach");
  const paid = input.kpis.paidSubscribers;
  if (
    speech?.trendPct != null &&
    speech.trendPct >= 15 &&
    paid.changePct != null &&
    paid.changePct >= 5
  ) {
    causes.push({
      id: "rc_speech_subs",
      title: "Subscription growth aligned with Speech Coach",
      explanation:
        "Paid subscriber growth coincided with increased Speech Coach usage — feature engagement may be driving upgrade intent.",
      confidence: 72,
      metrics: ["speech_coach_v2_session_start", "upgrade_completed"],
    });
  }

  const dau = input.kpis.dau;
  if (dau.changePct != null && dau.changePct <= -15) {
    causes.push({
      id: "rc_dau_drop",
      title: "Broad engagement contraction",
      explanation:
        "DAU fell sharply without a single funnel stage explaining the full drop — investigate acquisition quality and returning-user churn.",
      confidence: 70,
      metrics: ["dau", "app_open", "first_open"],
    });
  }

  return causes.slice(0, 6);
}

export function generateRecommendations(input: {
  campaigns: GrowthDashboardPayload["campaigns"];
  funnel: FunnelStage[];
  features: FeatureMetric[];
  kpis: GrowthDashboardPayload["kpis"];
  performance: GrowthDashboardPayload["performance"];
  retention: GrowthDashboardPayload["retention"];
}): Recommendation[] {
  const recs: Recommendation[] = [];

  if (input.campaigns.available && input.campaigns.rows.length > 0) {
    const top = input.campaigns.rows[0];
    if (top && top.installs > 0) {
      recs.push({
        id: "rec_campaign_scale",
        title: `Increase budget for ${top.campaign}`,
        description: `Top attributed campaign with ${top.installs} installs and ${top.routinePct ?? 0}% routine rate.`,
        impactScore: 85,
        category: "acquisition",
      });
    }
    const weak = input.campaigns.rows.find(
      (r) => r.installs >= 5 && (r.routinePct ?? 0) < 5,
    );
    if (weak) {
      recs.push({
        id: "rec_campaign_pause",
        title: `Pause or rework ${weak.campaign}`,
        description: `Low routine activation (${weak.routinePct ?? 0}%) despite ${weak.installs} installs.`,
        impactScore: 80,
        category: "acquisition",
      });
    }
  }

  const speech = input.features.find((f) => f.key === "speech_coach");
  if (speech && speech.dau > 0) {
    recs.push({
      id: "rec_speech_promote",
      title: "Promote Speech Coach earlier",
      description: `Speech Coach has ${speech.dau} active users with ${speech.trendPct ?? 0}% trend.`,
      impactScore: 72,
      category: "activation",
    });
  }

  if (input.performance.crashCount > 0) {
    recs.push({
      id: "rec_crash_investigate",
      title: "Investigate crash spike",
      description: `${input.performance.crashCount} crashes recorded in the selected window.`,
      impactScore: 90,
      category: "reliability",
    });
  }

  const onboarding = input.funnel.find((f) => f.key === "onboarding_completed");
  if (onboarding?.dropPct != null && onboarding.dropPct > 30) {
    recs.push({
      id: "rec_onboarding",
      title: "Improve onboarding completion",
      description: `Onboarding stage shows ${onboarding.dropPct}% drop from prior funnel step.`,
      impactScore: 88,
      category: "activation",
    });
  }

  if (input.retention.summary.d1 != null && input.retention.summary.d1 < 10) {
    recs.push({
      id: "rec_d1",
      title: "Address D1 retention leak",
      description: `D1 retention is ${input.retention.summary.d1}% — below survival threshold.`,
      impactScore: 86,
      category: "retention",
    });
  }

  return recs.sort((a, b) => b.impactScore - a.impactScore).slice(0, 8);
}

export function generateAlerts(input: {
  kpis: GrowthDashboardPayload["kpis"];
  retention: GrowthDashboardPayload["retention"];
  performance: GrowthDashboardPayload["performance"];
  subscriptions: GrowthDashboardPayload["subscriptions"];
}): GrowthAlert[] {
  const alerts: GrowthAlert[] = [];

  if ((input.performance.crashFreePct ?? 100) < 97 && input.performance.crashCount > 0) {
    alerts.push({
      id: "alert_crash",
      category: input.performance.crashFreePct != null && input.performance.crashFreePct < 95 ? "critical" : "warning",
      title: "Crash rate exceeded threshold",
      message: `${input.performance.crashCount} crashes; crash-free ${input.performance.crashFreePct ?? "—"}%.`,
    });
  }

  if (input.retention.summary.d1 != null && input.retention.summary.d1 < 8) {
    alerts.push({
      id: "alert_d1",
      category: "warning",
      title: "D1 retention below target",
      message: `D1 retention is ${input.retention.summary.d1}% in the selected window.`,
    });
  }

  const rev = input.kpis.subscriptionRevenue;
  if (rev.changePct != null && rev.changePct <= -15) {
    alerts.push({
      id: "alert_revenue",
      category: "warning",
      title: "Revenue below prior period",
      message: `Subscription revenue events down ${Math.abs(rev.changePct)}% vs prior period.`,
    });
  }

  if (input.subscriptions.conversionPct != null && input.subscriptions.conversionPct >= 10) {
    alerts.push({
      id: "alert_conversion_up",
      category: "info",
      title: "Subscription conversion improving",
      message: `Trial-to-paid conversion at ${input.subscriptions.conversionPct}%.`,
    });
  }

  if (input.kpis.dau.changePct != null && input.kpis.dau.changePct >= 10) {
    alerts.push({
      id: "alert_dau_up",
      category: "info",
      title: "DAU growth detected",
      message: `DAU increased ${input.kpis.dau.changePct}% vs prior period.`,
    });
  }

  return alerts.slice(0, 10);
}
