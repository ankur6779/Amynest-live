import { trackPoolExhausted } from "./analytics.js";
import { computeTargetDifficulty } from "./adaptiveEngine.js";
import { MemoryCacheAdapter } from "./cache/memoryCache.js";
import {
  buildV2CacheKeyInput,
  dailyPlanV2CacheKey,
  explorationSeedFromInputs,
} from "./cache/planCacheKey.js";
import { computeAge } from "./ageEngine.js";
import {
  isPoolExhausted,
  selectContentRanked,
  shouldTriggerExploration,
} from "./contentEngine.js";
import { DEFAULT_ANTI_REPETITION, DAILY_PLAN_CACHE_TTL_SECONDS } from "./config/global-defaults.js";
import { getCountryLearningProfile } from "./config/country-learning-profile.js";
import { resolveExperimentVariant } from "./config/experiments.js";
import {
  ensureLearningProfile,
  getSkillProfileVersion,
} from "./learningProfileEngine.js";
import { filterEligibleModules } from "./moduleEngine.js";
import { evaluateMonetizationMoment } from "./monetizationEngine.js";
import { getPoolsForModule, indexPoolsByModule, MOCK_CONTENT_POOLS } from "./mock/content-pools.js";
import { assembleDailyPlan, buildLowContentFallback } from "./rotationEngine.js";
import { buildSessionPlan, sessionFingerprint } from "./sessionEngine.js";
import { enrichPoolsFromTemplates } from "./templateEngine.js";
import { dateSeed } from "./utils/seededShuffle.js";
import type {
  CacheAdapter,
  ContentHistoryEntry,
  ContentPool,
  CountryCode,
  ModuleId,
} from "./types.js";
import type {
  DailyPlanV2,
  GetDailyPlanV2Input,
  LearningProfile,
  LearningProfileStore,
  RankedContentItem,
} from "./types-v2.js";
import { rankContent } from "./contentEngine.js";
import {
  ensurePersonalityProfile,
  personalitySnapshot,
  applyPersonalityDriftResponse,
} from "./ml/personalityEngine.js";
import {
  ensureLearningPath,
  learningPathSummary,
  updateLearningPathAfterSession,
  reEvaluateLearningPath,
} from "./ml/learningPathEngine.js";
import { getSegmentModelRegistry } from "./ml/segmentModels.js";
import {
  runPrediction,
  toPredictionApiSnapshot,
} from "./ml/predictionEngine.js";
import { generatePlanUsingPrediction } from "./ml/preSessionPlanner.js";
import { forecastFuturePath } from "./ml/learningPathEngine.js";
import { getLastSessionSummaries } from "./ml/sessionHistoryStore.js";
import type {
  LearningPath,
  PersonalityProfile,
  PersonalityProfileStore,
  LearningPathStore,
} from "./ml/types-personality.js";
import type { PredictionStore } from "./ml/types-prediction.js";
import {
  ensureGlobalGraphLoaded,
  enhancePredictionWithGlobal,
  getGlobalPlanContext,
  mergeGlobalIntoPreSessionBoost,
} from "./ml/globalOrchestrator.js";
import {
  buildEffectiveRuntimeConfig,
  ensureMetaLayerReady,
} from "./ml/metaOrchestrator.js";

const defaultCache = new MemoryCacheAdapter();
const defaultProfileStore: LearningProfileStore = {
  async get() {
    return null;
  },
  async upsert(profile) {
    return profile;
  },
};

const memoryPersonality = new Map<string, PersonalityProfile>();
const memoryLearningPaths = new Map<string, LearningPath>();

const defaultPersonalityStore: PersonalityProfileStore = {
  async get(childId) {
    return memoryPersonality.get(childId) ?? null;
  },
  async upsert(profile) {
    memoryPersonality.set(profile.childId, profile);
    return profile;
  },
};

const defaultLearningPathStore: LearningPathStore = {
  async get(childId) {
    return memoryLearningPaths.get(childId) ?? null;
  },
  async upsert(path) {
    memoryLearningPaths.set(path.childId, path);
    return path;
  },
};

