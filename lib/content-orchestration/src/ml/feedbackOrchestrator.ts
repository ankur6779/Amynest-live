import { queueAnonymousAggregate, runGlobalGraphBatch } from "./globalBatchProcessor.js";
import { getGlobalTrainingPipeline } from "./trainingPipeline.js";
import { runMetaLearningCycle } from "./metaLearningController.js";
import { sanitizeContentKey } from "./anonymousAggregation.js";
import { recordCohortSuccess } from "./cohortIntelligence.js";
import { recordVariantOutcome } from "./autoExperimentEngine.js";
import type { ModuleId } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { DecisionOutcome } from "./types.js";
import { moduleToSkill } from "../learningProfileEngine.js";

export type FeedbackEvent = {
  childId: string;
  moduleId: ModuleId;
  contentId: string;
  cohortKey: string;
  outcome: DecisionOutcome;
  experimentId?: string;
  variantId?: string;
};

let cycleCounter = 0;
const META_CYCLE_EVERY_N_FEEDBACK = 25;

export function processRealtimeFeedback(event: FeedbackEvent): void {
  const skill = moduleToSkill(event.moduleId) as SkillKey;
  const contentKey = sanitizeContentKey(event.contentId);
  const success = event.outcome.completed && !event.outcome.skipped;
  const engagement = Math.max(0, 50 + event.outcome.engagementDelta);

  queueAnonymousAggregate({
    skill,
    moduleId: event.moduleId,
    contentKey,
    success,
    attempts: 1,
    engagementScore: engagement,
    droppedOff: event.outcome.skipped || event.outcome.idle,
    cohortKey: event.cohortKey,
  });

  recordCohortSuccess(event.cohortKey, contentKey, success);

  if (event.experimentId && event.variantId) {
    recordVariantOutcome(event.experimentId, event.variantId, {
      engagement: engagement / 100,
      reward: success ? 0.8 : 0.2,
    });
  }

  const pipeline = getGlobalTrainingPipeline({ enableOnlineUpdate: true });
  pipeline.attachOutcome(
    event.childId,
    Date.now(),
    event.outcome,
    undefined,
    undefined,
    undefined,
    event.moduleId,
  );

  cycleCounter += 1;
  if (cycleCounter % 10 === 0) {
    void runGlobalGraphBatch();
  }
  if (cycleCounter % META_CYCLE_EVERY_N_FEEDBACK === 0) {
    void runMetaLearningCycle({ createExperimentIfNone: true });
  }
}

export async function runFullFeedbackLoop(force = false): Promise<{
  globalBatch: { processed: number };
  meta: Awaited<ReturnType<typeof runMetaLearningCycle>>;
  training: { samples: number; modelVersion: number };
}> {
  const globalBatch = await runGlobalGraphBatch(force);
  const pipeline = getGlobalTrainingPipeline();
  const training = await pipeline.runOfflineTraining();
  const meta = await runMetaLearningCycle({ skipModelTrain: true });
  return { globalBatch, meta, training };
}

export function resetFeedbackOrchestrator(): void {
  cycleCounter = 0;
}
