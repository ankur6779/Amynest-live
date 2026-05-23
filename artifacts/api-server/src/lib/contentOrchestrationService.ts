import {
  computeAnalyticsSnapshot,
  computeAge,
  getDailyPlan,
  getDailyPlanOffline,
  getDailyPlanV2,
  MemoryCacheAdapter,
  MOCK_CONTENT_POOLS,
  processSessionFeedbackWithPersonality,
  type CacheAdapter,
  type ContentHistoryEntry,
  type CountryCode,
  type DailyPlan,
  type DailyPlanV2,
  type GetDailyPlanInput,
  type GetDailyPlanV2Input,
  type LearningPathStore,
  type ModuleId,
  type SessionFeedbackInput,
} from "@workspace/content-orchestration";
import {
  createPostgresLearningProfileStore,
  getOrCreateLearningProfile,
} from "./learningProfileRepository.js";
import {
  createPostgresPersonalityProfileStore,
  getOrCreatePersonalityProfile,
} from "./personalityProfileRepository.js";
import { createPostgresPredictionStore } from "./predictionSnapshotRepository.js";

const planCache = new MemoryCacheAdapter();
const learningPathCache = new MemoryCacheAdapter();

function createLearningPathStore(): LearningPathStore {
  return {
    async get(childId) {
      return learningPathCache.get(`learning_path:${childId}`);
    },
    async upsert(path) {
      await learningPathCache.set(`learning_path:${path.childId}`, path, 60 * 60 * 24 * 30);
      return path;
    },
  };
}

/** In-memory content history until DB table is wired. */
const historyByChild = new Map<string, ContentHistoryEntry[]>();

export function getContentHistory(childId: string): ContentHistoryEntry[] {
  return historyByChild.get(childId) ?? [];
}

export function appendContentHistory(
  childId: string,
  entries: ContentHistoryEntry[],
): void {
  historyByChild.set(childId, entries);
}

export async function fetchDailyPlanForChild(params: {
  childId: string;
  childDOB: string | Date;
  countryCode: CountryCode;
  dateIso?: string;
  unlockedModules?: ModuleId[];
  offline?: boolean;
}): Promise<DailyPlan> {
  const input: GetDailyPlanInput = {
    childId: params.childId,
    childDOB: params.childDOB,
    countryCode: params.countryCode,
    dateIso: params.dateIso,
    history: getContentHistory(params.childId),
    unlockedModules: params.unlockedModules,
    cache: planCache as CacheAdapter,
    contentPoolsOverride: MOCK_CONTENT_POOLS,
  };

  if (params.offline) {
    return getDailyPlanOffline(input);
  }
  return getDailyPlan(input);
}

export async function fetchDailyPlanV2ForChild(params: {
  childId: string;
  userId: string;
  childDOB: string | Date;
  countryCode: CountryCode;
  dateIso?: string;
  unlockedModules?: ModuleId[];
  bypassCache?: boolean;
}): Promise<DailyPlanV2> {
  const profileStore = createPostgresLearningProfileStore(params.userId);
  const personalityStore = createPostgresPersonalityProfileStore(params.userId);
  await getOrCreateLearningProfile(params.childId, params.userId);
  await getOrCreatePersonalityProfile(params.childId, params.userId);

  return getDailyPlanV2({
    childId: params.childId,
    userId: params.userId,
    childDOB: params.childDOB,
    countryCode: params.countryCode,
    dateIso: params.dateIso,
    unlockedModules: params.unlockedModules,
    history: getContentHistory(params.childId),
    cache: planCache as CacheAdapter,
    contentPoolsOverride: MOCK_CONTENT_POOLS,
    profileStore,
    personalityStore,
    learningPathStore: createLearningPathStore(),
    predictionStore: createPostgresPredictionStore(),
    bypassCache: params.bypassCache,
  });
}

export async function submitSessionFeedback(params: {
  userId: string;
  feedback: SessionFeedbackInput;
  childDOB: string | Date;
  countryCode: CountryCode;
  difficultyRamp?: "slow" | "fast";
}) {
  const store = createPostgresLearningProfileStore(params.userId);
  const personalityStore = createPostgresPersonalityProfileStore(params.userId);
  const existing = await store.get(params.feedback.childId);
  const age = computeAge({
    childDOB: params.childDOB,
    countryCode: params.countryCode,
  });
  const predictionStore = createPostgresPredictionStore();
  const priorPrediction = await predictionStore.getLatest(params.feedback.childId);

  const result = await processSessionFeedbackWithPersonality(existing, params.feedback, {
    ageBand: age.ageBand,
    countryCode: params.countryCode,
    developmentStage: age.developmentStage,
    personalityStore,
    learningPathStore: createLearningPathStore(),
    predictionStore,
    priorPrediction: priorPrediction
      ? {
          childId: params.feedback.childId,
          nextSkillLevels: priorPrediction.predictedSkills,
          skillForecasts: [],
          predictedEngagement: priorPrediction.engagementScore,
          predictedDropOffRisk: priorPrediction.dropOffRisk,
          recommendedDifficulty: "medium",
          recommendedSessionLength: 12,
          confidence: priorPrediction.confidence,
          explorationSuccessRate: 0.5,
          engagementTrend: 0.5,
        }
      : undefined,
    difficultyRamp: params.difficultyRamp,
  });
  await store.upsert(result.profile);
  return result;
}

export function getContentAnalytics(childId: string, moduleIds: ModuleId[]) {
  return computeAnalyticsSnapshot(getContentHistory(childId), moduleIds);
}
