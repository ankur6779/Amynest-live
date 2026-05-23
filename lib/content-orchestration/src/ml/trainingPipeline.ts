import {
  normalizeFeatures,
  normalizeRewardValue,
  difficultyToLevel,
  skillLevelForModule,
} from "./featureExtractor.js";
import { getSharedActionModel } from "./model.js";
import { getSegmentModelRegistry } from "./segmentModels.js";
import { recordBanditReward } from "./banditEngine.js";
import { recordMlMetricSample } from "./metrics.js";
import type {
  DecisionOutcome,
  NbaAction,
  NbaDecisionLog,
  NbaFeatureVector,
  RewardContext,
  RewardResult,
} from "./types.js";
import type { BanditState } from "./banditEngine.js";
import type { ModuleId } from "../types.js";

const MIN_ONLINE_BATCH = 20;
const BASE_LEARNING_RATE = 0.03;
const DECAY_FACTOR = 0.98;

/**
 * Context-aware reward (V4).
 * Completed at/above skill: +1.2; below skill: +0.6; high engagement: +0.5;
 * exploration + high engagement: +0.3; skip: -1; idle: -0.7.
 * Normalized to [-1, 1.5].
 */
export function computeContextAwareReward(ctx: RewardContext): RewardResult {
  const { outcome, difficultyLevel, skillLevel } = ctx;
  let raw = 0;

  const engagementHigh =
    outcome.engagementHigh ?? outcome.engagementDelta >= 8;

  if (outcome.skipped) {
    raw -= 1;
  } else if (outcome.idle) {
    raw -= 0.7;
  } else if (outcome.completed) {
    raw += difficultyLevel >= skillLevel ? 1.2 : 0.6;
  }

  if (engagementHigh) raw += 0.5;
  if (outcome.exploredContent && engagementHigh) raw += 0.3;

  return {
    rawReward: raw,
    normalizedReward: normalizeRewardValue(raw),
  };
}

/** Backward-compatible reward helper (returns normalized reward). */
export function computeRewardSignal(outcome: DecisionOutcome): number {
  return computeContextAwareReward({
    outcome,
    difficultyLevel: outcome.difficultyLevel ?? 2,
    skillLevel: outcome.skillLevel ?? 2,
  }).normalizedReward;
}

export function buildRewardContext(
  outcome: DecisionOutcome,
  features?: NbaFeatureVector,
  moduleId?: ModuleId,
): RewardContext {
  const mod = moduleId ?? features?.currentModule ?? "phonics";
  const difficultyLevel =
    outcome.difficultyLevel ??
    (features ? difficultyToLevel(features.currentDifficulty) : 2);
  const skillLevel =
    outcome.skillLevel ??
    (features ? Math.max(1, Math.round(skillLevelForModule(
        profileFromFeatureSkills(features),
        mod,
      ))) : 2);

  return { outcome, difficultyLevel, skillLevel };
}

function profileFromFeatureSkills(
  f: NbaFeatureVector,
): import("../types-v2.js").LearningProfile {
  const now = new Date().toISOString();
  return {
    childId: "",
    version: 1,
    skills: {
      phonics: { level: Math.round(f.skillLevels.phonics * 5), confidence: 0.5 },
      motor_skills: { level: Math.round(f.skillLevels.motor_skills * 5), confidence: 0.5 },
      cognitive: { level: Math.round(f.skillLevels.cognitive * 5), confidence: 0.5 },
      social: { level: Math.round(f.skillLevels.social * 5), confidence: 0.5 },
    },
    behavior: {
      engagementScore: Math.round(f.engagementScore * 100),
      avgSessionTime: 10,
      preferredModules: [],
      dropOffPoints: [],
    },
    adaptability: {
      difficultyTolerance: 0.5,
      noveltyPreference: 0.5,
      repetitionTolerance: 0.5,
    },
    updatedAt: now,
    createdAt: now,
  };
}

