/**
 * Continuous Optimization — Recommendation drift audits.
 *
 * Prevents recommendation complexity from drifting into noise. Pure
 * validation on an existing recommendation set — surfaces issues so the
 * host can re-shape or trim before rendering.
 *
 * Checks:
 *  - overload (too many recs at once)
 *  - emotional inconsistency (push + slow_down at the same time)
 *  - conflicting routes (two recs to the same href back-to-back)
 *  - repeated content fatigue (same skill recommended N days in a row)
 *  - unpredictable priority (mismatched high/low arrangement)
 */

import type { AdaptiveRecommendation } from "./adaptive-routing";
import type { ExplainedRecommendation } from "./recommendation-explanations";

export type RecommendationIssueKind =
  | "overload"
  | "emotional_inconsistency"
  | "duplicate_route"
  | "repeated_skill"
  | "priority_disorder";

export interface RecommendationIssue {
  kind: RecommendationIssueKind;
  message: string;
  /** Indexes / ids involved in the issue, for debug surfaces only. */
  recIds: string[];
}

export interface RecommendationAuditReport {
  issues: RecommendationIssue[];
  /** True when the set is coherent and safe to render as-is. */
  coherent: boolean;
  /** Recommended trim — the top N safest recommendations. */
  safeOrder: AdaptiveRecommendation[];
}

export const MAX_RECOMMENDATIONS_AT_ONCE = 4;

export interface AuditInput {
  recommendations: (AdaptiveRecommendation | ExplainedRecommendation)[];
  /** Skill ids that have already been recommended N days in a row. */
  recentlyRecommendedSkillIds?: string[];
}

export function auditRecommendations(input: AuditInput): RecommendationAuditReport {
  const issues: RecommendationIssue[] = [];
  const recs = input.recommendations;
  const recent = new Set(input.recentlyRecommendedSkillIds ?? []);

  // ── Overload ──
  if (recs.length > MAX_RECOMMENDATIONS_AT_ONCE) {
    issues.push({
      kind: "overload",
      message: `Too many recommendations at once (${recs.length}) — trim to ${MAX_RECOMMENDATIONS_AT_ONCE}.`,
      recIds: recs.map((r) => r.id),
    });
  }

  // ── Emotional inconsistency ──
  const isPush = (r: AdaptiveRecommendation) => r.id === "rec_challenge";
  const isSlow = (r: AdaptiveRecommendation) =>
    r.id === "rec_revision" || r.id === "rec_comeback";
  const pushes = recs.filter(isPush);
  const slows = recs.filter(isSlow);
  if (pushes.length > 0 && slows.length > 0) {
    issues.push({
      kind: "emotional_inconsistency",
      message: "Stretch and slow-down recommendations in the same set — pick a tone.",
      recIds: [...pushes, ...slows].map((r) => r.id),
    });
  }

  // ── Duplicate route ──
  const seenHrefs = new Map<string, string[]>();
  for (const r of recs) {
    const ids = seenHrefs.get(r.href) ?? [];
    ids.push(r.id);
    seenHrefs.set(r.href, ids);
  }
  for (const [href, ids] of seenHrefs.entries()) {
    if (ids.length > 1) {
      issues.push({
        kind: "duplicate_route",
        message: `Two recommendations route to ${href} — collapse them.`,
        recIds: ids,
      });
    }
  }

  // ── Repeated skill ──
  for (const r of recs) {
    if (r.skillId && recent.has(r.skillId)) {
      issues.push({
        kind: "repeated_skill",
        message: `Skill ${r.skillId} has been recommended recently — vary the choice.`,
        recIds: [r.id],
      });
    }
  }

  // ── Priority disorder ──
  // A "high" priority rec must not be sandwiched after a "low" one.
  for (let i = 1; i < recs.length; i++) {
    const prev = recs[i - 1]!;
    const cur = recs[i]!;
    if (prev.priority === "low" && cur.priority === "high") {
      issues.push({
        kind: "priority_disorder",
        message: "High-priority recommendation appears after low — reorder by priority.",
        recIds: [prev.id, cur.id],
      });
      break;
    }
  }

  // ── Build a safe ordering. ──
  const seen = new Set<string>();
  const safeOrder: AdaptiveRecommendation[] = [];
  const priorityOrder = (p: AdaptiveRecommendation["priority"]) =>
    p === "high" ? 0 : p === "medium" ? 1 : 2;
  const sorted = [...recs].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  for (const r of sorted) {
    if (seen.has(r.href)) continue;
    if (r.skillId && recent.has(r.skillId)) continue;
    // Skip stretch when a slow-down is also present.
    if (pushes.length > 0 && slows.length > 0 && r.id === "rec_challenge") continue;
    seen.add(r.href);
    safeOrder.push(r);
    if (safeOrder.length >= MAX_RECOMMENDATIONS_AT_ONCE) break;
  }

  return {
    issues,
    coherent: issues.length === 0,
    safeOrder,
  };
}
