import { computeAge } from "../src/ageEngine.js";
import { MemoryCacheAdapter } from "../src/cache/memoryCache.js";
import { processSessionFeedback } from "../src/feedbackEngine.js";
import { createDefaultLearningProfile } from "../src/learningProfileEngine.js";
import { getDailyPlanV2 } from "../src/orchestrator-v2.js";
import { RealtimeCoordinator } from "../src/realtime/realtimeCoordinator.js";
import type { RealtimeEvent, RealtimeEventType } from "../src/realtime/types.js";
import {
  ensurePersonalityProfile,
  updatePersonalityFromEvents,
} from "../src/ml/personalityEngine.js";
import { runPrediction } from "../src/ml/predictionEngine.js";
import { processTutorTurn, clearTutorState } from "../src/aiTutor/tutorEngine.js";
import { topicFromContentItem } from "../src/aiTutor/hybridTutor.js";
import {
  refreshFamilyIntelligence,
  enhancePredictionWithFamily,
} from "../src/ml/familyOrchestrator.js";
import type { ChildFamilySnapshot } from "../src/ml/types-family.js";
import {
  ensureGlobalGraphLoaded,
  getGlobalPlanContext,
  enhancePredictionWithGlobal,
} from "../src/ml/globalOrchestrator.js";
import {
  getActiveTuningParameters,
  runMetaLearningCycle,
  resetMetaLearningState,
} from "../src/ml/metaLearningController.js";
import { buildEffectiveRuntimeConfig } from "../src/ml/metaOrchestrator.js";
import {
  resetGlobalTrainingPipeline,
  getGlobalTrainingPipeline,
} from "../src/ml/trainingPipeline.js";
import { clearMlMetrics, recordMlMetricSample } from "../src/ml/metrics.js";
import { clearBanditState } from "../src/ml/nbaEngine.js";
import { resetSegmentModelRegistry } from "../src/ml/segmentModels.js";
import { clearAutoExperiments } from "../src/ml/autoExperimentEngine.js";
import { resetModelManager } from "../src/ml/modelManager.js";
import { clearGlobalGraphCache } from "../src/ml/globalGraphEngine.js";
import { resetGlobalBatchState } from "../src/ml/globalBatchProcessor.js";
import { resetFeedbackOrchestrator } from "../src/ml/feedbackOrchestrator.js";
import { clearFailSafe } from "../src/ml/failSafeGovernance.js";
import {
  configureDeploymentSafety,
  ML_ROLLOUT_STAGES,
  resetDeploymentSafety,
} from "../src/ml/deploymentSafety.js";
import {
  clearNbaDecisionHooks,
  onNbaDecision,
} from "../src/ml/nbaDecisionHooks.js";
import {
  clearHumanOverride,
  setHumanOverride,
} from "../src/ml/metaOrchestrator.js";
import type {
  LearningProfile,
  LearningProfileStore,
  SessionPlanItem,
} from "../src/types-v2.js";
import type {
  LearningPath,
  LearningPathStore,
  PersonalityProfile,
  PersonalityProfileStore,
} from "../src/ml/types-personality.js";
import type {
  ChildSimulationResult,
  FullSimulationResult,
  MlRewardBreakdown,
  MlVsRuleBreakdown,
  MultiModeSimulationResult,
  OptimizationComparison,
  SimChildConfig,
  SimDecisionSample,
  SimMlMode,
  SimMlModeConfig,
} from "./simulationTypes.js";
import type { ModuleId } from "../src/types.js";
import type { DifficultyLevel } from "../src/types-v2.js";

export const SIM_CHILD_PROFILES: SimChildConfig[] = [
  {
    id: "child_a",
    label: "Child A — fast learner, high curiosity",
    archetype: "fast_curiosity",
    ageMonths: 54,
    countryCode: "IN",
    completionRate: 0.88,
    skipRate: 0.05,
    idleRate: 0.03,
    mistakeRate: 0.12,
    responseTimeMs: { min: 800, max: 2200 },
    engagementBias: 0.85,
  },
  {
    id: "child_b",
    label: "Child B — slow learner, high distractibility",
    archetype: "slow_distractible",
    ageMonths: 42,
    countryCode: "US",
    completionRate: 0.55,
    skipRate: 0.18,
    idleRate: 0.14,
    mistakeRate: 0.35,
    responseTimeMs: { min: 3500, max: 9000 },
    engagementBias: 0.4,
  },
  {
    id: "child_c",
    label: "Child C — average learner, high persistence",
    archetype: "persistent_avg",
    ageMonths: 48,
    countryCode: "UK",
    completionRate: 0.72,
    skipRate: 0.08,
    idleRate: 0.06,
    mistakeRate: 0.22,
    responseTimeMs: { min: 1800, max: 4500 },
    engagementBias: 0.62,
  },
  {
    id: "child_d",
    label: "Child D — high boredom, low engagement",
    archetype: "bored_low_engagement",
    ageMonths: 60,
    countryCode: "AU",
    completionRate: 0.4,
    skipRate: 0.12,
    idleRate: 0.28,
    mistakeRate: 0.3,
    responseTimeMs: { min: 4000, max: 12000 },
    engagementBias: 0.28,
  },
  {
    id: "child_e",
    label: "Child E — chaotic behavior",
    archetype: "chaotic",
    ageMonths: 50,
    countryCode: "IN",
    completionRate: 0.55,
    skipRate: 0.22,
    idleRate: 0.15,
    mistakeRate: 0.4,
    responseTimeMs: { min: 500, max: 11000 },
    engagementBias: 0.45,
  },
  {
    id: "child_f",
    label: "Child F — plateau learner",
    archetype: "plateau_learner",
    ageMonths: 52,
    countryCode: "US",
    completionRate: 0.75,
    skipRate: 0.1,
    idleRate: 0.08,
    mistakeRate: 0.2,
    responseTimeMs: { min: 1500, max: 4000 },
    engagementBias: 0.58,
  },
];

const SESSIONS_PER_CHILD = 10;
const INTERACTIONS_MIN = 20;
const INTERACTIONS_MAX = 30;
const NOISE_RATE_MIN = 0.1;
const NOISE_RATE_MAX = 0.15;