export type TrainingPipelineOptions = {
  onPersist?: (log: NbaDecisionLog) => void | Promise<void>;
  onWarehouseExport?: (logs: NbaDecisionLog[]) => void | Promise<void>;
  batchSize?: number;
  enableOnlineUpdate?: boolean;
  minOnlineBatch?: number;
  /** V10: stream samples into online buffer immediately on attach */
  streamingOnlineUpdate?: boolean;
  /** V10: auto-run offline training when buffer reaches threshold */
  autoOfflineTrainThreshold?: number;
};

export type TrainingJobTrigger = "scheduled" | "drift" | "manual" | "buffer_full";

type PendingOnlineSample = {
  normalized: Float32Array;
  action: NbaAction;
  reward: number;
  segmentKey: string;
};

export class NbaTrainingPipeline {
  private buffer: NbaDecisionLog[] = [];
  private onlinePending: PendingOnlineSample[] = [];
  private readonly batchSize: number;
  private readonly minOnlineBatch: number;
  private readonly onPersist?: TrainingPipelineOptions["onPersist"];
  private readonly onWarehouseExport?: TrainingPipelineOptions["onWarehouseExport"];
  private readonly enableOnlineUpdate: boolean;
  private readonly streamingOnlineUpdate: boolean;
  private readonly autoOfflineTrainThreshold: number;
  private autoTrainScheduled = false;

  constructor(options: TrainingPipelineOptions = {}) {
    this.batchSize = options.batchSize ?? 50;
    this.minOnlineBatch = options.minOnlineBatch ?? MIN_ONLINE_BATCH;
    this.onPersist = options.onPersist;
    this.onWarehouseExport = options.onWarehouseExport;
    this.enableOnlineUpdate = options.enableOnlineUpdate ?? true;
    this.streamingOnlineUpdate = options.streamingOnlineUpdate ?? true;
    this.autoOfflineTrainThreshold = options.autoOfflineTrainThreshold ?? 200;
  }

  logDecision(log: Omit<NbaDecisionLog, "reward" | "rawReward" | "normalizedReward">): NbaDecisionLog {
    const entry: NbaDecisionLog = { ...log, reward: undefined };
    this.buffer.push(entry);
    void this.onPersist?.(entry);
    if (this.buffer.length >= this.batchSize) {
      void this.flushBatch();
    }
    return entry;
  }

  attachOutcome(
    childId: string,
    timestamp: number,
    outcome: DecisionOutcome,
    bandit?: BanditState,
    actionTaken?: NbaAction,
    features?: NbaFeatureVector,
    moduleId?: ModuleId,
  ): void {
    const entry = [...this.buffer]
      .reverse()
      .find((l) => l.childId === childId && Math.abs(l.timestamp - timestamp) < 5000);
    if (!entry) return;

    entry.outcome = outcome;
    const rewardCtx = buildRewardContext(outcome, features ?? entry.features, moduleId);
    const { rawReward, normalizedReward } = computeContextAwareReward(rewardCtx);
    entry.rawReward = rawReward;
    entry.normalizedReward = normalizedReward;
    entry.reward = normalizedReward;

    if (bandit && actionTaken !== undefined) {
      recordBanditReward(bandit, actionTaken, normalizedReward);
    }

    recordMlMetricSample({
      source: entry.source,
      reward: normalizedReward,
      engagementDelta: outcome.engagementDelta,
      predictedCorrect: entry.rewardEstimate > 0.5,
      actualPositive: normalizedReward > 0,
    });

    const engagementHigh =
      outcome.engagementHigh ?? outcome.engagementDelta >= 8;
    if (outcome.exploredContent && engagementHigh && entry.segmentKey) {
      getSegmentModelRegistry().boostExplorationWeight(entry.segmentKey);
    }

    if (this.enableOnlineUpdate && entry.source === "ml") {
      const segmentKey = entry.segmentKey ?? entry.features.segmentKey;
      this.onlinePending.push({
        normalized: new Float32Array(entry.normalizedFeatures),
        action: entry.actionTaken,
        reward: normalizedReward,
        segmentKey,
      });
      if (
        this.streamingOnlineUpdate &&
        this.onlinePending.length >= this.minOnlineBatch
      ) {
        this.flushOnlineBatch();
      }
    }

    if (this.buffer.length >= this.autoOfflineTrainThreshold) {
      void this.scheduleAutoTraining("buffer_full");
    }
  }

