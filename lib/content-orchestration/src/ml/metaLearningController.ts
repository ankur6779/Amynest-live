import { computeMlMetrics } from "./metrics.js";
import {
  createAutoExperiment,
  evaluateExperiments,
  getActiveExperiments,
} from "./autoExperimentEngine.js";
import { detectDrift, driftResponseActions } from "./driftDetector.js";
import { getModelHealth, runModelLifecycle } from "./modelManager.js";
import {
  DEFAULT_OPTIMIZATION_GOALS,
  optimizeTuningParameters,
  snapshotSystemPerformance,
} from "./selfOptimizer.js";
import type {
  MetaState,
  MetaStateRecord,
  MetaStateStore,
  TuningParameters,
} from "./types-meta.js";

const DEFAULT_TUNING: TuningParameters = {
  explorationRate: 0.2,
  difficultyRamp: "slow",
  rewardFrequency: "medium",
};

let metaState: MetaState = buildInitialMetaState();
let activeTuning: TuningParameters = { ...DEFAULT_TUNING };
let metaStore: MetaStateStore | null = null;
let humanOverrideEnabled = false;

function buildInitialMetaState(): MetaState {
  const metrics = computeMlMetrics();
  return {
    systemPerformance: snapshotSystemPerformance(metrics),
    modelHealth: getModelHealth(metrics),
    experimentResults: {},
    optimizationGoals: DEFAULT_OPTIMIZATION_GOALS,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function getMetaState(): MetaState {
  return metaState;
}

export function getActiveTuningParameters(): TuningParameters {
  return { ...activeTuning };
}

export function setMetaStateStore(store: MetaStateStore | null): void {
  metaStore = store;
}

export async function persistMetaState(): Promise<void> {
  if (!metaStore) return;
  const record: MetaStateRecord = {
    metrics: metaState,
    activeModels: [
      {
        version: metaState.modelHealth.activeVersion,
        deployedAt: metaState.modelHealth.lastDeployAt ?? new Date().toISOString(),
      },
    ],
    experiments: getActiveExperiments(),
    updatedAt: new Date().toISOString(),
  };
  await metaStore.upsert(record);
}

export function loadMetaStateFromRecord(record: MetaStateRecord): void {
  metaState = record.metrics;
  for (const exp of record.experiments) {
    metaState.experimentResults[exp.id] = exp;
  }
}

export type MetaCycleResult = {
  goalScore: number;
  driftSeverity: string;
  adjustmentsApplied: boolean;
  modelLifecycle?: { trained: boolean; deployed: boolean; rolledBack: boolean };
};

/**
 * Core meta-learning tick — monitor, decide, adjust.
 */
export async function runMetaLearningCycle(options?: {
  skipModelTrain?: boolean;
  createExperimentIfNone?: boolean;
}): Promise<MetaCycleResult> {
  const metrics = computeMlMetrics();
  const perf = snapshotSystemPerformance(metrics);
  const drift = detectDrift(metrics);
  const driftActions = driftResponseActions(drift);

  const { tuning, goalScore } = optimizeTuningParameters(activeTuning, metrics);
  let adjustmentsApplied = tuning.explorationRate !== activeTuning.explorationRate;

  if (driftActions.explorationBoost > 0) {
    tuning.explorationRate = Math.min(
      0.35,
      tuning.explorationRate + driftActions.explorationBoost,
    );
    adjustmentsApplied = true;
  }

  if (!humanOverrideEnabled) {
    activeTuning = tuning;
  }

  const experiments = evaluateExperiments();
  if (
    options?.createExperimentIfNone !== false &&
    experiments.filter((e) => !e.winnerId).length === 0
  ) {
    const exp = createAutoExperiment("auto_exploration_difficulty");
    metaState.experimentResults[exp.id] = exp;
  }

  let modelLifecycle;
  if (driftActions.triggerRetrain && !options?.skipModelTrain) {
    modelLifecycle = await runModelLifecycle(metrics);
  }

  metaState = {
    systemPerformance: perf,
    modelHealth: getModelHealth(metrics),
    experimentResults: Object.fromEntries(
      getActiveExperiments().map((e) => [e.id, e]),
    ),
    optimizationGoals: metaState.optimizationGoals,
    version: metaState.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await persistMetaState();

  return {
    goalScore,
    driftSeverity: drift.severity,
    adjustmentsApplied,
    modelLifecycle,
  };
}

export function setHumanOverrideActive(active: boolean): void {
  humanOverrideEnabled = active;
}

export function isHumanOverrideActive(): boolean {
  return humanOverrideEnabled;
}

export function resetMetaLearningState(): void {
  metaState = buildInitialMetaState();
  activeTuning = { ...DEFAULT_TUNING };
  humanOverrideEnabled = false;
}