export const SIM_ML_MIN_WEIGHT_BY_MODE: Record<SimMlMode, number> = {
  aggressive: 0.55,
  balanced: 0.3,
  conservative: 0.12,
};

export const SIM_ML_MODE_CONFIG: Record<SimMlMode, SimMlModeConfig> = {
  aggressive: {
    mode: "aggressive",
    label: "Mode A — Aggressive ML",
    mlConfidenceThreshold: 0.12,
  },
  balanced: {
    mode: "balanced",
    label: "Mode B — Balanced (PRIMARY)",
    mlConfidenceThreshold: 0.5,
  },
  conservative: {
    mode: "conservative",
    label: "Mode C — Conservative ML",
    mlConfidenceThreshold: 0.75,
  },
};

export const SIM_ML_CONFIDENCE_CALIBRATION: Record<SimMlMode, number> = {
  aggressive: 0,
  balanced: -0.14,
  conservative: -0.22,
};

export const SIM_ML_TRAFFIC_BY_MODE: Record<SimMlMode, number> = {
  aggressive: 1,
  balanced: 1,
  conservative: 0.6,
};

export function getMinMlWeightForMode(mode: SimMlMode = "balanced"): number {
  return SIM_ML_MIN_WEIGHT_BY_MODE[mode];
}

export function getMlConfidenceThreshold(mode: SimMlMode = "balanced"): number {
  return SIM_ML_MODE_CONFIG[mode].mlConfidenceThreshold;
}

export function getMlConfidenceCalibration(mode: SimMlMode = "balanced"): number {
  return SIM_ML_CONFIDENCE_CALIBRATION[mode];
}