  /** V10: queue offline / incremental training job. */
  async scheduleAutoTraining(trigger: TrainingJobTrigger = "scheduled"): Promise<{
    scheduled: boolean;
    trigger: TrainingJobTrigger;
  }> {
    if (this.autoTrainScheduled && trigger !== "manual") {
      return { scheduled: false, trigger };
    }
    this.autoTrainScheduled = true;
    try {
      await this.runIncrementalTraining();
      return { scheduled: true, trigger };
    } finally {
      this.autoTrainScheduled = false;
    }
  }

  /** V10: incremental batch + streaming online updates. */
  async runIncrementalTraining(): Promise<{
    samples: number;
    modelVersion: number;
    onlineFlushed: number;
  }> {
    const onlineFlushed = this.onlinePending.length;
    if (onlineFlushed >= this.minOnlineBatch) {
      this.flushOnlineBatch();
    }
    const offline = await this.runOfflineTraining();
    return {
      samples: offline.samples,
      modelVersion: offline.modelVersion,
      onlineFlushed,
    };
  }

  private flushOnlineBatch(): void {
    const batch = this.onlinePending.splice(0, this.onlinePending.length);
    if (batch.length < this.minOnlineBatch) return;

    const rewards = batch.map((b) => b.reward);
    const registry = getSegmentModelRegistry();
    const globalModel = getSharedActionModel();

    for (const sample of batch) {
      const model =
        sample.segmentKey !== ""
          ? registry.getModel(sample.segmentKey)
          : globalModel;
      const applied = model.safeOnlineUpdate(
        { values: sample.normalized, names: [] as readonly string[] },
        sample.action,
        sample.reward,
        {
          baseLearningRate: BASE_LEARNING_RATE,
          decayFactor: DECAY_FACTOR,
          batchRewards: rewards,
          minBatchSize: this.minOnlineBatch,
        },
      );
      if (!applied) break;
    }
  }

  /** Offline batch training (e.g. daily cron). */
  async runOfflineTraining(): Promise<{ samples: number; modelVersion: number }> {
    const labeled = this.buffer.filter((l) => l.normalizedReward !== undefined);
    const model = getSharedActionModel();
    const registry = getSegmentModelRegistry();
    const rewards = labeled.map((l) => l.normalizedReward!);

    for (const log of labeled) {
      if (log.normalizedReward === undefined) continue;
      const normalized = normalizeFeatures(log.features);
      const segmentModel = log.segmentKey
        ? registry.getModel(log.segmentKey)
        : model;
      segmentModel.safeOnlineUpdate(
        normalized,
        log.actionTaken,
        log.normalizedReward,
        {
          baseLearningRate: 0.02,
          decayFactor: DECAY_FACTOR,
          batchRewards: rewards,
          minBatchSize: 1,
        },
      );
    }

    if (this.onWarehouseExport && labeled.length > 0) {
      await this.onWarehouseExport(labeled);
    }

    return { samples: labeled.length, modelVersion: model.version };
  }

  async flushBatch(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    if (this.onWarehouseExport) {
      await this.onWarehouseExport(batch);
    }
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

let globalPipeline: NbaTrainingPipeline | null = null;

export function getGlobalTrainingPipeline(
  options?: TrainingPipelineOptions,
): NbaTrainingPipeline {
  if (!globalPipeline) globalPipeline = new NbaTrainingPipeline(options);
  return globalPipeline;
}

export function resetGlobalTrainingPipeline(): void {
  globalPipeline = null;
}
