import type {
  EvidenceChain,
  ExperimentDecision,
  FounderAction,
  MetricChange,
  ScoredOpportunity,
} from "./types.js";
import type { DeployRegression } from "./types.js";
import type { ObservatoryAlert } from "../growth-observatory/types.js";
import {
  actionAllowed,
  confidenceLabel,
  estimateHours,
  priorityLabelFromScore,
  recommendOwner,
} from "./safety.js";

function actionFromChange(change: MetricChange, priority: number): FounderAction | null {
  if (!change.meaningful || !actionAllowed(change.status)) return null;
  const isBad = change.direction === "down" && !["installs", "mrr", "purchase_success", "crash_free"].includes(change.metric);
  const isGood = change.direction === "up";
  if (isGood && change.category !== "revenue") return null;

  const score = Math.min(95, 50 + Math.abs(change.changeVs7dPct ?? 0) * 2);
  return {
    id: `action_change_${change.id}`,
    priority,
    priorityLabel: priorityLabelFromScore(score),
    problem: `${change.label} ${change.direction === "down" ? "declined" : "changed"} ${Math.abs(change.changeVs7dPct ?? change.changeVsYesterdayPct ?? 0)}% vs 7d baseline`,
    evidence: change.evidence,
    businessImpact: isBad ? `Affects ${change.affectedUsers} users in ${change.category}` : "Monitor positive trend",
    confidence: score,
    confidenceLabel: confidenceLabel(score),
    engineeringEffort: change.category === "reliability" ? "M" : "S",
    estimatedHours: estimateHours(change.category === "reliability" ? "M" : "S"),
    recommendedOwner: recommendOwner(change.category),
    sourceType: "change",
    sourceId: change.id,
    status: change.status,
    metricRefs: [change.metric],
  };
}

function actionFromCorrelation(chain: EvidenceChain, priority: number): FounderAction | null {
  if (!actionAllowed(chain.status)) return null;
  return {
    id: `action_corr_${chain.id}`,
    priority,
    priorityLabel: priorityLabelFromScore(chain.confidence),
    problem: chain.hypothesis,
    evidence: chain.chain.map((l) => `${l.label}: ${l.value ?? "—"} (${l.direction})`).join(" → "),
    businessImpact: `Root cause chain for ${chain.triggerLabel}`,
    confidence: chain.confidence,
    confidenceLabel: confidenceLabel(chain.confidence),
    engineeringEffort: "M",
    estimatedHours: estimateHours("M"),
    recommendedOwner: recommendOwner(chain.triggerMetric),
    sourceType: "correlation",
    sourceId: chain.id,
    status: chain.status,
    metricRefs: chain.chain.map((l) => l.metric),
  };
}

function actionFromOpportunity(opp: ScoredOpportunity, priority: number): FounderAction | null {
  if (!actionAllowed(opp.status)) return null;
  return {
    id: `action_opp_${opp.id}`,
    priority,
    priorityLabel: priorityLabelFromScore(opp.priorityScore),
    problem: opp.title,
    evidence: opp.evidence,
    businessImpact: opp.estimatedImpact,
    confidence: opp.scores.confidence,
    confidenceLabel: opp.confidenceLabel,
    engineeringEffort: opp.engineeringEffort,
    estimatedHours: estimateHours(opp.engineeringEffort),
    recommendedOwner: recommendOwner(opp.category),
    sourceType: "opportunity",
    sourceId: opp.id,
    status: opp.status,
    metricRefs: [opp.category],
  };
}

function actionFromRegression(reg: DeployRegression, priority: number): FounderAction | null {
  if (!reg.exceedsThreshold || !actionAllowed(reg.status)) return null;
  return {
    id: `action_reg_${reg.id}`,
    priority,
    priorityLabel: "high",
    problem: `${reg.label} regressed ${reg.changePct}% after ${reg.releaseVersion} release`,
    evidence: reg.evidence,
    businessImpact: `Post-deploy ${reg.category} regression`,
    confidence: 80,
    confidenceLabel: "high",
    engineeringEffort: "M",
    estimatedHours: estimateHours("M"),
    recommendedOwner: "engineering",
    sourceType: "regression",
    sourceId: reg.id,
    status: reg.status,
    metricRefs: [reg.metric, reg.releaseVersion],
  };
}

function actionFromExperiment(exp: ExperimentDecision, priority: number): FounderAction | null {
  if (exp.decision === "too_early" || exp.decision === "not_enough_evidence" || exp.decision === "continue") {
    return null;
  }
  if (!actionAllowed(exp.status)) return null;
  return {
    id: `action_exp_${exp.id}`,
    priority,
    priorityLabel: exp.decision === "ship" ? "high" : "medium",
    problem: `${exp.name}: ${exp.decision}`,
    evidence: exp.recommendedAction,
    businessImpact: `Experiment decision on ${exp.primaryMetric}`,
    confidence: exp.confidencePct ?? 70,
    confidenceLabel: confidenceLabel(exp.confidencePct ?? 70),
    engineeringEffort: "S",
    estimatedHours: estimateHours("S"),
    recommendedOwner: "product",
    sourceType: "experiment",
    sourceId: exp.id,
    status: exp.status,
    metricRefs: [exp.featureFlag ?? exp.id],
  };
}

function actionFromAlert(alert: ObservatoryAlert, priority: number): FounderAction | null {
  if (!alert.statisticallyMeaningful) return null;
  const score = alert.category === "critical" ? 88 : 72;
  return {
    id: `action_alert_${alert.id}`,
    priority,
    priorityLabel: alert.category === "critical" ? "critical" : "high",
    problem: alert.title,
    evidence: alert.evidence,
    businessImpact: alert.message,
    confidence: score,
    confidenceLabel: confidenceLabel(score),
    engineeringEffort: "M",
    estimatedHours: estimateHours("M"),
    recommendedOwner: recommendOwner(alert.metric),
    sourceType: "alert",
    sourceId: alert.id,
    status: "verified",
    metricRefs: [alert.metric],
  };
}

export function buildFounderActionQueue(input: {
  changes: MetricChange[];
  correlations: EvidenceChain[];
  opportunities: ScoredOpportunity[];
  regressions: DeployRegression[];
  experiments: ExperimentDecision[];
  alerts: ObservatoryAlert[];
}): FounderAction[] {
  const candidates: FounderAction[] = [];
  let prio = 1;

  for (const alert of input.alerts.filter((a) => a.category === "critical")) {
    const a = actionFromAlert(alert, prio++);
    if (a) candidates.push(a);
  }

  for (const reg of input.regressions) {
    const a = actionFromRegression(reg, prio++);
    if (a) candidates.push(a);
  }

  for (const change of input.changes.filter((c) => c.direction === "down")) {
    const a = actionFromChange(change, prio++);
    if (a) candidates.push(a);
  }

  for (const chain of input.correlations.slice(0, 3)) {
    const a = actionFromCorrelation(chain, prio++);
    if (a) candidates.push(a);
  }

  for (const opp of input.opportunities.slice(0, 5)) {
    const a = actionFromOpportunity(opp, prio++);
    if (a) candidates.push(a);
  }

  for (const exp of input.experiments) {
    const a = actionFromExperiment(exp, prio++);
    if (a) candidates.push(a);
  }

  for (const alert of input.alerts.filter((a) => a.category !== "critical")) {
    const a = actionFromAlert(alert, prio++);
    if (a) candidates.push(a);
  }

  return candidates
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priorityLabel] - order[b.priorityLabel] || b.confidence - a.confidence;
    })
    .map((item, i) => ({ ...item, priority: i + 1 }))
    .slice(0, 15);
}