export function getMlTrafficForMode(mode: SimMlMode = "balanced"): number {
  return SIM_ML_TRAFFIC_BY_MODE[mode];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function effectiveRatesForSession(
  cfg: SimChildConfig,
  sessionIndex: number,
  rand: () => number,
): { skipRate: number; idleRate: number; completionRate: number } {
  if (cfg.archetype === "chaotic") {
    const fastPhase = sessionIndex % 2 === 0;
    return {
      skipRate: 0.1 + rand() * 0.3,
      idleRate: 0.05 + rand() * 0.2,
      completionRate: fastPhase ? 0.75 : 0.35,
    };
  }
  if (cfg.archetype === "plateau_learner") {
    const early = sessionIndex < 3;
    return {
      skipRate: early ? cfg.skipRate * 0.5 : cfg.skipRate * 1.4,
      idleRate: early ? cfg.idleRate * 0.5 : cfg.idleRate * 1.3,
      completionRate: early ? 0.88 : 0.52,
    };
  }
  return {
    skipRate: cfg.skipRate,
    idleRate: cfg.idleRate,
    completionRate: cfg.completionRate,
  };
}

function pickEventType(
  cfg: SimChildConfig,
  rand: () => number,
  sessionIndex: number,
): RealtimeEventType {
  const rates = effectiveRatesForSession(cfg, sessionIndex, rand);
  const r = rand();
  if (r < rates.idleRate) return "USER_IDLE";
  if (r < rates.idleRate + rates.skipRate) return "CONTENT_SKIPPED";
  if (r < rates.idleRate + rates.skipRate + 0.08) return "RAPID_INTERACTION";
  if (
    r <
    rates.idleRate + rates.skipRate + 0.08 + rates.completionRate * 0.85
  ) {
    return "CONTENT_COMPLETED";
  }
  return "CONTENT_STARTED";
}

export function generateRealtimeEvent(
  cfg: SimChildConfig,
  sessionPlan: SessionPlanItem[],
  eventIndex: number,
  sessionSeed: number,
  sessionIndex = 0,
  injectNoise = false,
): RealtimeEvent {
  const rand = seededRandom(sessionSeed + eventIndex * 17 + cfg.id.length);
  const slot = sessionPlan[eventIndex % sessionPlan.length] ?? sessionPlan[0]!;
  const type = pickEventType(cfg, rand, sessionIndex);
  let minRt = cfg.responseTimeMs.min;
  let maxRt = cfg.responseTimeMs.max;
  if (cfg.archetype === "chaotic") {
    const fast = eventIndex % 2 === 0;
    minRt = fast ? 400 : 4000;
    maxRt = fast ? 2000 : 12000;
  }
  const responseTime = minRt + rand() * (maxRt - minRt);
  const correct = rand() > cfg.mistakeRate;

  let event: RealtimeEvent = {
    type,
    childId: cfg.id,
    contentId: slot.contentId,
    moduleId: slot.moduleId,
    timestamp: sessionSeed * 1000 + eventIndex * 1000,
    metadata: {
      responseTime,
      tapCount: type === "RAPID_INTERACTION" ? 6 + Math.floor(rand() * 6) : 1,
      duration: Math.round(responseTime / 1000),
      correct,
    },
  };

  if (injectNoise) {
    const noiseRand = seededRandom(sessionSeed + eventIndex * 31 + 999);
    const noiseRate =
      NOISE_RATE_MIN + noiseRand() * (NOISE_RATE_MAX - NOISE_RATE_MIN);
    if (noiseRand() < noiseRate) {
      event = applyEventNoise(event, noiseRand);
    }
  }

  return event;
}

/** Inject 10–15% noisy events: missing metadata, inconsistent signals, delayed timestamps. */
function applyEventNoise(event: RealtimeEvent, rand: () => number): RealtimeEvent {
  const kind = rand();
  if (kind < 0.34) {
    return { ...event, metadata: undefined };
  }
  if (kind < 0.67) {
    return {
      ...event,
      type: event.type === "CONTENT_COMPLETED" ? "CONTENT_SKIPPED" : "CONTENT_COMPLETED",
      metadata: event.metadata
        ? { ...event.metadata, correct: !event.metadata.correct }
        : { responseTime: 0, tapCount: 1, duration: 0, correct: false },
    };
  }
  return {
    ...event,
    timestamp: event.timestamp - (3_000 + Math.floor(rand() * 12_000)),
  };
}

const DIFFICULTY_LEVEL: Record<DifficultyLevel, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function difficultyToLevel(d: DifficultyLevel): number {
  return DIFFICULTY_LEVEL[d] ?? 1;
}

function decisionReward(source: "ml" | "rule", confidence: number): number {
  return source === "ml"
    ? Math.min(1, confidence * 0.7 + 0.22)
    : Math.min(1, confidence * 0.45 + 0.12);
}

function buildDecisionContextKey(
  event: RealtimeEvent,
  isNegative: boolean,
): string {
  return `${event.moduleId}|${isNegative ? "neg" : "pos"}`;
}

/** Burst noise: 5–8 consecutive corrupted events with missing metadata and inconsistent signals. */
function applyBurstNoise(event: RealtimeEvent, rand: () => number): RealtimeEvent {
  const kind = rand();
  if (kind < 0.4) {
    return {
      ...event,
      metadata: undefined,
      type: event.type === "CONTENT_COMPLETED" ? "USER_IDLE" : event.type,
    };
  }
  if (kind < 0.75) {
    return {
      ...event,
      type: event.type === "CONTENT_COMPLETED" ? "CONTENT_SKIPPED" : "CONTENT_COMPLETED",
      metadata: {
        responseTime: rand() * 20_000,
        tapCount: Math.floor(rand() * 20),
        duration: 0,
        correct: !event.metadata?.correct,
      },
    };
  }
  return {
    ...event,
    timestamp: event.timestamp - (5_000 + Math.floor(rand() * 15_000)),
    metadata: undefined,
  };
}

function applySimulatedLatency(
  event: RealtimeEvent,
  delayMs: number,
  cumulativeDelay: number,
): RealtimeEvent {
  return {
    ...event,
    timestamp: event.timestamp + cumulativeDelay + delayMs,
    metadata: {
      ...event.metadata,
      responseTime: (event.metadata?.responseTime ?? 0) + delayMs,
      simulatedDelayMs: delayMs,
    },
  };
}

function isPersonalityInfluencedDecision(
  action: string,
  traits: import("./simulationTypes.js").PersonalityTraits,
): boolean {
  if (action === "NOOP") return false;
  if (action === "SHORTEN_SESSION" && traits.distractibility >= 0.45) return true;
  if (action === "SWAP_CONTENT" && traits.curiosity >= 0.42) return true;
  if (action === "ADJUST_DIFFICULTY" && traits.persistence >= 0.45) return true;
  if (action === "INJECT_REWARD" && traits.distractibility >= 0.4) return true;
  if (traits.curiosity >= 0.5 && action === "SWAP_CONTENT") return true;
  return false;
}

export type SimulationDecisionTracker = {
  breakdown: MlVsRuleBreakdown;
  mlRewardBreakdown: MlRewardBreakdown;
  reset(): void;
};

export function createSimulationDecisionTracker(): SimulationDecisionTracker & {
  dispose(): void;
} {
  const breakdown: MlVsRuleBreakdown = { ml: 0, rule: 0 };
  const mlRewardBreakdown: MlRewardBreakdown = {
    mlRewardSum: 0,
    mlRewardCount: 0,
    ruleRewardSum: 0,
    ruleRewardCount: 0,
    mlAdjustedSum: 0,
    mlAdjustedCount: 0,
    ruleAdjustedSum: 0,
    ruleAdjustedCount: 0,
  };
  const unsub = onNbaDecision((p) => {
    const reward = p.used
      ? Math.min(1, p.confidence * 0.7 + 0.22)
      : Math.min(1, p.confidence * 0.45 + 0.12);
    if (p.used) {
      breakdown.ml += 1;
      mlRewardBreakdown.mlRewardSum += reward;
      mlRewardBreakdown.mlRewardCount += 1;
    } else {
      breakdown.rule += 1;
      mlRewardBreakdown.ruleRewardSum += reward;
      mlRewardBreakdown.ruleRewardCount += 1;
    }
  });
  return {
    breakdown,
    mlRewardBreakdown,
    reset() {
      breakdown.ml = 0;
      breakdown.rule = 0;
      mlRewardBreakdown.mlRewardSum = 0;
      mlRewardBreakdown.mlRewardCount = 0;
      mlRewardBreakdown.ruleRewardSum = 0;
      mlRewardBreakdown.ruleRewardCount = 0;
      mlRewardBreakdown.mlAdjustedSum = 0;
      mlRewardBreakdown.mlAdjustedCount = 0;
      mlRewardBreakdown.ruleAdjustedSum = 0;
      mlRewardBreakdown.ruleAdjustedCount = 0;
    },
    dispose() {
      unsub();
    },
  };
}

const RELATED_MODULES: Record<ModuleId, ModuleId[]> = {
  phonics: ["phonics", "language", "stories"],
  language: ["phonics", "language", "stories", "creativity"],
  motor_skills: ["motor_skills", "cognitive"],
  cognitive: ["cognitive", "puzzles", "motor_skills"],
  puzzles: ["cognitive", "puzzles"],
  social_emotional: ["social_emotional", "creativity", "stories"],
  creativity: ["social_emotional", "creativity", "language"],
  stories: ["stories", "language", "social_emotional"],
};

function isUnrelatedModuleSwap(from: ModuleId, to: ModuleId): boolean {
  if (from === to) return false;
  return !RELATED_MODULES[from]?.includes(to);
}

function computeSessionCoherence(plan: import("../src/types-v2.js").DailyPlanV2): number {
  const modules = plan.sessionPlan.map((s) => s.moduleId);
  if (modules.length <= 1) return 1;
  let unrelatedJumps = 0;
  for (let i = 1; i < modules.length; i++) {
    const prev = modules[i - 1]!;
    const cur = modules[i]!;
    if (prev === cur) continue;
    const related = RELATED_MODULES[prev]?.includes(cur);
    if (!related) unrelatedJumps += 1;
  }
  return Math.max(0, 1 - unrelatedJumps / (modules.length - 1));
}

function isMajorAdaptation(action: string): boolean {
  return (
    action === "ADJUST_DIFFICULTY" ||
    action === "SWAP_CONTENT" ||
    action === "SHORTEN_SESSION"
  );
}

function createInMemoryStores() {
  const profiles = new Map<string, LearningProfile>();
  const personalities = new Map<string, PersonalityProfile>();
  const paths = new Map<string, LearningPath>();

  const profileStore: LearningProfileStore = {
    async get(childId) {
      return profiles.get(childId) ?? null;
    },
    async upsert(profile) {
      profiles.set(profile.childId, profile);
      return profile;
    },
  };

  const personalityStore: PersonalityProfileStore = {
    async get(childId) {
      return personalities.get(childId) ?? null;
    },
    async upsert(p) {
      personalities.set(p.childId, p);
      return p;
    },
  };

  const learningPathStore: LearningPathStore = {
    async get(childId) {
      return paths.get(childId) ?? null;
    },
    async upsert(p) {
      paths.set(p.childId, p);
      return p;
    },
  };

  return { profiles, personalities, paths, profileStore, personalityStore, learningPathStore };
}

export function resetSimulationEnvironment(): void {
  clearTutorState();
  clearBanditState("");
  resetSegmentModelRegistry();
  resetGlobalTrainingPipeline();
  clearMlMetrics();
  clearGlobalGraphCache();
  resetGlobalBatchState();
  resetFeedbackOrchestrator();
  resetMetaLearningState();
  clearAutoExperiments();
  resetModelManager();
  clearFailSafe();
  resetDeploymentSafety();
  configureDeploymentSafety({
    rolloutStageIndex: ML_ROLLOUT_STAGES.length - 1,
    forceRuleFallback: false,
  });
  clearNbaDecisionHooks();
  clearHumanOverride();
  ensureGlobalGraphLoaded();
}

function childDobFromAgeMonths(ageMonths: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - ageMonths);
  return d;
}

