import type {
  FamilyResponsePreference,
  FamilyStrategyProfile,
  InterventionLedgerEntry,
  InterventionScorecard,
} from "./types.js";

const FAILURE_SUPPRESS_THRESHOLD = 3;
const SUPPRESS_DAYS = 14;

export function rankInterventions(
  entries: InterventionLedgerEntry[],
): FamilyStrategyProfile["effectiveInterventions"] {
  const byKey = new Map<
    string,
    {
      title: string;
      scores: number[];
      confidences: number[];
      routineDeltas: number[];
      learningDeltas: number[];
      surfaces: Set<string>;
    }
  >();

  for (const e of entries) {
    if (e.scorecard === "pending_validation") continue;
    const impact = scorecardToImpact(e.scorecard);
    const existing = byKey.get(e.recommendationKey) ?? {
      title: e.recommendationTitle,
      scores: [],
      confidences: [],
      routineDeltas: [],
      learningDeltas: [],
      surfaces: new Set<string>(),
    };
    existing.scores.push(impact);
    existing.confidences.push(e.confidenceScore);
    if (e.metricDeltas) {
      existing.routineDeltas.push(e.metricDeltas.routineCompletionRate7d);
      existing.learningDeltas.push(e.metricDeltas.learningSuccess7d);
    }
    existing.surfaces.add(e.surface);
    byKey.set(e.recommendationKey, existing);
  }

  return [...byKey.entries()]
    .map(([key, data]) => {
      const avgImpact = avg(data.scores);
      const avgConf = avg(data.confidences);
      return {
        key,
        title: data.title,
        impactScore: Math.round(avgImpact * 100) / 100,
        confidence: Math.round(avgConf * 100) / 100,
        responseType: inferResponseType(data.surfaces),
        avgDeltaRoutine: Math.round(avg(data.routineDeltas)),
        avgDeltaLearning: Math.round(avg(data.learningDeltas)),
      };
    })
    .filter((r) => r.impactScore > 0)
    .sort((a, b) => b.impactScore * b.confidence - a.impactScore * a.confidence)
    .slice(0, 10);
}

export function rankFailedInterventions(
  entries: InterventionLedgerEntry[],
): FamilyStrategyProfile["ineffectiveInterventions"] {
  const byKey = new Map<string, { title: string; failures: number; lastFailedAt: string }>();

  for (const e of entries) {
    if (e.scorecard !== "no_impact" && e.scorecard !== "negative_impact") continue;
    const existing = byKey.get(e.recommendationKey) ?? {
      title: e.recommendationTitle,
      failures: 0,
      lastFailedAt: e.validatedAt ?? e.dispatchedAt,
    };
    existing.failures++;
    const at = e.validatedAt ?? e.dispatchedAt;
    if (at > existing.lastFailedAt) existing.lastFailedAt = at;
    byKey.set(e.recommendationKey, existing);
  }

  return [...byKey.entries()]
    .map(([key, data]) => ({
      key,
      title: data.title,
      failureCount: data.failures,
      lastFailedAt: data.lastFailedAt,
    }))
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10);
}

export function buildSelfCorrectionRules(
  ineffective: FamilyStrategyProfile["ineffectiveInterventions"],
): FamilyStrategyProfile["selfCorrectionRules"] {
  return ineffective
    .filter((i) => i.failureCount >= FAILURE_SUPPRESS_THRESHOLD)
    .map((i) => ({
      interventionKey: i.key,
      suppressUntil: new Date(
        Date.now() + SUPPRESS_DAYS * 86400000,
      ).toISOString(),
      reason: `${i.failureCount} consecutive validations showed no or negative impact`,
    }));
}

export function shouldSuppressIntervention(
  key: string,
  profile: FamilyStrategyProfile | null,
): boolean {
  if (!profile) return false;
  const rule = profile.selfCorrectionRules.find((r) => r.interventionKey === key);
  if (!rule?.suppressUntil) return false;
  return new Date(rule.suppressUntil).getTime() > Date.now();
}

export function inferFamilyPreferences(
  effective: FamilyStrategyProfile["effectiveInterventions"],
): Partial<Record<FamilyResponsePreference, number>> {
  const prefs: Partial<Record<FamilyResponsePreference, number>> = {};
  for (const item of effective) {
    const current = prefs[item.responseType] ?? 0;
    prefs[item.responseType] = current + item.impactScore * item.confidence;
  }
  return prefs;
}

function scorecardToImpact(scorecard: InterventionScorecard): number {
  switch (scorecard) {
    case "success":
      return 1;
    case "partial_success":
      return 0.5;
    case "no_impact":
      return 0;
    case "negative_impact":
      return -0.5;
    default:
      return 0;
  }
}

function inferResponseType(surfaces: Set<string>): FamilyResponsePreference {
  if (surfaces.has("reward")) return "rewards";
  if (surfaces.has("amy_ai")) return "coaching";
  if (surfaces.has("notification")) return "notifications";
  if (surfaces.has("campaign")) return "campaigns";
  if (surfaces.has("goal")) return "streaks";
  return "routines";
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
