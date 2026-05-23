import { processSessionFeedback } from "./feedbackEngine.js";
import type { AgeBand } from "./types.js";
import {
  updatePersonalityFromSessionFeedback,
  applyPersonalityDriftResponse,
  ensurePersonalityProfile,
} from "./ml/personalityEngine.js";
import {
  ensureLearningPath,
  updateLearningPathAfterSession,
  reEvaluateLearningPath,
} from "./ml/learningPathEngine.js";
import { getSegmentModelRegistry } from "./ml/segmentModels.js";
import {
  runPrediction,
  type PredictionInput,
} from "./ml/predictionEngine.js";
import {
  correctPredictionDrift,
  applyConfidencePenalty,
} from "./ml/predictionDrift.js";
import {
  recordSessionHistoryFromFeedback,
} from "./ml/sessionHistoryStore.js";
import type { PredictionStore, PredictionOutput } from "./ml/types-prediction.js";
import type { SkillKey } from "./types-v2.js";
import type {
  LearningPath,
  PersonalityProfile,
  PersonalityProfileStore,
  LearningPathStore,
} from "./ml/types-personality.js";
import type {
  LearningProfile,
  SessionFeedbackInput,
  SessionFeedbackResult,
} from "./types-v2.js";

export type SessionFeedbackWithPersonalityResult = SessionFeedbackResult & {
  personality: PersonalityProfile;
  learningPath: LearningPath;
  prediction?: PredictionOutput;
};

export async function processSessionFeedbackWithPersonality(
  existing: LearningProfile | null | undefined,
  input: SessionFeedbackInput,
  options: {
    ageBand: AgeBand;
    countryCode: string;
    developmentStage: string;
    personalityStore?: PersonalityProfileStore;
    learningPathStore?: LearningPathStore;
    predictionStore?: PredictionStore;
    priorPrediction?: PredictionOutput;
    difficultyRamp?: "slow" | "fast";
  },
): Promise<SessionFeedbackWithPersonalityResult> {
  const base = processSessionFeedback(existing, input, {
    difficultyRamp: options.difficultyRamp,
  });

  const personalityStore = options.personalityStore;
  const learningPathStore = options.learningPathStore;

  let personality = ensurePersonalityProfile(
    personalityStore ? await personalityStore.get(input.childId) : null,
    input.childId,
  );
  const prevTraits = { ...personality.traits };
  personality = updatePersonalityFromSessionFeedback(personality, input);

  let learningPath = ensureLearningPath(
    learningPathStore ? await learningPathStore.get(input.childId) : null,
    input.childId,
    base.profile,
    options.ageBand,
  );

  applyPersonalityDriftResponse(personality, prevTraits, (d) => {
    if (d.drifted) {
      const segmentKey = `${options.ageBand}|${options.countryCode}|${options.developmentStage}`;
      getSegmentModelRegistry().boostExplorationWeight(segmentKey, d.explorationBoost);
      learningPath = reEvaluateLearningPath(learningPath, base.profile, options.ageBand);
    }
  });

  learningPath = updateLearningPathAfterSession(
    learningPath,
    base.profile,
    options.ageBand,
    input,
  );

  const skillLevels: Partial<Record<SkillKey, number>> = {
    phonics: base.profile.skills.phonics.level,
    motor_skills: base.profile.skills.motor_skills.level,
    cognitive: base.profile.skills.cognitive.level,
    social: base.profile.skills.social.level,
  };
  recordSessionHistoryFromFeedback(
    input.childId,
    input,
    base.profile.behavior.engagementScore,
    skillLevels,
  );

  let prediction = runPrediction({
    childId: input.childId,
    profile: base.profile,
    personality,
    learningPath,
  } satisfies PredictionInput);

  if (options.priorPrediction) {
    const drift = correctPredictionDrift(options.priorPrediction, {
      engagementScore: base.profile.behavior.engagementScore,
      skips: input.skips,
      sessionLengthMinutes: input.timeSpentSec / 60,
      completed: input.completed,
    });
    if (drift.explorationBoost > 0) {
      const segmentKey = `${options.ageBand}|${options.countryCode}|${options.developmentStage}`;
      getSegmentModelRegistry().boostExplorationWeight(
        segmentKey,
        drift.explorationBoost,
      );
    }
    if (drift.confidencePenalty > 0) {
      prediction = applyConfidencePenalty(prediction, drift.confidencePenalty);
    }
  }

  if (options.predictionStore) {
    await options.predictionStore.save({
      childId: input.childId,
      predictedSkills: prediction.nextSkillLevels,
      dropOffRisk: prediction.predictedDropOffRisk,
      engagementScore: prediction.predictedEngagement,
      confidence: prediction.confidence,
      createdAt: new Date().toISOString(),
    });
  }

  if (personalityStore) await personalityStore.upsert(personality);
  if (learningPathStore) await learningPathStore.upsert(learningPath);

  return {
    ...base,
    personality,
    learningPath,
    prediction,
  };
}
