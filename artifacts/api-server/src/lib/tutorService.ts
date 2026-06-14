import {
  processTutorTurn,
  startTutorForContent,
  computeAge,
  type TutorApiPayload,
  type TutorContext,
} from "@workspace/content-orchestration";
import type { SessionPlanItem } from "@workspace/content-orchestration";
import type { PersonalityProfile } from "@workspace/content-orchestration";
import type { PredictionOutput } from "@workspace/content-orchestration";
import type { AttentionState } from "@workspace/content-orchestration";
import { getOrCreatePersonalityProfile } from "./personalityProfileRepository.js";
import { createPostgresPredictionStore } from "./predictionSnapshotRepository.js";
import { getOrCreateLearningProfile } from "./learningProfileRepository.js";
import { runPrediction } from "@workspace/content-orchestration";
import type { CountryCode } from "@workspace/content-orchestration";

export async function handleTutorTurn(params: {
  childId: string;
  userId: string;
  action: "start" | "answer" | "repeat" | "next_content";
  childAnswer?: string;
  audioInput?: string;
  contentItem?: SessionPlanItem;
  childDOB: string | Date;
  countryCode: CountryCode;
  attention?: AttentionState;
}): Promise<TutorApiPayload & { goalMet?: boolean }> {
  const personality = await getOrCreatePersonalityProfile(params.childId, params.userId);
  const profile = await getOrCreateLearningProfile(params.childId, params.userId);
  const predictionStore = createPostgresPredictionStore();
  const latest = await predictionStore.getLatest(params.childId);
  const prediction: PredictionOutput | undefined = latest
    ? {
        childId: params.childId,
        nextSkillLevels: latest.predictedSkills,
        skillForecasts: [],
        predictedEngagement: latest.engagementScore,
        predictedDropOffRisk: latest.dropOffRisk,
        recommendedDifficulty: "medium",
        recommendedSessionLength: 12,
        confidence: latest.confidence,
        explorationSuccessRate: 0.5,
        engagementTrend: 0.5,
      }
    : runPrediction({ childId: params.childId, profile, personality });

  const tutorCtx: TutorContext = {
    personality,
    prediction,
    attention: params.attention,
  };

  const age = computeAge({ childDOB: params.childDOB, countryCode: params.countryCode });
  const childAgeYears = Math.max(2, Math.min(15, Math.floor(age.ageInMonths / 12) || 6));

  const result = await processTutorTurn(
    params.childId,
    {
      action: params.action,
      childAnswer: params.childAnswer,
      audioInput: params.audioInput,
      contentItem: params.contentItem,
      childAgeYears,
    },
    tutorCtx,
  );

  return { ...result.response, goalMet: result.goalMet };
}

export async function startTutorWithContent(params: {
  childId: string;
  userId: string;
  contentItem: SessionPlanItem;
  skillLevel: number;
  childDOB: string | Date;
  countryCode: CountryCode;
}): Promise<TutorApiPayload> {
  const personality = await getOrCreatePersonalityProfile(params.childId, params.userId);
  const profile = await getOrCreateLearningProfile(params.childId, params.userId);
  const prediction = runPrediction({ childId: params.childId, profile, personality });
  const { response } = await startTutorForContent(
    params.childId,
    params.contentItem,
    params.skillLevel,
    { personality, prediction },
  );
  return response;
}
