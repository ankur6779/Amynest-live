import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { FunnelIntelStage, OpportunityItem, ObservatoryAlert } from "./types.js";

function opp(
  rank: number,
  title: string,
  category: OpportunityItem["category"],
  evidence: string,
  affectedUsers: number,
  estimatedImpact: string,
  effort: OpportunityItem["engineeringEffort"],
  confidence: OpportunityItem["confidence"],
  verified: boolean,
): OpportunityItem {
  return { rank, title, category, evidence, affectedUsers, estimatedImpact, engineeringEffort: effort, confidence, verified };
}

export function generateOpportunities(input: {
  funnel: FunnelIntelStage[];
  dashboard: GrowthDashboardPayload;
  alerts: ObservatoryAlert[];
}): {
  growth: OpportunityItem[];
  revenue: OpportunityItem[];
  retention: OpportunityItem[];
  technical: OpportunityItem[];
} {
  const dash = input.funnel.find((f) => f.key === "dashboard_view");
  const routine = input.funnel.find((f) => f.key === "routine_completed");
  const purchase = input.funnel.find((f) => f.key === "purchase");

  const dashUsers = dash?.users ?? 0;
  const routineUsers = routine?.users ?? 0;
  const routineDrop =
    dashUsers > 0 ? Math.round(((dashUsers - routineUsers) / dashUsers) * 100) : null;

  const growth: OpportunityItem[] = [];
  const revenue: OpportunityItem[] = [];
  const retention: OpportunityItem[] = [];
  const technical: OpportunityItem[] = [];

  if (routineDrop != null && routineDrop >= 50 && dashUsers >= 10) {
    growth.push(
      opp(
        1,
        "Close dashboard → routine activation gap",
        "growth",
        `Production: ${routineDrop}% drop from dashboard (${dashUsers}) to routine (${routineUsers}).`,
        dashUsers - routineUsers,
        "+10–15 pp routine rate if gap halves",
        "M",
        "high",
        true,
      ),
    );
  }

  const hubFeature = input.dashboard.features.find((f) => f.key === "parent_hub");
  if (hubFeature && hubFeature.dau < dashUsers * 0.2 && dashUsers >= 20) {
    retention.push(
      opp(
        1,
        "Increase Parent Hub discovery post-routine",
        "retention",
        `Parent Hub reach ${hubFeature.dau} vs ${dashUsers} dashboard users — hub correlates with 5× D1.`,
        dashUsers - hubFeature.dau,
        "+3–5 pp D1 retention",
        "S",
        "medium",
        true,
      ),
    );
  }

  const trialUsers = input.dashboard.subscriptions.trialUsers;
  const paidUsers = input.dashboard.subscriptions.paidUsers;
  if (trialUsers > 5 && paidUsers === 0) {
    revenue.push(
      opp(
        1,
        "Unblock trial → paid purchase path",
        "revenue",
        `${trialUsers} trial/expired users, ${paidUsers} paid — 0% trial→paid in analytics.`,
        trialUsers,
        "First paid subs from existing trial base",
        "M",
        "high",
        true,
      ),
    );
  }

  const d1 = input.dashboard.retention.summary.d1;
  if (d1 != null && d1 < 8) {
    retention.push(
      opp(
        growth.length + retention.length + 1,
        "Day-1 return for routine abandoners",
        "retention",
        `D1 retention ${d1}% — routine generators retain 4× better in production cohort.`,
        input.dashboard.kpis.dau?.value ?? 0,
        "+3–5 pp D1",
        "S",
        "medium",
        d1 > 0,
      ),
    );
  }

  const crashFree = input.dashboard.performance.crashFreePct;
  if (crashFree != null && crashFree < 97) {
    technical.push(
      opp(
        1,
        "Reduce Android crash rate",
        "technical",
        `Crash-free ${crashFree}% below 97% target.`,
        input.dashboard.performance.crashCount,
        "Protect activation funnel integrity",
        "M",
        "high",
        true,
      ),
    );
  }

  for (const alert of input.alerts.filter((a) => a.category === "critical").slice(0, 2)) {
    technical.push(
      opp(
        technical.length + 1,
        alert.title,
        alert.metric.includes("purchase") || alert.metric.includes("trial") ? "revenue" : "technical",
        alert.evidence,
        alert.affectedUsers,
        "Stabilize metric regression",
        "M",
        alert.statisticallyMeaningful ? "high" : "low",
        alert.statisticallyMeaningful,
      ),
    );
  }

  if (purchase && purchase.users === 0 && trialUsers > 0) {
    revenue.push(
      opp(
        revenue.length + 1,
        "Surface checkout at trial expiry",
        "revenue",
        `${trialUsers} trials, 0 purchases in funnel window.`,
        trialUsers,
        "+5–10 pp expired→paid",
        "S",
        "medium",
        true,
      ),
    );
  }

  const cap = (items: OpportunityItem[]) =>
    items.sort((a, b) => b.affectedUsers - a.affectedUsers).slice(0, 5).map((item, i) => ({ ...item, rank: i + 1 }));

  return {
    growth: cap(growth),
    revenue: cap(revenue),
    retention: cap(retention),
    technical: cap(technical),
  };
}
