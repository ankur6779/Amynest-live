/**
 * Launch score aggregation + recommendation rules.
 * INCONCLUSIVE and FAIL never count as success. Empty categories do not auto-score 100.
 */

import type {
  LaunchCategory,
  LaunchCheck,
  LaunchRecommendation,
  LaunchScoreBreakdown,
} from "./types.js";

const CATEGORY_KEYS: Array<{
  category: LaunchCategory;
  scoreKey: keyof LaunchScoreBreakdown;
}> = [
  { category: "story", scoreKey: "story" },
  { category: "visual", scoreKey: "visual" },
  { category: "audio", scoreKey: "audio" },
  { category: "brand", scoreKey: "brand" },
  { category: "feature", scoreKey: "featureAccuracy" },
  { category: "accessibility", scoreKey: "accessibility" },
  { category: "technical", scoreKey: "technical" },
  { category: "business", scoreKey: "campaign" },
  { category: "platform", scoreKey: "publishingReadiness" },
  { category: "policy", scoreKey: "publishingReadiness" },
  { category: "evidence", scoreKey: "evidence" },
];

export function scoreLaunchChecks(checks: LaunchCheck[]): LaunchScoreBreakdown {
  const byCategory = new Map<LaunchCategory, LaunchCheck[]>();
  for (const check of checks) {
    const list = byCategory.get(check.category) ?? [];
    list.push(check);
    byCategory.set(check.category, list);
  }

  const scores: LaunchScoreBreakdown = {
    story: 0,
    visual: 0,
    audio: 0,
    brand: 0,
    featureAccuracy: 0,
    accessibility: 0,
    technical: 0,
    campaign: 0,
    publishingReadiness: 0,
    evidence: 0,
    overall: 0,
  };

  const readinessParts: number[] = [];

  for (const { category, scoreKey } of CATEGORY_KEYS) {
    const list = byCategory.get(category) ?? [];
    const value = categoryScore(list);
    if (scoreKey === "publishingReadiness") {
      readinessParts.push(value);
    } else {
      scores[scoreKey] = value;
    }
  }
  scores.publishingReadiness =
    readinessParts.length === 0
      ? 0
      : Math.round(
          readinessParts.reduce((a, b) => a + b, 0) / readinessParts.length,
        );

  const weighted =
    scores.story * 0.12 +
    scores.visual * 0.1 +
    scores.audio * 0.1 +
    scores.brand * 0.12 +
    scores.featureAccuracy * 0.08 +
    scores.accessibility * 0.08 +
    scores.technical * 0.1 +
    scores.campaign * 0.06 +
    scores.publishingReadiness * 0.08 +
    scores.evidence * 0.16;

  const blocking = checks.filter(
    (c) => !c.ok || c.status === "INCONCLUSIVE" || c.status === "FAIL",
  );
  const criticalFails = checks.filter(
    (c) =>
      (!c.ok || c.status === "FAIL" || c.status === "INCONCLUSIVE") &&
      c.severity === "critical",
  );

  let overall = Math.round(weighted);
  if (criticalFails.length > 0 || blocking.some((c) => c.category === "evidence")) {
    overall = Math.min(overall, 89);
  }
  if (checks.some((c) => c.status === "INCONCLUSIVE")) {
    overall = Math.min(overall, 70);
  }

  scores.overall = overall;
  return scores;
}

export function recommendationForScore(
  overall: number,
  criticalFailures: number,
): LaunchRecommendation {
  if (criticalFailures > 0 || overall < 90) return "reject";
  if (overall >= 95) return "auto_approve";
  return "manual_review";
}

function categoryScore(checks: LaunchCheck[]): number {
  // Fail-closed: no checks in a category ⇒ 0, not 100.
  if (checks.length === 0) return 0;
  let points = 0;
  let weight = 0;
  for (const check of checks) {
    const w =
      check.severity === "critical" ? 3 : check.severity === "major" ? 2 : 1;
    weight += w;
    const passed = check.status ? check.status === "PASS" : check.ok;
    if (passed) points += w;
  }
  return Math.round((points / weight) * 100);
}
