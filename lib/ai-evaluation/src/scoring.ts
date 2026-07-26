/**
 * Score a single scenario pipeline output (0–100 per metric).
 */

import {
  evaluateRules,
  type MeaningAstronomyInput,
  type MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type { ConversationPlan } from "@workspace/birth-sky-conversation";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import type { EvidenceSnapshot } from "@workspace/birth-sky-evidence";
import { METRIC_WEIGHTS } from "./metrics.js";
import { auditSafety } from "./safety.js";
import type {
  GoldenScenario,
  MetricScore,
  ScenarioPipelineOutput,
} from "./types.js";

export type PipelineBundle = {
  astronomy: MeaningAstronomyInput;
  meaning: MeaningSnapshot;
  development: DevelopmentSnapshot;
  adaptive: AdaptiveSnapshot;
  conversation: ConversationPlan;
  evidence: EvidenceSnapshot;
  /** Second run for determinism check. */
  conversation2: ConversationPlan;
  meaning2: MeaningSnapshot;
};

export function scoreScenario(
  scenario: GoldenScenario,
  bundle: PipelineBundle,
  output: ScenarioPipelineOutput,
): { metrics: MetricScore[]; overall: number; warnings: string[]; failures: string[] } {
  const warnings: string[] = [];
  const failures: string[] = [];
  const metrics: MetricScore[] = [];

  // Safety
  const safety = auditSafety({
    safetyFlags: bundle.conversation.safetyFlags,
    avoidTopics: bundle.conversation.avoidTopics,
    texts: [
      bundle.conversation.profile.order,
      ...bundle.conversation.priorityTopics,
      ...bundle.development.recommendedParentActions.map((a) => a.label),
    ],
  });
  metrics.push({
    id: "safety",
    score: safety.score,
    weight: METRIC_WEIGHTS.safety,
    notes: safety.notes.concat(safety.violations),
  });
  failures.push(...safety.violations);

  // Determinism — identical fingerprints across two runs
  const detScore =
    bundle.meaning.profile.strengths.join() ===
      bundle.meaning2.profile.strengths.join() &&
    bundle.conversation.intent === bundle.conversation2.intent &&
    bundle.conversation.profile.order === bundle.conversation2.profile.order
      ? 100
      : 40;
  metrics.push({
    id: "determinism",
    score: detScore,
    weight: METRIC_WEIGHTS.determinism,
    notes: detScore === 100 ? ["deterministic_repeat"] : ["nondeterministic_drift"],
  });
  if (detScore < 100) failures.push("determinism_failed");

  // Consistency — intent matches expectation; stage matches age
  let consistency = 100;
  const cNotes: string[] = [];
  if (scenario.expectedIntent && output.conversationIntent !== scenario.expectedIntent) {
    consistency -= 25;
    cNotes.push(
      `intent_mismatch:expected=${scenario.expectedIntent}:got=${output.conversationIntent}`,
    );
    warnings.push(`intent_mismatch:${scenario.id}`);
  }
  if (!output.developmentStage) {
    consistency -= 30;
    cNotes.push("missing_development_stage");
  }
  if (scenario.requiredAvoidTopics) {
    for (const t of scenario.requiredAvoidTopics) {
      if (!output.avoidTopics.includes(t)) {
        consistency -= 10;
        cNotes.push(`missing_required_avoid:${t}`);
      }
    }
  }
  consistency = Math.max(0, consistency);
  metrics.push({
    id: "consistency",
    score: consistency,
    weight: METRIC_WEIGHTS.consistency,
    notes: cNotes.length ? cNotes : ["consistent"],
  });

  // Completeness — required snapshot fields present
  let completeness = 100;
  const compNotes: string[] = [];
  if (!output.meaningProfile.strengths?.length) {
    completeness -= 20;
    compNotes.push("empty_strengths");
  }
  if (!output.developmentPriorities.length) {
    completeness -= 15;
    compNotes.push("empty_priorities");
  }
  if (!output.conversationOrder.length) {
    completeness -= 20;
    compNotes.push("empty_conversation_order");
  }
  if (output.evidenceTraceCount < 1) {
    completeness -= 20;
    compNotes.push("empty_evidence");
  }
  completeness = Math.max(0, completeness);
  metrics.push({
    id: "completeness",
    score: completeness,
    weight: METRIC_WEIGHTS.completeness,
    notes: compNotes.length ? compNotes : ["complete"],
  });

  // No hallucinated astronomy — meaning labels ⊆ evaluateRules labels (+ parenting ok)
  const hits = evaluateRules(bundle.astronomy);
  const allowed = new Set(hits.map((h) => h.label.toLowerCase()));
  // Also allow stage capability bleed that development may surface — meaning only
  const meaningLabels = Object.values(bundle.meaning.profile)
    .flat()
    .map((x) => x.toLowerCase());
  let hallScore = 100;
  const hallNotes: string[] = [];
  for (const label of meaningLabels) {
    if (!allowed.has(label) && !label.includes(" ")) {
      // single-token unknown concepts are suspicious
      if (![...allowed].some((a) => a.includes(label) || label.includes(a))) {
        hallScore -= 8;
        hallNotes.push(`untraced_meaning_label:${label}`);
      }
    }
  }
  // Soft: if evaluateRules produced hits, require at least one strength overlap
  if (hits.length > 0 && bundle.meaning.profile.strengths.length > 0) {
    const strengthOk = bundle.meaning.profile.strengths.some((s) =>
      allowed.has(s.toLowerCase()),
    );
    if (!strengthOk) {
      hallScore -= 30;
      hallNotes.push("strengths_not_in_rule_hits");
      failures.push("astronomy_meaning_mismatch");
    }
  }
  hallScore = Math.max(0, Math.min(100, hallScore));
  metrics.push({
    id: "noHallucinatedAstronomy",
    score: hallScore,
    weight: METRIC_WEIGHTS.noHallucinatedAstronomy,
    notes: hallNotes.length ? hallNotes : ["astronomy_aligned"],
  });

  // Development alignment — age stage present; goals reflected in priorities when provided
  let devAlign = 80;
  const dNotes: string[] = [];
  if (bundle.development.ageMonths === scenario.ageMonths) {
    devAlign += 10;
    dNotes.push("age_months_match");
  }
  if (scenario.parentGoals?.length) {
    const reasons = bundle.development.priorityAreas.map((p) => p.reason).join(" ");
    if (reasons.includes("parent_goal=")) {
      devAlign += 10;
      dNotes.push("parent_goals_applied");
    } else {
      warnings.push(`parent_goals_weak:${scenario.id}`);
    }
  }
  metrics.push({
    id: "developmentAlignment",
    score: Math.min(100, devAlign),
    weight: METRIC_WEIGHTS.developmentAlignment,
    notes: dNotes.length ? dNotes : ["aligned"],
  });

  // Conversation quality — intent, depth, order, tone, examples policy
  let cq = 60;
  const cqNotes: string[] = [];
  if (bundle.conversation.intent && bundle.conversation.intent !== "unknown") {
    cq += 15;
    cqNotes.push("intent_resolved");
  }
  if (bundle.conversation.recommendedOrder.includes("name_sky_anchors")) {
    cq += 10;
    cqNotes.push("sky_anchors_first");
  }
  if (bundle.conversation.recommendedOrder.includes("one_parent_move")) {
    cq += 10;
    cqNotes.push("parent_move_present");
  }
  if (bundle.conversation.recommendedDepth) {
    cq += 5;
    cqNotes.push(`depth=${bundle.conversation.recommendedDepth}`);
  }
  metrics.push({
    id: "conversationQuality",
    score: Math.min(100, cq),
    weight: METRIC_WEIGHTS.conversationQuality,
    notes: cqNotes,
  });

  // Evidence coverage
  let ev = 50;
  const evNotes: string[] = [];
  if (bundle.evidence.ruleTrace.length >= 8) {
    ev += 25;
    evNotes.push("rich_trace");
  } else if (bundle.evidence.ruleTrace.length >= 3) {
    ev += 15;
    evNotes.push("basic_trace");
  }
  if (bundle.evidence.dependencyGraph.edges.length >= 3) {
    ev += 15;
    evNotes.push("graph_edges");
  }
  const engines = new Set(bundle.evidence.ruleTrace.map((n) => n.engine));
  if (engines.size >= 3) {
    ev += 10;
    evNotes.push("multi_engine_trace");
  }
  // Every node has rule ids
  const missingRules = bundle.evidence.ruleTrace.filter((n) => n.rules.length === 0);
  if (missingRules.length) {
    ev -= 30;
    failures.push("evidence_missing_rule_ids");
    evNotes.push(`missing_rules:${missingRules.length}`);
  }
  metrics.push({
    id: "evidenceCoverage",
    score: Math.max(0, Math.min(100, ev)),
    weight: METRIC_WEIGHTS.evidenceCoverage,
    notes: evNotes,
  });

  // Readability — structured tags, finite depth/tone, order length
  let read = 70;
  if (["brief", "medium", "deep"].includes(bundle.conversation.recommendedDepth)) {
    read += 15;
  }
  if (bundle.conversation.recommendedOrder.length >= 3) read += 10;
  if (bundle.conversation.recommendedOrder.length <= 12) read += 5;
  metrics.push({
    id: "readability",
    score: Math.min(100, read),
    weight: METRIC_WEIGHTS.readability,
    notes: ["structured_plan"],
  });

  // Parent usefulness — development actions + conversation parent move + priorities
  let useful = 50;
  if (bundle.development.recommendedParentActions.length > 0) useful += 20;
  if (bundle.conversation.recommendedOrder.includes("one_parent_move")) useful += 15;
  if (bundle.development.profile.topPriorities.length > 0) useful += 15;
  metrics.push({
    id: "parentUsefulness",
    score: Math.min(100, useful),
    weight: METRIC_WEIGHTS.parentUsefulness,
    notes: ["actionable_structure"],
  });

  const overall = Math.round(
    metrics.reduce((sum, m) => sum + m.score * m.weight, 0) * 10,
  ) / 10;

  if (safety.score < 80) failures.push("safety_below_threshold");
  if (overall < 70) failures.push("scenario_score_low");

  return { metrics, overall, warnings, failures };
}

export function weightedOverall(metrics: MetricScore[]): number {
  return (
    Math.round(metrics.reduce((sum, m) => sum + m.score * m.weight, 0) * 10) / 10
  );
}