async function simulateChild(
  cfg: SimChildConfig,
  stores: ReturnType<typeof createInMemoryStores>,
  coordinator: RealtimeCoordinator,
  history: import("../src/types.js").ContentHistoryEntry[],
  options?: {
    injectNoise?: boolean;
    simulateLatency?: boolean;
    burstNoiseMode?: boolean;
  },
): Promise<ChildSimulationResult> {
  const age = computeAge({
    childDOB: childDobFromAgeMonths(cfg.ageMonths),
    countryCode: cfg.countryCode,
  });

  let profile =
    stores.profiles.get(cfg.id) ??
    createDefaultLearningProfile(cfg.id, "family_sim");
  profile.behavior.engagementScore = Math.round(40 + cfg.engagementBias * 50);
  profile.adaptability.noveltyPreference = cfg.archetype === "fast_curiosity" ? 0.75 : 0.45;
  profile.adaptability.difficultyTolerance =
    cfg.archetype === "slow_distractible" ? 0.35 : 0.55;
  await stores.profileStore.upsert(profile);

  let personality = ensurePersonalityProfile(
    stores.personalities.get(cfg.id),
    cfg.id,
  );
  if (cfg.archetype === "fast_curiosity") {
    personality.traits.curiosity = 0.52;
    personality.traits.persistence = 0.62;
    personality.traits.distractibility = 0.28;
  } else if (cfg.archetype === "slow_distractible") {
    personality.traits.curiosity = 0.42;
    personality.traits.persistence = 0.38;
    personality.traits.distractibility = 0.82;
  } else if (cfg.archetype === "persistent_avg") {
    personality.traits.curiosity = 0.52;
    personality.traits.persistence = 0.8;
    personality.traits.distractibility = 0.4;
  } else if (cfg.archetype === "chaotic") {
    personality.traits.curiosity = 0.55;
    personality.traits.persistence = 0.4;
    personality.traits.distractibility = 0.6;
  } else if (cfg.archetype === "plateau_learner") {
    personality.traits.curiosity = 0.5;
    personality.traits.persistence = 0.7;
    personality.traits.distractibility = 0.42;
  } else if (cfg.archetype === "bored_low_engagement") {
    personality.traits.curiosity = 0.32;
    personality.traits.persistence = 0.38;
    personality.traits.distractibility = 0.42;
  } else {
    personality.traits.curiosity = 0.35;
    personality.traits.persistence = 0.45;
    personality.traits.distractibility = 0.55;
  }
  await stores.personalityStore.upsert(personality);

  const sessions: ChildSimulationResult["sessions"] = [];
  const personalitySnapshots: ChildSimulationResult["personalitySnapshots"] = [];
  let mlDecisions = 0;
  let ruleDecisions = 0;
  const sessionRewards: number[] = [];
  const predictions: ChildSimulationResult["predictions"] = [];
  const tutorModes: string[] = [];
  const tutorMessages: string[] = [];
  const tutorTurnSequence: string[] = [];
  const difficultyLevels: ChildSimulationResult["difficultyLevels"] = [];
  let personalityInfluencedDecisions = 0;
  let totalAdaptiveDecisions = 0;

  const cache = new MemoryCacheAdapter();
  const rand = seededRandom(cfg.id.length * 997);

  for (let s = 0; s < SESSIONS_PER_CHILD; s++) {
    const dateIso = `2026-01-${String(s + 1).padStart(2, "0")}`;
    const plan = await getDailyPlanV2({
      childId: cfg.id,
      childDOB: childDobFromAgeMonths(cfg.ageMonths),
      countryCode: cfg.countryCode,
      userId: "family_sim",
      dateIso,
      bypassCache: true,
      cache,
      history,
      profileStore: stores.profileStore,
      personalityStore: stores.personalityStore,
      learningPathStore: stores.learningPathStore,
      experimentBucket: cfg.id.charCodeAt(cfg.id.length - 1) % 2,
    });

    const recommendedDifficulty =
      plan.prediction?.recommendedDifficulty ?? plan.personalizationMeta.difficultyUsed;
    difficultyLevels.push(recommendedDifficulty);

    const pred = runPrediction({
      childId: cfg.id,
      profile: (await stores.profileStore.get(cfg.id))!,
      personality: await stores.personalityStore.get(cfg.id),
    });
    predictions.push(pred);

    coordinator.subscribe(cfg.id, {
      type: "subscribe",
      childId: cfg.id,
      sessionPlan: plan.sessionPlan,
      profile: (await stores.profileStore.get(cfg.id))!,
      ageBand: age.ageBand,
      developmentStage: age.developmentStage,
      countryCode: cfg.countryCode,
    });
    const live = coordinator.getSession(cfg.id);
    if (live) {
      live.personalityProfile =
        (await stores.personalityStore.get(cfg.id)) ?? live.personalityProfile;
      live.behavioralPrediction = pred;
    }

    const interactionCount =
      INTERACTIONS_MIN + Math.floor(rand() * (INTERACTIONS_MAX - INTERACTIONS_MIN + 1));
    const events: RealtimeEvent[] = [];
    const decisions: ChildSimulationResult["sessions"][0]["decisions"] = [];
    let negativeStreak = 0;
    let negativeSignalCountBeforeAdapt: number | null = null;
    const adaptationEvents: number[] = [];
    const adaptationLatencies: number[] = [];
    const adaptationDelayMs: number[] = [];
    const overreactionFlags: boolean[] = [];
    const decisionSamples: SimDecisionSample[] = [];
    const sessionTutorSequence: string[] = [];
    let eventsSinceNegative = 0;
    let inNegativeStreak = false;
    let maxNegativeStreak = 0;
    let noisyEventCount = 0;
    let burstNoiseApplied = false;
    let burstStabilityOk = true;
    let burstDifficultyDrops = 0;
    let burstRandomSwaps = 0;
    let cumulativeDelay = 0;
    let lastNegativeTimestamp: number | null = null;
    const latencyRand = seededRandom(s * 1000 + cfg.id.length * 13 + 7);
    const burstRand = seededRandom(s * 1000 + cfg.id.length * 19 + 3);
    const burstLen =
      options?.burstNoiseMode && interactionCount > 10
        ? 5 + Math.floor(burstRand() * 4)
        : 0;
    const burstStart =
      burstLen > 0
        ? 2 + Math.floor(burstRand() * Math.max(1, interactionCount - burstLen - 2))
        : -1;
    const sessionModule = plan.sessionPlan[0]?.moduleId ?? "phonics";

    for (let i = 0; i < interactionCount; i++) {
      const preNoise = generateRealtimeEvent(
        cfg,
        plan.sessionPlan,
        i,
        s * 1000 + cfg.id.length,
        s,
        false,
      );
      let event = generateRealtimeEvent(
        cfg,
        plan.sessionPlan,
        i,
        s * 1000 + cfg.id.length,
        s,
        options?.injectNoise ?? false,
      );
      if (options?.injectNoise && JSON.stringify(preNoise) !== JSON.stringify(event)) {
        noisyEventCount += 1;
      }
      if (
        options?.burstNoiseMode &&
        burstStart >= 0 &&
        i >= burstStart &&
        i < burstStart + burstLen
      ) {
        event = applyBurstNoise(event, burstRand);
        burstNoiseApplied = true;
        noisyEventCount += 1;
      }
      if (options?.simulateLatency) {
        const delayMs = 100 + Math.floor(latencyRand() * 401);
        if (i > 0 && i % 8 === 0) {
          const burstDelay = 50 + Math.floor(latencyRand() * 151);
          cumulativeDelay += burstDelay;
        }
        event = applySimulatedLatency(event, delayMs, cumulativeDelay);
        cumulativeDelay += delayMs;
      }
      events.push(event);
      if (
        event.type === "CONTENT_SKIPPED" ||
        event.type === "USER_IDLE" ||
        event.metadata?.correct === false
      ) {
        negativeStreak += 1;
        maxNegativeStreak = Math.max(maxNegativeStreak, negativeStreak);
      } else {
        negativeStreak = 0;
      }

      const isNegative =
        event.type === "CONTENT_SKIPPED" ||
        event.type === "USER_IDLE" ||
        event.metadata?.correct === false;

      if (isNegative) {
        if (!inNegativeStreak) {
          inNegativeStreak = true;
          eventsSinceNegative = 0;
        }
        eventsSinceNegative += 1;
        lastNegativeTimestamp = event.timestamp;
      } else if (inNegativeStreak) {
        inNegativeStreak = false;
      }

      coordinator.processEvent(event);
      const meta = coordinator.getLastDecisionMeta(cfg.id);
      const live = coordinator.getSession(cfg.id);
      const source = live?.lastDecisionSource ?? meta?.source ?? "rule";
      if (meta) {
        decisions.push(meta);
        if (source === "ml") mlDecisions += 1;
        else ruleDecisions += 1;
        const confidence = meta.confidence ?? 0.5;
        const reward = decisionReward(source, confidence);
        const diffLevel = difficultyToLevel(recommendedDifficulty);
        decisionSamples.push({
          source,
          reward,
          adjustedReward: reward / (1 + diffLevel),
          action: meta.action,
          contextKey: buildDecisionContextKey(event, isNegative),
        });
        const traits =
          (await stores.personalityStore.get(cfg.id))?.traits ?? personality.traits;
        if (meta.action !== "NOOP") {
          totalAdaptiveDecisions += 1;
          if (isPersonalityInfluencedDecision(meta.action, traits)) {
            personalityInfluencedDecisions += 1;
          }
        }
        if (
          meta.action !== "NOOP" &&
          negativeSignalCountBeforeAdapt === null &&
          negativeStreak >= 1
        ) {
          negativeSignalCountBeforeAdapt = negativeStreak;
        }
        if (meta.action !== "NOOP") {
          adaptationEvents.push(i);
          if (inNegativeStreak || eventsSinceNegative > 0) {
            adaptationLatencies.push(eventsSinceNegative || 1);
          }
          if (
            options?.simulateLatency &&
            lastNegativeTimestamp !== null
          ) {
            adaptationDelayMs.push(event.timestamp - lastNegativeTimestamp);
          }
          if (
            burstNoiseApplied &&
            i >= burstStart &&
            i < burstStart + burstLen + 2
          ) {
            const nbaAction = meta.nbaAction;
            if (
              nbaAction === "DECREASE_DIFFICULTY" &&
              difficultyToLevel(recommendedDifficulty) >= 1
            ) {
              burstDifficultyDrops += 1;
            }
            if (
              nbaAction === "SWAP_CONTENT" &&
              event.moduleId &&
              isUnrelatedModuleSwap(sessionModule, event.moduleId)
            ) {
              burstRandomSwaps += 1;
            }
          }
          if (
            eventsSinceNegative === 1 &&
            isMajorAdaptation(meta.action)
          ) {
            overreactionFlags.push(true);
          } else {
            overreactionFlags.push(false);
          }
          inNegativeStreak = false;
          eventsSinceNegative = 0;
          lastNegativeTimestamp = null;
        }
      }

      const p = await stores.personalityStore.get(cfg.id);
      if (p) {
        const updated = updatePersonalityFromEvents(p, events.slice(-8));
        await stores.personalityStore.upsert(updated);
      }
    }

    const endPersonality = await stores.personalityStore.get(cfg.id);
    if (endPersonality) {
      personalitySnapshots.push({ ...endPersonality.traits });
    }

    const contentIds = plan.sessionPlan.map((x) => x.contentId);
    const coherenceScore = computeSessionCoherence(plan);

    const slot = plan.sessionPlan[0];
    if (slot) {
      clearTutorState(cfg.id);
      const tutorStart = await processTutorTurn(
        cfg.id,
        {
          action: "start",
          topic: topicFromContentItem(slot, 2),
          contentItem: slot,
        },
        { personality: await stores.personalityStore.get(cfg.id), prediction: pred },
      );
      tutorModes.push(tutorStart.response.tutor.mode);
      tutorMessages.push(tutorStart.response.tutor.message);
      sessionTutorSequence.push(tutorStart.response.tutor.mode);
      tutorTurnSequence.push(tutorStart.response.tutor.mode);

      const answer = rand() < cfg.mistakeRate ? "wrong" : "correct answer";
      const tutorAnswer = await processTutorTurn(
        cfg.id,
        { action: "answer", childAnswer: answer },
        { personality: await stores.personalityStore.get(cfg.id), prediction: pred },
      );
      tutorModes.push(tutorAnswer.response.tutor.mode);
      tutorMessages.push(tutorAnswer.response.tutor.message);
      sessionTutorSequence.push(tutorAnswer.response.tutor.mode);
      tutorTurnSequence.push(tutorAnswer.response.tutor.mode);

      if (
        tutorAnswer.response.tutor.mode === "encourage" ||
        tutorAnswer.response.tutor.mode === "correct"
      ) {
        const tutorEnc = await processTutorTurn(
          cfg.id,
          { action: "repeat" },
          { personality: await stores.personalityStore.get(cfg.id), prediction: pred },
        );
        sessionTutorSequence.push(tutorEnc.response.tutor.mode);
        tutorTurnSequence.push(tutorEnc.response.tutor.mode);
      }
    }

    const underreactionFlag =
      maxNegativeStreak >= 3 && !decisions.some((d) => d.action !== "NOOP");

    if (burstNoiseApplied) {
      burstStabilityOk = burstDifficultyDrops < 3 && burstRandomSwaps < 3;
    }

    sessions.push({
      sessionIndex: s,
      plan,
      events,
      decisions,
      adaptationEvents,
      adaptationLatencies,
      adaptationDelayMs,
      overreactionFlags,
      underreactionFlag,
      noisyEventCount,
      burstNoiseApplied,
      burstStabilityOk,
      decisionSamples,
      coherenceScore,
      contentIds,
      tutorTurnSequence: sessionTutorSequence,
      recommendedDifficulty,
      negativeSignalCountBeforeAdapt,
      sessionEngagement: pred.predictedEngagement,
      sessionDropOffRisk: pred.predictedDropOffRisk,
    });

    const feedback = processSessionFeedback(
      await stores.profileStore.get(cfg.id),
      {
        childId: cfg.id,
        moduleId: plan.sessionPlan[0]?.moduleId ?? "phonics",
        contentId: plan.sessionPlan[0]?.contentId ?? "phonics_intro_1",
        completionRate: effectiveRatesForSession(cfg, s, rand).completionRate,
        timeSpentSec: 300 + Math.floor(rand() * 400),
        skips: Math.round(cfg.skipRate * 5),
        retries: cfg.archetype === "persistent_avg" ? 2 : 0,
        completed: rand() < effectiveRatesForSession(cfg, s, rand).completionRate,
      },
    );
    await stores.profileStore.upsert(feedback.profile);
    sessionRewards.push(
      feedback.profile.behavior.engagementScore / 100,
    );

    for (const cid of contentIds) {
      history.push({
        childId: cfg.id,
        contentId: cid,
        moduleId: plan.sessionPlan.find((p) => p.contentId === cid)?.moduleId ?? "phonics",
        lastSeenAt: new Date().toISOString(),
        seenCount: 1,
        completionStatus: rand() < cfg.completionRate ? "completed" : "skipped",
        engagementScore: Math.round(cfg.engagementBias * 100),
      });
    }
  }

  const finalProfile = (await stores.profileStore.get(cfg.id))!;
  const finalPersonality = (await stores.personalityStore.get(cfg.id))!;

  return {
    config: cfg,
    ageBand: age.ageBand,
    sessions,
    finalProfile,
    finalPersonality,
    personalitySnapshots,
    mlDecisions,
    ruleDecisions,
    sessionRewards,
    predictions,
    tutorModes,
    tutorMessages,
    tutorTurnSequence,
    difficultyLevels,
    personalityInfluencedDecisions,
    totalAdaptiveDecisions,
  };
}

