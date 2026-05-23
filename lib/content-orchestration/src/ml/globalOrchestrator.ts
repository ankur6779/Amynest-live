import type { AgeBand, CountryCode } from "../types.js";
import type { LearningProfile } from "../types-v2.js";
import type { PersonalityProfile } from "./types-personality.js";
import type { PredictionOutput } from "./types-prediction.js";
import {
  buildCohortKey,
  cohortMatchScore,
  derivePersonalityCluster,
} from "./cohortIntelligence.js";
import { getCommunityPatterns } from "./communityPatterns.js";
import {
  assignColdStartPath,
  coldStartModulePriority,
  isColdStartProfile,
} from "./coldStartOptimization.js";
import { buildDifficultyCalibrationMap } from "./difficultyCalibration.js";
import {
  getGlobalGraph,
  loadGlobalGraphFromRows,
  setGlobalGraph,
} from "./globalGraphEngine.js";
import { applyGlobalPathToPrediction, recommendGlobalLearningPath } from "./globalPathPrediction.js";
import { calibratedDifficultyForChild, difficultyScore } from "./difficultyCalibration.js";
import type {
  GlobalApiPayload,
  GlobalInsights,
  GlobalPlanContext,
  GlobalLearningGraphRow,
} from "./types-global.js";

export function ensureGlobalGraphLoaded(rows?: GlobalLearningGraphRow[]): void {
  if (rows && rows.length > 0) {
    loadGlobalGraphFromRows(rows);
    return;
  }
  if (!getGlobalGraph().skills.length) {
    setGlobalGraph(getGlobalGraph());
  }
}

export function buildGlobalInsights(
  cohortKey: string,
  currentSkill?: import("../types-v2.js").SkillKey,
): GlobalInsights {
  const graph = getGlobalGraph();
  const patterns = getCommunityPatterns(graph);
  return {
    recommendedPath: recommendGlobalLearningPath(graph, patterns, currentSkill),
    difficultyCalibration: buildDifficultyCalibrationMap(graph),
    cohortMatchScore: cohortMatchScore(cohortKey, graph),
  };
}

export function getGlobalPlanContext(
  countryCode: CountryCode,
  ageBand: AgeBand,
  personality?: PersonalityProfile,
  profile?: LearningProfile,
): GlobalPlanContext {
  const cohortKey = buildCohortKey({
    ageBand,
    countryCode,
    personalityCluster: derivePersonalityCluster(personality),
  });
  const graph = getGlobalGraph();
  const patterns = getCommunityPatterns(graph);
  const isColdStart = profile ? isColdStartProfile(profile) : false;
  const insights = buildGlobalInsights(
    cohortKey,
    profile
      ? (Object.entries(profile.skills).sort(
          (a, b) => a[1].level - b[1].level,
        )[0]?.[0] as import("../types-v2.js").SkillKey)
      : undefined,
  );

  const explorationCandidates = patterns.highRetentionFlows
    .flat()
    .slice(0, 12);

  return {
    cohortKey,
    insights,
    globalSuccessWeight: 0.08,
    explorationCandidates,
    isColdStart,
  };
}

export function enhancePredictionWithGlobal(
  prediction: PredictionOutput,
  ctx: GlobalPlanContext,
  profile?: LearningProfile,
  ageBand?: AgeBand,
): PredictionOutput {
  const graph = getGlobalGraph();
  const patterns = getCommunityPatterns(graph);
  let out = applyGlobalPathToPrediction(prediction, graph, patterns, 0.1);

  if (ctx.isColdStart && profile) {
    const cold = assignColdStartPath(graph, patterns, ageBand ?? "36_48");
    const globalScore = difficultyScore("phonics", graph);
    const diff = calibratedDifficultyForChild(
      out.recommendedDifficulty,
      globalScore,
      0.75,
    );
    out = { ...out, recommendedDifficulty: diff };
  } else {
    const weakest = out.skillForecasts
      .slice()
      .sort((a, b) => a.currentLevel - b.currentLevel)[0];
    if (weakest) {
      const gScore = difficultyScore(weakest.skill, graph);
      if (gScore > 0.6 && out.recommendedDifficulty !== "easy") {
        const order = { easy: 0, medium: 1, hard: 2 };
        const cur = order[out.recommendedDifficulty];
        if (cur > 0) {
          out = {
            ...out,
            recommendedDifficulty: cur === 2 ? "medium" : "easy",
          };
        }
      }
    }
  }

  return out;
}

export function getColdStartModuleBoost(
  ctx: GlobalPlanContext,
  ageBand: AgeBand,
): Partial<Record<import("../types.js").ModuleId, number>> | undefined {
  if (!ctx.isColdStart) return undefined;
  const path = assignColdStartPath(getGlobalGraph(), getCommunityPatterns(getGlobalGraph()), ageBand);
  return coldStartModulePriority(path);
}

export function toGlobalApiPayload(ctx: GlobalPlanContext): GlobalApiPayload {
  return { globalInsights: ctx.insights };
}

export function mergeGlobalIntoPreSessionBoost(
  existing: Partial<Record<import("../types.js").ModuleId, number>> | undefined,
  ctx: GlobalPlanContext,
  ageBand: AgeBand,
): Partial<Record<import("../types.js").ModuleId, number>> {
  const cold = getColdStartModuleBoost(ctx, ageBand);
  if (!cold) return existing ?? {};
  return { ...existing, ...cold };
}
