/**
 * DevelopmentEngine — MeaningSnapshot + child context → DevelopmentSnapshot.
 * Deterministic. No LLM.
 */

import {
  ageMonthsFromBirthDate,
  resolveAgeStage,
} from "./age-stages.js";
import { buildDomainScores } from "./domains.js";
import { buildRecommendations, rankPriorityAreas } from "./priorities.js";
import { evaluateRoutines } from "./routines.js";
import {
  DEVELOPMENT_ENGINE_VERSION,
  type DevelopmentEngineInput,
  type DevelopmentSnapshot,
} from "./types.js";

export class DevelopmentEngine {
  readonly version = DEVELOPMENT_ENGINE_VERSION;

  compute(input: DevelopmentEngineInput): DevelopmentSnapshot {
    if (
      input.developmentSnapshot &&
      input.developmentSnapshot.developmentEngineVersion ===
        DEVELOPMENT_ENGINE_VERSION
    ) {
      return input.developmentSnapshot;
    }

    const ageMonths = resolveAgeMonths(input);
    const stage = resolveAgeStage(ageMonths);
    const developmentProfile = buildDomainScores({
      stage,
      meaning: input.meaning,
      milestones: input.milestones,
      routines: input.routines,
    });
    const priorityAreas = rankPriorityAreas({
      domains: developmentProfile,
      parentGoals: input.parentGoals,
    });
    const { activities, parentActions, avoidPatterns } = buildRecommendations({
      stage,
      priorities: priorityAreas,
      meaningActions: input.meaning.parentingGuidance?.map((g) => ({
        label: g.label,
        confidence: g.confidence,
      })),
    });
    const routineAlignment = evaluateRoutines({
      stage,
      routines: input.routines,
    });

    const confValues = Object.values(developmentProfile).map((d) => d.confidence);
    const confidence =
      Math.round(
        (confValues.reduce((a, b) => a + b, 0) / Math.max(1, confValues.length)) *
          100,
      ) / 100;

    return {
      developmentEngineVersion: DEVELOPMENT_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      stage,
      ageMonths,
      developmentProfile,
      priorityAreas,
      recommendedActivities: activities,
      recommendedParentActions: parentActions,
      avoidPatterns,
      routineAlignment,
      confidence,
      profile: {
        developmentStage: stage.label,
        learningProfile: developmentProfile.learningStyle.labels
          .concat(developmentProfile.curiosity.labels)
          .slice(0, 6),
        emotionalProfile: developmentProfile.emotionalRegulation.labels
          .concat(developmentProfile.sleepTendencies.labels)
          .slice(0, 6),
        topPriorities: priorityAreas.slice(0, 5).map((p) => p.label),
        recommendedParentActions: parentActions.slice(0, 6).map((a) => a.label),
        avoidPatterns: avoidPatterns.slice(0, 4).map((a) => a.label),
      },
    };
  }
}

function resolveAgeMonths(input: DevelopmentEngineInput): number {
  if (typeof input.ageMonths === "number" && Number.isFinite(input.ageMonths)) {
    return Math.max(0, Math.floor(input.ageMonths));
  }
  if (input.birthDate) {
    return ageMonthsFromBirthDate(input.birthDate, input.asOfDate);
  }
  // Unknown age → preschool mid-band default (deterministic fallback)
  return 48;
}

let singleton: DevelopmentEngine | null = null;

export function getDevelopmentEngine(): DevelopmentEngine {
  if (!singleton) singleton = new DevelopmentEngine();
  return singleton;
}

export function computeDevelopmentSnapshot(
  input: DevelopmentEngineInput,
): DevelopmentSnapshot {
  return getDevelopmentEngine().compute(input);
}