function aggregateSimulationMetrics(children: ChildSimulationResult[]): {
  engagement: number;
  reward: number;
  dropOff: number;
  coherence: number;
  oscillation: number;
} {
  const engagement =
    children.reduce((a, c) => a + c.finalProfile.behavior.engagementScore, 0) /
    Math.max(1, children.length);
  const reward =
    children.flatMap((c) => c.sessionRewards).reduce((a, b) => a + b, 0) /
    Math.max(1, children.flatMap((c) => c.sessionRewards).length);
  const dropOff =
    children.flatMap((c) => c.predictions).reduce((a, p) => a + p.predictedDropOffRisk, 0) /
    Math.max(1, children.flatMap((c) => c.predictions).length);
  const coherence =
    children
      .flatMap((c) => c.sessions.map((s) => s.coherenceScore))
      .reduce((a, b) => a + b, 0) /
    Math.max(
      1,
      children.reduce((a, c) => a + c.sessions.length, 0),
    );
  let flipSessions = 0;
  let sessionCount = 0;
  for (const child of children) {
    for (const session of child.sessions) {
      sessionCount += 1;
      const actions = session.decisions
        .map((d) => d.nbaAction)
        .filter(Boolean) as import("../src/ml/types.js").NbaAction[];
      const diffOnly = actions.filter(
        (a) => a === "INCREASE_DIFFICULTY" || a === "DECREASE_DIFFICULTY",
      );
      if (diffOnly.length >= 3) {
        let flips = 0;
        for (let i = 1; i < diffOnly.length; i++) {
          if (diffOnly[i] !== diffOnly[i - 1]) flips += 1;
        }
        if (flips >= 2) flipSessions += 1;
      }
    }
  }
  const oscillation = sessionCount > 0 ? flipSessions / sessionCount : 0;
  return { engagement, reward, dropOff, coherence, oscillation };
}

