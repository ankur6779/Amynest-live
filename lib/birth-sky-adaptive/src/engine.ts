/**
 * AdaptiveEngine — DevelopmentSnapshot + child history → AdaptiveSnapshot.
 * Deterministic. No LLM. No ML. Privacy-preserving (no identifiers).
 */

import { buildEngagementProfile } from "./engagement.js";
import { accumulateFeedbackWeights } from "./feedback.js";
import { buildLearningPreferences } from "./learning.js";
import { assertNoIdentifiers, sanitizeTypeTag } from "./privacy.js";
import {
  buildAdaptationRecommendations,
  buildRoutineHealth,
  routineHealthLabel,
} from "./routines.js";
import {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptiveEngineInput,
  type AdaptiveSnapshot,
  type HistorySummary,
} from "./types.js";

export class AdaptiveEngine {
  readonly version = ADAPTIVE_ENGINE_VERSION;

  compute(input: AdaptiveEngineInput): AdaptiveSnapshot {
    if (
      input.adaptiveSnapshot &&
      input.adaptiveSnapshot.adaptiveEngineVersion === ADAPTIVE_ENGINE_VERSION
    ) {
      return input.adaptiveSnapshot;
    }

    assertNoIdentifiers(input.history ?? {});

    const learningPreferences = buildLearningPreferences({
      history: input.history,
      development: input.development,
    });
    const engagementProfile = buildEngagementProfile({
      history: input.history,
      learning: learningPreferences,
    });
    const routineHealth = buildRoutineHealth(input.history);
    const adaptationRecommendations = buildAdaptationRecommendations({
      routineHealth,
      preferred: learningPreferences.preferredActivities,
      avoided: learningPreferences.avoidedActivities,
    });
    const historySummary = buildHistorySummary(input.history);
    const feedback = accumulateFeedbackWeights(input.history?.parentFeedback);

    const hasHistory =
      historySummary.totalCompletions + historySummary.totalSkips > 0 ||
      historySummary.sessionsPerWeek > 0 ||
      historySummary.feedbackSignals.length > 0;

    let confidence = hasHistory ? 0.72 : 0.45;
    confidence += Math.min(0.15, historySummary.totalCompletions * 0.01);
    confidence += Math.min(0.08, Math.abs(feedback.helpfulness) * 0.1);
    confidence = Math.round(Math.min(0.95, confidence) * 100) / 100;

    const topAdapt = adaptationRecommendations[0];

    return {
      adaptiveEngineVersion: ADAPTIVE_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      engagementProfile,
      routineHealth,
      learningPreferences,
      adaptationRecommendations,
      confidence,
      historySummary,
      profile: {
        engagementLevel: engagementProfile.level,
        preferredActivityTypes: learningPreferences.preferredActivities.slice(
          0,
          6,
        ),
        recommendedSessionLengthMinutes:
          engagementProfile.recommendedSessionLengthMinutes,
        routineHealthLabel: routineHealthLabel(routineHealth),
        adaptationPriority: topAdapt
          ? `${topAdapt.action}:${topAdapt.target}`
          : "continue:baseline",
        consistencyScore: engagementProfile.consistencyScore,
      },
    };
  }
}

function buildHistorySummary(
  history: AdaptiveEngineInput["history"],
): HistorySummary {
  let totalCompletions = 0;
  let totalSkips = 0;
  for (const a of history?.activities ?? []) {
    totalCompletions += a.completed ?? 0;
    totalSkips += a.skipped ?? 0;
  }
  for (const r of history?.completedRoutines ?? []) {
    totalCompletions += r.count ?? 1;
  }
  for (const r of history?.skippedRoutines ?? []) {
    totalSkips += r.count ?? 1;
  }

  const feedbackSignals = [
    ...new Set(
      (history?.parentFeedback ?? [])
        .map((f) => sanitizeTypeTag(String(f.signal)))
        .filter((x): x is string => Boolean(x)),
    ),
  ].slice(0, 8);

  const achievementTypes = [
    ...new Set(
      (history?.achievements ?? [])
        .map((a) => sanitizeTypeTag(a.type))
        .filter((x): x is string => Boolean(x)),
    ),
  ].slice(0, 8);

  return {
    totalCompletions,
    totalSkips,
    sessionsPerWeek: Math.max(
      0,
      Math.min(40, history?.sessionFrequency?.sessionsPerWeek ?? 0),
    ),
    feedbackSignals,
    achievementTypes,
  };
}

let singleton: AdaptiveEngine | null = null;

export function getAdaptiveEngine(): AdaptiveEngine {
  if (!singleton) singleton = new AdaptiveEngine();
  return singleton;
}

export function computeAdaptiveSnapshot(
  input: AdaptiveEngineInput,
): AdaptiveSnapshot {
  return getAdaptiveEngine().compute(input);
}
