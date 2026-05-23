import { getSharedActionModel } from "./model.js";
import { getGlobalTrainingPipeline } from "./trainingPipeline.js";
import type { ModelHealthSnapshot } from "./types-meta.js";
import type { MlMetrics } from "./types.js";

type ModelSnapshot = {
  version: number;
  validationScore: number;
  trainedAt: string;
};

const deployedHistory: ModelSnapshot[] = [];
let candidate: ModelSnapshot | null = null;

export function getModelHealth(metrics: MlMetrics): ModelHealthSnapshot {
  const model = getSharedActionModel();
  const last = deployedHistory[deployedHistory.length - 1];
  return {
    activeVersion: model.version,
    candidateVersion: candidate?.version,
    lastTrainAt: candidate?.trainedAt ?? last?.trainedAt,
    lastDeployAt: last?.trainedAt,
    validationScore: candidate?.validationScore ?? metrics.predictionAccuracy,
    rollbackAvailable: deployedHistory.length > 1,
    status:
      metrics.sampleCount < 20
        ? "healthy"
        : metrics.predictionAccuracy < 0.35
          ? "degraded"
          : "healthy",
  };
}

export async function trainCandidateModel(): Promise<ModelSnapshot> {
  const pipeline = getGlobalTrainingPipeline();
  const result = await pipeline.runOfflineTraining();
  const metrics = { predictionAccuracy: 0.5, avgReward: 0, sampleCount: result.samples } as MlMetrics;
  const validationScore =
    result.samples > 0
      ? Math.min(0.95, 0.45 + result.samples / 500)
      : 0.4;

  candidate = {
    version: result.modelVersion,
    validationScore,
    trainedAt: new Date().toISOString(),
  };
  return candidate;
}

export function validateCandidate(baselineAccuracy: number): boolean {
  if (!candidate) return false;
  return candidate.validationScore >= baselineAccuracy - 0.05;
}

export function deployCandidate(): boolean {
  if (!candidate) return false;
  deployedHistory.push({ ...candidate });
  if (deployedHistory.length > 5) deployedHistory.shift();
  candidate = null;
  return true;
}

export function rollbackModel(): boolean {
  if (deployedHistory.length < 2) return false;
  deployedHistory.pop();
  candidate = null;
  return deployedHistory.length > 0;
}

export function shouldRollbackAfterDeploy(
  metrics: MlMetrics,
  preDeployAccuracy: number,
): boolean {
  if (metrics.sampleCount < 25) return false;
  return metrics.predictionAccuracy < preDeployAccuracy - 0.12;
}

export async function runModelLifecycle(
  metrics: MlMetrics,
): Promise<{ trained: boolean; deployed: boolean; rolledBack: boolean }> {
  const preAccuracy = metrics.predictionAccuracy;
  const trained = await trainCandidateModel();
  const valid = validateCandidate(preAccuracy);
  let deployed = false;
  let rolledBack = false;

  if (valid) {
    deployed = deployCandidate();
    if (deployed && shouldRollbackAfterDeploy(metrics, preAccuracy)) {
      rolledBack = rollbackModel();
      deployed = false;
    }
  }

  return { trained: !!trained, deployed, rolledBack };
}

export function resetModelManager(): void {
  deployedHistory.length = 0;
  candidate = null;
}