function aggregateDecisionSamples(
  children: ChildSimulationResult[],
): SimDecisionSample[] {
  return children.flatMap((c) =>
    c.sessions.flatMap((s) => s.decisionSamples),
  );
}

function enrichMlRewardBreakdown(
  breakdown: MlRewardBreakdown,
  samples: SimDecisionSample[],
): MlRewardBreakdown {
  const enriched = { ...breakdown };
  for (const sample of samples) {
    if (sample.source === "ml") {
      enriched.mlAdjustedSum += sample.adjustedReward;
      enriched.mlAdjustedCount += 1;
    } else {
      enriched.ruleAdjustedSum += sample.adjustedReward;
      enriched.ruleAdjustedCount += 1;
    }
  }
  return enriched;
}

async function simulateFamilyLayer(
  children: ChildSimulationResult[],
): Promise<FullSimulationResult["family"]> {
  const snapshots: ChildFamilySnapshot[] = children.slice(0, 2).map((c) => ({
    childId: c.config.id,
    displayName: c.config.label,
    ageMonths: c.config.ageMonths,
    profile: c.finalProfile,
    prediction: runPrediction({ childId: c.config.id, profile: c.finalProfile }),
    sessionMinutes: 25,
  }));

  const refreshed = await refreshFamilyIntelligence("family_sim", snapshots);
  const enhanced = enhancePredictionWithFamily(
    snapshots[0]!.childId,
    "family_sim",
    snapshots[0]!.prediction!,
    snapshots,
  );

  const json = JSON.stringify(refreshed);
  return {
    familyId: "family_sim",
    childIds: snapshots.map((s) => s.childId),
    hasSiblingInfluence:
      refreshed.graph.learningDynamics.explorationBoostFromSiblings > 0 ||
      !!refreshed.graph.learningDynamics.accelerationTargetChildId,
    hasInternalComparisonOnly: !json.includes("worse than"),
    explorationBoostApplied: enhanced.explorationSuccessRate >= snapshots[0]!.prediction!.explorationSuccessRate,
  };
}