function todayIso(ref = new Date()): string {
  return ref.toISOString().slice(0, 10);
}

async function loadProfile(
  input: GetDailyPlanV2Input,
): Promise<LearningProfile> {
  const store = input.profileStore ?? defaultProfileStore;
  const existing = await store.get(input.childId);
  return ensureLearningProfile(existing, input.childId, input.userId);
}

/**
 * V2 adaptive daily plan pipeline:
 * age → profile → adaptive difficulty → ranked content → session → plan
 */
export async function getDailyPlanV2(input: GetDailyPlanV2Input): Promise<DailyPlanV2> {
  const dateIso = input.dateIso ?? todayIso();
  const cache = input.cache ?? defaultCache;
  const profile = await loadProfile(input);
  const personalityStore = input.personalityStore ?? defaultPersonalityStore;
  const learningPathStore = input.learningPathStore ?? defaultLearningPathStore;
  const storedPersonality = await personalityStore.get(input.childId);
  const prevPersonalityTraits = storedPersonality
    ? { ...storedPersonality.traits }
    : undefined;
  let personality = ensurePersonalityProfile(storedPersonality, input.childId);
  const profileVersion = getSkillProfileVersion(profile);
  const explorationSeed = explorationSeedFromInputs(
    input.childId,
    dateIso,
    profileVersion,
  );
  await ensureMetaLayerReady();
  const metaRuntime = buildEffectiveRuntimeConfig(input.childId);
  const experiment = resolveExperimentVariant(
    input.childId,
    metaRuntime.experimentFlags,
    input.experimentBucket,
  );
  const tunedExplorationRate = metaRuntime.explorationRate;
  const countryProfile = getCountryLearningProfile(input.countryCode);
  const explorationTriggered = shouldTriggerExploration(
    profile,
    countryProfile.explorationBias,
    tunedExplorationRate,
    explorationSeed,
  );

  const cacheKey = dailyPlanV2CacheKey(
    buildV2CacheKeyInput({
      childId: input.childId,
      dateIso,
      countryCode: input.countryCode,
      unlockedModules: input.unlockedModules,
      skillProfileVersion: profileVersion,
      explorationSeed,
    }),
  );

  if (!input.bypassCache) {
    const cached = await cache.get<DailyPlanV2>(cacheKey);
    if (cached) return cached;
  }

  const age = computeAge({
    childDOB: input.childDOB,
    countryCode: input.countryCode,
    referenceDate: new Date(dateIso),
  });

  let learningPath = ensureLearningPath(
    await learningPathStore.get(input.childId),
    input.childId,
    profile,
    age.ageBand,
  );

  ensureGlobalGraphLoaded();
  const globalPlanCtx = getGlobalPlanContext(
    input.countryCode,
    age.ageBand,
    personality,
    profile,
  );

  let predictionOutput = runPrediction(
    {
      childId: input.childId,
      profile,
      personality,
      learningPath,
      sessionHistory: getLastSessionSummaries(input.childId),
    },
    explorationSeed,
  );
  predictionOutput = enhancePredictionWithGlobal(
    predictionOutput,
    globalPlanCtx,
    profile,
    age.ageBand,
  );

  const preSessionPlan = generatePlanUsingPrediction(predictionOutput, {
    personality,
    learningPath,
  });
  const globalModuleBoost = mergeGlobalIntoPreSessionBoost(
    preSessionPlan.modulePriorityBoost,
    globalPlanCtx,
    age.ageBand,
  );
  if (Object.keys(globalModuleBoost).length > 0) {
    preSessionPlan.modulePriorityBoost = globalModuleBoost;
  }
  const futurePath = forecastFuturePath(learningPath, profile, predictionOutput);

  const predictionStore = input.predictionStore;
  if (predictionStore) {
    await predictionStore.save({
      childId: input.childId,
      predictedSkills: predictionOutput.nextSkillLevels,
      dropOffRisk: predictionOutput.predictedDropOffRisk,
      engagementScore: predictionOutput.predictedEngagement,
      confidence: predictionOutput.confidence,
      createdAt: new Date().toISOString(),
    });
  }

  let poolsByModule =
    input.contentPoolsOverride
      ? indexPoolsFromCatalog(input.contentPoolsOverride, age.ageBand, input.countryCode)
      : indexPoolsByModule(age.ageBand, input.countryCode);

  for (const moduleId of Object.keys(poolsByModule) as ModuleId[]) {
    const pools = poolsByModule[moduleId] ?? [];
    poolsByModule[moduleId] = enrichPoolsFromTemplates(pools, input.childId, dateIso);
  }

  const history = input.history ?? [];
  const antiRepetition = DEFAULT_ANTI_REPETITION;
  const rankedByModule = new Map<ModuleId, RankedContentItem[]>();

  const eligible = filterEligibleModules({
    age,
    countryCode: input.countryCode,
    unlockedModules: input.unlockedModules,
  });

  for (const mod of eligible) {
    const pools = poolsByModule[mod.moduleId] ?? [];
    if (
      isPoolExhausted(
        pools,
        history.filter((h) => h.moduleId === mod.moduleId),
        new Date(dateIso),
        antiRepetition,
      )
    ) {
      trackPoolExhausted(input.childId, mod.moduleId);
    }

    const adaptive = computeTargetDifficulty(
      profile,
      mod.moduleId,
      explorationSeed + mod.moduleId.length,
      explorationTriggered ? 0.2 : 0.12,
    );

    let targetDifficulty = adaptive.targetDifficulty;
    if (preSessionPlan.difficultyBaseline && mod.moduleId === learningPath.currentTrack) {
      targetDifficulty = preSessionPlan.difficultyBaseline;
    }
    if (explorationTriggered && mod.previewOnly) {
      targetDifficulty = "hard";
    }

    const count = mod.previewOnly ? 2 : 4;
    const selected = selectContentRanked({
      childId: input.childId,
      moduleId: mod.moduleId,
      ageBand: age.ageBand,
      countryCode: input.countryCode,
      count,
      history: history.filter((h) => h.moduleId === mod.moduleId),
      pool: pools,
      antiRepetition,
      referenceDate: new Date(dateIso),
      profile,
      targetDifficulty,
      explorationMode: explorationTriggered,
      globalPlan: globalPlanCtx,
    });

    const items = pools.flatMap((p) => p.contentVariants);
    const ranked = rankContent(
      items,
      history.filter((h) => h.moduleId === mod.moduleId),
      new Date(dateIso),
      targetDifficulty,
      profile,
      mod.moduleId,
      explorationTriggered ? 0.9 : 0.3,
      undefined,
      {
        learningPath,
        personality,
        modulePriorityBoost: preSessionPlan.modulePriorityBoost,
        globalPlan: globalPlanCtx,
      },
    );
    const selectedIds = new Set(selected.map((s) => s.contentId));
    const mergedRanked = [
      ...ranked.filter((r) => selectedIds.has(r.contentId)),
      ...ranked.filter((r) => !selectedIds.has(r.contentId)),
    ];
    rankedByModule.set(mod.moduleId, mergedRanked.slice(0, count));
  }

  const sessionPlan = buildSessionPlan({
    rankedByModule,
    profile,
    explorationTriggered: explorationTriggered || preSessionPlan.explorationSlotBias > 0.1,
    seed: dateSeed(dateIso, input.childId) + profileVersion,
    personality,
    maxItems: preSessionPlan.maxSessionItems,
  });

  const basePlan = assembleDailyPlan({
    childId: input.childId,
    dateIso,
    age,
    countryCode: input.countryCode,
    poolsByModule,
    history,
    unlockedModules: input.unlockedModules,
    antiRepetition,
    referenceDate: new Date(dateIso),
  });

  let modules = basePlan.modules;
  if (basePlan.contentIds.length === 0) {
    modules = buildLowContentFallback({
      childId: input.childId,
      dateIso,
      age,
      countryCode: input.countryCode,
      poolsByModule,
      history,
      unlockedModules: input.unlockedModules,
      antiRepetition,
    });
  }

  const monetization = evaluateMonetizationMoment({
    profile,
    eligibleModules: eligible,
    unlockedModules: input.unlockedModules ?? [],
    explorationTriggered,
  });

  let finalSessionPlan = sessionPlan;
  let fingerprint = sessionFingerprint(sessionPlan);
  const lastFpKey = `session_fp:${input.childId}:${dateIso}`;
  const lastFp = await cache.get<string>(lastFpKey);
  if (lastFp === fingerprint && sessionPlan.length > 0) {
    const retryPlan = buildSessionPlan({
      rankedByModule,
      profile,
      explorationTriggered: true,
      seed: dateSeed(dateIso, input.childId) + profileVersion + 997,
      maxItems: sessionPlan.length,
      personality,
    });
    const retryFp = sessionFingerprint(retryPlan);
    if (retryFp !== fingerprint) {
      finalSessionPlan = retryPlan;
      fingerprint = retryFp;
    }
  }
  await cache.set(lastFpKey, fingerprint, DAILY_PLAN_CACHE_TTL_SECONDS);

  const primaryDifficulty = computeTargetDifficulty(
    profile,
    finalSessionPlan[0]?.moduleId ?? "phonics",
    explorationSeed,
  ).targetDifficulty;

  learningPath = reEvaluateLearningPath(learningPath, profile, age.ageBand);
  const drift = applyPersonalityDriftResponse(
    personality,
    prevPersonalityTraits ?? personality.traits,
    (d) => {
    if (d.drifted) {
      getSegmentModelRegistry().boostExplorationWeight(
        `${age.ageBand}|${input.countryCode}|${age.developmentStage}`,
        d.explorationBoost,
      );
      learningPath = reEvaluateLearningPath(learningPath, profile, age.ageBand);
    }
    },
  ).drift;

  if (drift.drifted) {
    learningPath = updateLearningPathAfterSession(learningPath, profile, age.ageBand);
  }

  await personalityStore.upsert(personality);
  await learningPathStore.upsert(learningPath);

  const plan: DailyPlanV2 = {
    ...basePlan,
    modules,
    contentIds: finalSessionPlan.map((s) => s.contentId),
    cacheKey,
    sessionPlan: finalSessionPlan,
    skillSnapshot: { ...profile.skills },
    personalizationMeta: {
      difficultyUsed: primaryDifficulty,
      explorationTriggered,
      explorationRate: tunedExplorationRate,
      experimentVariant: experiment.variantLabel,
      profileVersion,
    },
    monetization: monetization.showPremiumTeaser ? monetization : undefined,
    sessionFingerprint: fingerprint,
    personalitySnapshot: personalitySnapshot(personality),
    learningPath: learningPathSummary(learningPath),
    prediction: toPredictionApiSnapshot(
      predictionOutput,
      futurePath.nextMilestones.map((m) => m.goal),
    ),
    globalInsights: {
      recommendedPath: globalPlanCtx.insights.recommendedPath,
      cohortMatchScore: globalPlanCtx.insights.cohortMatchScore,
    },
  };

  await cache.set(cacheKey, plan, DAILY_PLAN_CACHE_TTL_SECONDS);
  return plan;
}


const ALL_MODULE_IDS: ModuleId[] = [
  "phonics",
  "motor_skills",
  "social_emotional",
  "language",
  "cognitive",
  "creativity",
  "stories",
  "puzzles",
];

function indexPoolsFromCatalog(
  catalog: ContentPool[],
  ageBand: import("./types.js").AgeBand,
  countryCode: CountryCode,
): Partial<Record<ModuleId, ContentPool[]>> {
  const result: Partial<Record<ModuleId, ContentPool[]>> = {};
  for (const moduleId of ALL_MODULE_IDS) {
    result[moduleId] = getPoolsForModule(moduleId, ageBand, countryCode, catalog);
  }
  return result;
}

export { loadProfile as loadLearningProfileForPlan };
