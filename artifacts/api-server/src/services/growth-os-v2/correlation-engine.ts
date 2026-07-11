import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthObservatoryPayload } from "../growth-observatory/types.js";
import type { MetricChange } from "./types.js";
import type { EvidenceChain } from "./types.js";
import { validateEvidence } from "./safety.js";

type CorrelationRule = {
  id: string;
  triggerMetrics: string[];
  chain: Array<{ metric: string; label: string; getValue: (ctx: CorrelationContext) => { value: number | null; changePct: number | null } }>;
  hypothesis: (ctx: CorrelationContext) => string;
  investigation: string;
};

type CorrelationContext = {
  observatory: GrowthObservatoryPayload;
  dashboard: GrowthDashboardPayload;
  changes: MetricChange[];
};

const RULES: CorrelationRule[] = [
  {
    id: "corr_routine_cta_visibility",
    triggerMetrics: ["routine_generation", "first_value_rate"],
    chain: [
      {
        metric: "routine_generation",
        label: "Routine generation",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "routine_completed")?.users ?? null,
          changePct: ctx.changes.find((c) => c.metric === "routine_generation")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "routine_cta",
        label: "Dashboard CTA clicks",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "routine_cta")?.users ?? null,
          changePct: ctx.observatory.funnel.stages.find((f) => f.key === "routine_cta")?.trendVs7d ?? null,
        }),
      },
      {
        metric: "dashboard_traffic",
        label: "Dashboard traffic",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "dashboard_view")?.users ?? null,
          changePct: ctx.observatory.funnel.stages.find((f) => f.key === "dashboard_view")?.trendVs7d ?? null,
        }),
      },
    ],
    hypothesis: (ctx) => {
      const routineDown = ctx.changes.find((c) => c.metric === "routine_generation")?.direction === "down";
      const cta = ctx.observatory.funnel.stages.find((f) => f.key === "routine_cta");
      const dash = ctx.observatory.funnel.stages.find((f) => f.key === "dashboard_view");
      const ctaDown = (cta?.trendVs7d ?? 0) < -10;
      const dashFlat = Math.abs(dash?.trendVs7d ?? 0) < 10;
      if (routineDown && ctaDown && dashFlat) {
        return "Routine generation ↓ while dashboard traffic unchanged → likely CTA visibility or placement issue, not traffic loss.";
      }
      if (routineDown && ctaDown) {
        return "Routine generation and CTA clicks both declined — activation friction upstream of generation.";
      }
      return "Routine generation changed — investigate CTA → generate path.";
    },
    investigation: "Compare routine_cta_clicked by source (hero vs nav) and first_value_hero CTR.",
  },
  {
    id: "corr_signup_activation",
    triggerMetrics: ["signup_rate", "installs"],
    chain: [
      {
        metric: "installs",
        label: "Installs",
        getValue: (ctx) => ({
          value: ctx.observatory.acquisition.installs.value,
          changePct: ctx.changes.find((c) => c.metric === "installs")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "signup_rate",
        label: "Signup rate",
        getValue: (ctx) => ({
          value: ctx.observatory.acquisition.signupRate.value,
          changePct: ctx.changes.find((c) => c.metric === "signup_rate")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "onboarding",
        label: "Onboarding completed",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "onboarding_completed")?.users ?? null,
          changePct: ctx.observatory.funnel.stages.find((f) => f.key === "onboarding_completed")?.trendVs7d ?? null,
        }),
      },
    ],
    hypothesis: (ctx) => {
      const installFlat = Math.abs(ctx.changes.find((c) => c.metric === "installs")?.changeVs7dPct ?? 0) < 10;
      const signupDown = ctx.changes.find((c) => c.metric === "signup_rate")?.direction === "down";
      if (installFlat && signupDown) {
        return "Installs stable but signup rate ↓ → auth/onboarding entry friction, not acquisition volume.";
      }
      return "Signup funnel changed — trace install → signup → onboarding completion.";
    },
    investigation: "Check pre_signup funnel and auth failure rate from startup_funnel_events.",
  },
  {
    id: "corr_retention_routine",
    triggerMetrics: ["d1", "d7", "routine_generation"],
    chain: [
      {
        metric: "d1",
        label: "D1 retention",
        getValue: (ctx) => ({
          value: ctx.observatory.retention.d1.value,
          changePct: ctx.changes.find((c) => c.metric === "d1")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "routine_generation",
        label: "Routine generators",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "routine_completed")?.users ?? null,
          changePct: ctx.changes.find((c) => c.metric === "routine_generation")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "second_session",
        label: "Second session",
        getValue: (ctx) => ({
          value: ctx.observatory.funnel.stages.find((f) => f.key === "second_session")?.users ?? null,
          changePct: ctx.observatory.funnel.stages.find((f) => f.key === "second_session")?.trendVs7d ?? null,
        }),
      },
    ],
    hypothesis: () =>
      "D1/D7 retention correlates with routine completion — routine users retain 4× on D1 in production cohorts.",
    investigation: "Segment retention by first_value_achieved vs dashboard-only users.",
  },
  {
    id: "corr_revenue_trial",
    triggerMetrics: ["trial_starts", "trial_conversion", "purchase_success"],
    chain: [
      {
        metric: "trial_starts",
        label: "Trial starts",
        getValue: (ctx) => ({
          value: ctx.observatory.revenue.trialStarted.value,
          changePct: ctx.changes.find((c) => c.metric === "trial_starts")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "trial_conversion",
        label: "Trial → paid",
        getValue: (ctx) => ({
          value: ctx.observatory.revenue.trialToPaidPct.value,
          changePct: ctx.changes.find((c) => c.metric === "trial_conversion")?.changeVs7dPct ?? null,
        }),
      },
      {
        metric: "purchase_success",
        label: "Purchase success",
        getValue: (ctx) => ({
          value: ctx.observatory.revenue.purchaseSuccessPct.value,
          changePct: ctx.changes.find((c) => c.metric === "purchase_success")?.changeVs7dPct ?? null,
        }),
      },
    ],
    hypothesis: (ctx) => {
      const trials = ctx.observatory.revenue.trialStarted.value ?? 0;
      const paid = ctx.dashboard.subscriptions.paidUsers;
      if (trials > 0 && paid === 0) {
        return "Trials exist but zero paid conversion — checkout or entitlement path blocked.";
      }
      return "Revenue funnel changed — trace trial → purchase_success events.";
    },
    investigation: "Inspect subscription_funnel_event purchase_failed reasons and upgrade_completed count.",
  },
  {
    id: "corr_reliability_activation",
    triggerMetrics: ["crash_rate", "startup_failure", "blank_screen"],
    chain: [
      {
        metric: "startup_failure",
        label: "Startup failure",
        getValue: (ctx) => ({
          value: ctx.observatory.productHealth.startupFailurePct.value,
          changePct: null,
        }),
      },
      {
        metric: "blank_screen",
        label: "Blank screen",
        getValue: (ctx) => ({
          value: ctx.observatory.productHealth.blankScreenPct.value,
          changePct: null,
        }),
      },
      {
        metric: "signup_rate",
        label: "Signup rate",
        getValue: (ctx) => ({
          value: ctx.observatory.acquisition.signupRate.value,
          changePct: ctx.changes.find((c) => c.metric === "signup_rate")?.changeVs7dPct ?? null,
        }),
      },
    ],
    hypothesis: () =>
      "Startup failures or blank screens may suppress downstream signup and activation without changing install volume.",
    investigation: "Correlate startup_funnel_events by platform and app_version with signup drop.",
  },
];

function linkDirection(changePct: number | null, value: number | null): "up" | "down" | "flat" | "unchanged" {
  if (value == null) return "unchanged";
  if (changePct == null || Math.abs(changePct) < 5) return "unchanged";
  return changePct > 0 ? "up" : "down";
}

export function buildEvidenceChains(input: {
  observatory: GrowthObservatoryPayload;
  dashboard: GrowthDashboardPayload;
  changes: MetricChange[];
}): EvidenceChain[] {
  const ctx: CorrelationContext = input;
  const triggered = new Set(input.changes.filter((c) => c.meaningful).map((c) => c.metric));

  const chains: EvidenceChain[] = [];

  for (const rule of RULES) {
    const matches = rule.triggerMetrics.some((m) => triggered.has(m));
    if (!matches) continue;

    const chainLinks = rule.chain.map((step) => {
      const { value, changePct } = step.getValue(ctx);
      return {
        metric: step.metric,
        label: step.label,
        value,
        changePct,
        direction: linkDirection(changePct, value),
      };
    });

    const users = input.changes
      .filter((c) => rule.triggerMetrics.includes(c.metric))
      .reduce((max, c) => Math.max(max, c.affectedUsers), 0);

    const confidence = Math.min(
      92,
      60 +
        input.changes
          .filter((c) => rule.triggerMetrics.includes(c.metric))
          .reduce((sum, c) => sum + Math.abs(c.changeVs7dPct ?? 0), 0) * 0.5,
    );

    chains.push({
      id: rule.id,
      triggerMetric: rule.triggerMetrics[0] ?? "unknown",
      triggerLabel: input.changes.find((c) => c.metric === rule.triggerMetrics[0])?.label ?? rule.triggerMetrics[0] ?? "",
      hypothesis: rule.hypothesis(ctx),
      chain: chainLinks,
      confidence: Math.round(confidence),
      status: validateEvidence({
        verified: chainLinks.some((l) => l.value != null),
        users,
        confidence,
      }),
      recommendedInvestigation: rule.investigation,
    });
  }

  return chains.sort((a, b) => b.confidence - a.confidence);
}