async function simulateGlobalLayer(
  child: ChildSimulationResult,
): Promise<FullSimulationResult["global"]> {
  const ctx = getGlobalPlanContext(
    child.config.countryCode,
    child.ageBand,
    child.finalPersonality,
    child.finalProfile,
  );
  const base = runPrediction({
    childId: child.config.id,
    profile: child.finalProfile,
  });
  const enhanced = enhancePredictionWithGlobal(base, ctx, child.finalProfile, child.ageBand);
  return {
    coldStartPathLength: ctx.insights.recommendedPath.length,
    rankingBoostApplied:
      enhanced.recommendedDifficulty !== base.recommendedDifficulty ||
      ctx.insights.cohortMatchScore > 0.3,
  };
}

async function simulateMetaLayer(): Promise<FullSimulationResult["meta"]> {
  const initial = getActiveTuningParameters().explorationRate;
  for (let i = 0; i < 5; i++) {
    recordMlMetricSample({
      source: i % 2 === 0 ? "ml" : "rule",
      reward: 0.15 + i * 0.04,
      engagementDelta: 6 + i,
      predictedCorrect: true,
      actualPositive: true,
    });
  }
  const pipeline = getGlobalTrainingPipeline();
  await pipeline.scheduleAutoTraining("manual");
  const cycle = await runMetaLearningCycle({
    createExperimentIfNone: true,
    skipModelTrain: false,
  });
  buildEffectiveRuntimeConfig("meta_probe_child");
  const final = getActiveTuningParameters().explorationRate;
  return {
    initialExplorationRate: initial,
    finalExplorationRate: final,
    cyclesRun: 1,
    experimentsCreated: Object.keys(cycle).length > 0,
    modelLifecycleRan: !!cycle.modelLifecycle,
  };
}

/**
 * Run full multi-child simulation (V1–V10 data collection).
 */
export async function runOptimizationComparison(
  childProfiles: SimChildConfig[] = SIM_CHILD_PROFILES.slice(0, 4),
): Promise<OptimizationComparison> {
  setHumanOverride({ enabled: true, freezeAutoTuning: true });
  const baseline = await runFullSystemSimulation({
    childProfiles,
    enableMetaOptimization: false,
    skipMetaLayer: true,
  });
  clearHumanOverride();
  const optimized = await runFullSystemSimulation({
    childProfiles,
    enableMetaOptimization: true,
  });

  const b = aggregateSimulationMetrics(baseline.children);
  const o = aggregateSimulationMetrics(optimized.children);

  const improved =
    o.engagement >= b.engagement - 1 &&
    o.reward >= b.reward - 0.02 &&
    o.dropOff <= b.dropOff + 0.05;

  const stabilityDelta = o.coherence - b.coherence;
  const oscillationDelta = o.oscillation - b.oscillation;
  const rewardImproved = o.reward > b.reward + 0.005;
  const engagementImproved = o.engagement >= b.engagement - 0.5;
  const coherenceStable = !(rewardImproved && stabilityDelta < -0.12);
  const uxStable =
    coherenceStable &&
    oscillationDelta <= 0.08 &&
    !(engagementImproved && rewardImproved && oscillationDelta > 0.12);

  return {
    baselineEngagement: b.engagement,
    optimizedEngagement: o.engagement,
    baselineReward: b.reward,
    optimizedReward: o.reward,
    baselineDropOff: b.dropOff,
    optimizedDropOff: o.dropOff,
    baselineCoherence: b.coherence,
    optimizedCoherence: o.coherence,
    baselineOscillation: b.oscillation,
    optimizedOscillation: o.oscillation,
    stabilityDelta,
    oscillationDelta,
    improved: improved && coherenceStable && uxStable,
    coherenceStable,
    uxStable,
  };
}

