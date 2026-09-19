import type { Recommendation } from "../../growth-dashboard/types.js";
import type { GrowthOsDecision } from "../types.js";
import { appendActionLog, loadGrowthOsPayload, saveGrowthOsPayload } from "../store.js";

function mapRecommendationToDecision(rec: Recommendation, existing?: GrowthOsDecision): GrowthOsDecision {
  const now = new Date().toISOString();
  const priority =
    rec.impactScore >= 85 ? "critical" : rec.impactScore >= 75 ? "high" : rec.impactScore >= 60 ? "medium" : "low";
  return {
    id: existing?.id ?? `dec_${rec.id}`,
    recommendationId: rec.id,
    title: rec.title,
    description: rec.description,
    priority,
    estimatedImpact: rec.impactScore,
    confidence: Math.min(95, 60 + Math.floor(rec.impactScore / 3)),
    reason: rec.description,
    affectedUsers: 0,
    expectedRevenueImpact: null,
    suggestedAction: rec.title,
    category: rec.category,
    status: existing?.status ?? "pending",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    decidedBy: existing?.decidedBy ?? null,
    decidedAt: existing?.decidedAt ?? null,
    decisionReason: existing?.decisionReason ?? null,
  };
}

function mergeDecisionsFromRecommendations(
  recommendations: Recommendation[],
  existingDecisions: GrowthOsDecision[],
): GrowthOsDecision[] {
  const byRecId = new Map(existingDecisions.map((d) => [d.recommendationId, d]));
  const merged = recommendations.map((rec) =>
    mapRecommendationToDecision(rec, byRecId.get(rec.id)),
  );
  const preserved = existingDecisions.filter(
    (d) => !recommendations.some((r) => r.id === d.recommendationId),
  );
  return [...merged, ...preserved].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function syncDecisionsFromRecommendations(
  recommendations: Recommendation[],
): Promise<GrowthOsDecision[]> {
  const payload = await loadGrowthOsPayload();
  const knownRecIds = new Set(payload.decisions.map((d) => d.recommendationId));
  const hasNew = recommendations.some((r) => !knownRecIds.has(r.id));

  if (!hasNew) {
    return mergeDecisionsFromRecommendations(recommendations, payload.decisions);
  }

  const fresh = await loadGrowthOsPayload();
  fresh.decisions = mergeDecisionsFromRecommendations(recommendations, fresh.decisions);
  await saveGrowthOsPayload(fresh);
  return fresh.decisions;
}

export async function listDecisions(): Promise<GrowthOsDecision[]> {
  const payload = await loadGrowthOsPayload();
  return payload.decisions;
}

export async function updateDecisionStatus(input: {
  decisionId: string;
  status: GrowthOsDecision["status"];
  userId: string;
  reason?: string;
}): Promise<GrowthOsDecision | null> {
  const payload = await loadGrowthOsPayload();
  const idx = payload.decisions.findIndex((d) => d.id === input.decisionId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const prev = payload.decisions[idx]!;
  const updated: GrowthOsDecision = {
    ...prev,
    status: input.status,
    updatedAt: now,
    decidedBy: input.userId,
    decidedAt: now,
    decisionReason: input.reason ?? null,
  };
  payload.decisions[idx] = updated;
  await saveGrowthOsPayload(payload);

  await appendActionLog({
    userId: input.userId,
    action: `decision_${input.status}`,
    reason: input.reason ?? null,
    outcome: `Decision ${prev.title} marked ${input.status}`,
    entityType: "decision",
    entityId: input.decisionId,
  });

  return updated;
}

export async function getDecisionCenterPayload(recommendations: Recommendation[]) {
  const decisions = await syncDecisionsFromRecommendations(recommendations);
  const payload = await loadGrowthOsPayload();
  return {
    decisions,
    actionHistory: payload.actionHistory.filter((h) => h.entityType === "decision").slice(0, 50),
  };
}
