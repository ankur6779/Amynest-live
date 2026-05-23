import { DEFAULT_EXPERIMENT_FLAGS } from "../config/experiments.js";
import { DEFAULT_RANKING_WEIGHTS } from "../contentEngine.js";
import { computeMlMetrics } from "./metrics.js";
import { resolveEffectiveMlFlags } from "./deploymentSafety.js";
import {
  assignExperimentTraffic,
  getActiveExperiments,
  winningExperimentFlags,
} from "./autoExperimentEngine.js";
import { applyContentOptimizerToTuning } from "./contentOptimizer.js";
import { applyFailSafeToConfig, applyHumanOverride } from "./failSafeGovernance.js";
import {
  enforcePolicyOnRuntimeConfig,
  getSystemPolicy,
} from "./policyEngine.js";
import {
  getActiveTuningParameters,
  getMetaState,
  loadMetaStateFromRecord,
  runMetaLearningCycle,
  setHumanOverrideActive,
  setMetaStateStore,
  persistMetaState,
} from "./metaLearningController.js";
import type {
  EffectiveRuntimeConfig,
  HumanOverride,
  MetaStateRecord,
  MetaStateStore,
  SystemHealthApi,
  TuningParameters,
} from "./types-meta.js";

let humanOverride: HumanOverride = { enabled: false };
let lastRuntimeConfig: EffectiveRuntimeConfig | null = null;

export function setHumanOverride(override: HumanOverride): void {
  humanOverride = { ...override, setAt: new Date().toISOString() };
  setHumanOverrideActive(override.enabled && !!override.freezeAutoTuning);
}

export function getHumanOverride(): HumanOverride {
  return { ...humanOverride };
}

export function clearHumanOverride(): void {
  humanOverride = { enabled: false };
  setHumanOverrideActive(false);
}

export { setMetaStateStore, loadMetaStateFromRecord, persistMetaState, getSystemPolicy };

export async function ensureMetaLayerReady(
  record?: MetaStateRecord | null,
): Promise<void> {
  if (record) loadMetaStateFromRecord(record);
  if (getActiveExperiments().length === 0) {
    await runMetaLearningCycle({ createExperimentIfNone: true, skipModelTrain: true });
  }
}

export function buildEffectiveRuntimeConfig(
  childId: string,
  tuning: TuningParameters = getActiveTuningParameters(),
): EffectiveRuntimeConfig {
  const metrics = computeMlMetrics();
  const experiments = getActiveExperiments();
  const running = experiments.find((e) => !e.winnerId);
  let explorationRate = tuning.explorationRate;
  let difficultyRamp = tuning.difficultyRamp;

  if (running) {
    const assigned = assignExperimentTraffic(childId, running.id);
    explorationRate = (explorationRate + assigned.explorationRate) / 2;
    difficultyRamp = assigned.difficultyRamp;
  }

  const winnerFlags = winningExperimentFlags();
  const experimentFlags = winnerFlags ?? DEFAULT_EXPERIMENT_FLAGS;

  const ml = resolveEffectiveMlFlags(undefined, metrics);
  const optimized = applyContentOptimizerToTuning(tuning);

  let config: EffectiveRuntimeConfig = {
    experimentFlags,
    explorationRate,
    difficultyRamp,
    rewardFrequency: optimized.rewardFrequency,
    contentWeights: {
      ...DEFAULT_RANKING_WEIGHTS,
      ...optimized.contentRankingWeights,
    },
    mlTrafficPercentage: ml.mlTrafficPercentage,
    forceRuleFallback: ml.forceRuleFallback,
    policyApplied: false,
  };

  config = enforcePolicyOnRuntimeConfig(
    config,
    getMetaState().systemPerformance.engagementScore,
  );
  config = applyFailSafeToConfig(config, metrics);
  config = applyHumanOverride(config, humanOverride);

  lastRuntimeConfig = config;
  return config;
}

export function getLastRuntimeConfig(): EffectiveRuntimeConfig | null {
  return lastRuntimeConfig;
}

export function getSystemHealth(): SystemHealthApi {
  const meta = getMetaState();
  const experiments = getActiveExperiments();
  const running = experiments.filter((e) => !e.winnerId).length;
  const winners = experiments.filter((e) => e.winnerId).length;

  return {
    systemHealth: {
      engagementScore: meta.systemPerformance.engagementScore,
      retentionRate: meta.systemPerformance.retentionRate,
      modelAccuracy: meta.systemPerformance.modelAccuracy,
      experimentStatus:
        running > 0 ? `${running}_running` : winners > 0 ? `${winners}_completed` : "idle",
      modelVersion: meta.modelHealth.activeVersion,
      autoTuningActive: !humanOverride.enabled || !humanOverride.freezeAutoTuning,
      failSafeActive: lastRuntimeConfig?.forceRuleFallback ?? false,
    },
  };
}

export async function tickAutonomousEcosystem(force = false): Promise<{
  meta: Awaited<ReturnType<typeof runMetaLearningCycle>>;
}> {
  const meta = await runMetaLearningCycle({
    skipModelTrain: !force,
    createExperimentIfNone: true,
  });
  return { meta };
}