export async function runFullSystemSimulation(options?: {
  childProfiles?: SimChildConfig[];
  enableMetaOptimization?: boolean;
  skipMetaLayer?: boolean;
  decisionTracker?: SimulationDecisionTracker;
  mlMode?: SimMlMode;
  injectNoise?: boolean;
  simulateLatency?: boolean;
  burstNoiseMode?: boolean;
}): Promise<FullSimulationResult> {
  const started = Date.now();
  resetSimulationEnvironment();

  const mlMode = options?.mlMode ?? "balanced";
  const injectNoise = options?.injectNoise ?? false;
  const simulateLatency = options?.simulateLatency ?? false;
  const burstNoiseMode = options?.burstNoiseMode ?? false;
  const mlThreshold = getMlConfidenceThreshold(mlMode);
  const confidenceCalibration = getMlConfidenceCalibration(mlMode);
  const mlTraffic = getMlTrafficForMode(mlMode);
  const minMlParticipationWeight = getMinMlWeightForMode(mlMode);

  const enableMeta = options?.enableMetaOptimization !== false;
  if (!enableMeta) {
    setHumanOverride({ enabled: true, freezeAutoTuning: true });
  } else {
    clearHumanOverride();
  }

  const tracker = options?.decisionTracker ?? createSimulationDecisionTracker();

  for (let i = 0; i < 40; i++) {
    recordMlMetricSample({
      source: "ml",
      reward: 0.4 + (i % 5) * 0.05,
      engagementDelta: 10,
      predictedCorrect: true,
      actualPositive: true,
    });
  }

  const profiles = options?.childProfiles ?? SIM_CHILD_PROFILES;
  const stores = createInMemoryStores();
  const coordinator = new RealtimeCoordinator({
    experiments: { realtimeEnabled: true, rewardFrequency: "medium" },
    confidenceCalibrationOffset: confidenceCalibration,
    ml: {
      mlEnabled: true,
      mlTrafficPercentage: mlTraffic,
      mlConfidenceThreshold: mlThreshold,
      minMlParticipationWeight,
      banditEpsilon: 0.25,
      banditStrategy: "guided",
    },
    fallback: { realtimeDisabled: false, useStaticPlan: false },
  });

  const history: import("../src/types.js").ContentHistoryEntry[] = [];
  const children: ChildSimulationResult[] = [];

  for (const cfg of profiles) {
    children.push(
      await simulateChild(cfg, stores, coordinator, history, {
        injectNoise,
        simulateLatency,
        burstNoiseMode,
      }),
    );
  }

  const family = await simulateFamilyLayer(children);
  const global = await simulateGlobalLayer(children[0]!);
  const meta = options?.skipMetaLayer
    ? {
        initialExplorationRate: getActiveTuningParameters().explorationRate,
        finalExplorationRate: getActiveTuningParameters().explorationRate,
        cyclesRun: 0,
        experimentsCreated: false,
        modelLifecycleRan: false,
      }
    : await simulateMetaLayer();

  if (!enableMeta) {
    clearHumanOverride();
  }

  const mlVsRuleBreakdown =
    tracker.breakdown.ml + tracker.breakdown.rule > 0
      ? { ...tracker.breakdown }
      : {
          ml: children.reduce((a, c) => a + c.mlDecisions, 0),
          rule: children.reduce((a, c) => a + c.ruleDecisions, 0),
        };

  const mlRewardBreakdown = enrichMlRewardBreakdown(
    { ...tracker.mlRewardBreakdown },
    aggregateDecisionSamples(children),
  );
  const decisionSamples = aggregateDecisionSamples(children);
  const noiseEventCount = children.reduce(
    (a, c) => a + c.sessions.reduce((s, sess) => s + sess.noisyEventCount, 0),
    0,
  );

  if ("dispose" in tracker) {
    (tracker as { dispose(): void }).dispose();
  }

  return {
    children,
    family,
    global,
    meta,
    mlVsRuleBreakdown,
    mlRewardBreakdown,
    mlMode,
    injectNoise,
    simulateLatency,
    burstNoiseMode,
    noiseEventCount,
    decisionSamples,
    optimizationEnabled: enableMeta,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
  };
}

/**
 * Run simulation across all three ML confidence modes (A/B/C).
 */
export async function runAllSimulationModes(options?: {
  childProfiles?: SimChildConfig[];
  injectNoise?: boolean;
}): Promise<MultiModeSimulationResult> {
  const started = Date.now();
  const profiles = options?.childProfiles ?? SIM_CHILD_PROFILES;
  const injectNoise = options?.injectNoise ?? false;

  const aggressive = await runFullSystemSimulation({
    childProfiles: profiles,
    mlMode: "aggressive",
    injectNoise,
    skipMetaLayer: true,
  });
  const balanced = await runFullSystemSimulation({
    childProfiles: profiles,
    mlMode: "balanced",
    injectNoise,
    skipMetaLayer: true,
  });
  const conservative = await runFullSystemSimulation({
    childProfiles: profiles,
    mlMode: "conservative",
    injectNoise,
    skipMetaLayer: true,
  });

  return {
    aggressive,
    balanced,
    conservative,
    durationMs: Date.now() - started,
  };
}

export { resetSimulationEnvironment as resetSystemSimulation };
