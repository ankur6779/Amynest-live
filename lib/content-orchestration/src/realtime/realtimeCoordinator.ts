import {
  applyLiveDifficultyAdjustment,
  computeTargetDifficulty,
} from "../adaptiveEngine.js";
import { ensureLearningProfile } from "../learningProfileEngine.js";
import type { LearningProfile, SessionPlanItem } from "../types-v2.js";
import { createAttentionState, updateAttentionState } from "./attentionEngine.js";
import { REALTIME_THRESHOLDS, resolveRealtimeConfig } from "./config.js";
import { RealtimeEventBus } from "./eventBus.js";
import { computeDynamicExplorationRate } from "./explorationEngine.js";
import { hybridDecisionInFallbackMode, evaluateHybridRealtimeDecision } from "../ml/hybridDecision.js";
import type { MlExperimentFlags } from "../ml/types.js";
import { getGlobalTrainingPipeline } from "../ml/trainingPipeline.js";
import { getBanditState, clearBanditState } from "../ml/nbaEngine.js";
import { computeMlMetrics, recordSessionEnd } from "../ml/metrics.js";
import { resolveEffectiveMlFlags } from "../ml/deploymentSafety.js";
import type { CountryCode } from "../types.js";
import {
  ensurePersonalityProfile,
  updatePersonalityFromEvents,
  applyPersonalityDriftResponse,
} from "../ml/personalityEngine.js";
import {
  ensureLearningPath,
  reEvaluateLearningPath,
} from "../ml/learningPathEngine.js";
import { getSegmentModelRegistry } from "../ml/segmentModels.js";
import { runPrediction } from "../ml/predictionEngine.js";
import { shouldTriggerEarlyIntervention } from "../ml/earlyIntervention.js";
import {
  buildRewardDecision,
  checkMilestoneReached,
  createRewardEngineState,
  markRewardInjected,
  shouldInjectReward,
  type RewardEngineState,
} from "./rewardEngine.js";
import { mutateSession } from "./sessionMutator.js";
import { RealtimeStreamProcessor } from "./streamProcessor.js";
import type {
  ClientEmitMessage,
  ClientSubscribeMessage,
  FallbackMode,
  LiveDifficultyState,
  RealtimeEvent,
  RealtimeExperimentFlags,
  RealtimeSessionState,
  SessionUpdateMessage,
} from "./types.js";
import type { EnrichedRealtimeDecision, NbaDecisionLog } from "../ml/types.js";
import { DEFAULT_REALTIME_EXPERIMENTS } from "./types.js";

export type RealtimeCoordinatorOptions = {
  eventBus?: RealtimeEventBus;
  experiments?: RealtimeExperimentFlags;
  ml?: MlExperimentFlags;
  fallback?: FallbackMode;
  onProfileFlush?: (childId: string, profile: LearningProfile) => void | Promise<void>;
  onNbaLog?: (log: NbaDecisionLog) => void | Promise<void>;
};

export class RealtimeCoordinator {
  private readonly bus: RealtimeEventBus;
  private readonly sessions = new Map<string, RealtimeSessionState>();
  private readonly rewards = new Map<string, RewardEngineState>();
  private readonly streamByChild = new Map<string, RealtimeStreamProcessor>();
  private readonly experiments: RealtimeExperimentFlags;
  private readonly ml: MlExperimentFlags;
  private readonly fallback: FallbackMode;
  private readonly onProfileFlush?: RealtimeCoordinatorOptions["onProfileFlush"];
  private readonly onNbaLog?: RealtimeCoordinatorOptions["onNbaLog"];
  private lastDecisionMeta = new Map<string, EnrichedRealtimeDecision>();

  constructor(options: RealtimeCoordinatorOptions = {}) {
    this.bus = options.eventBus ?? new RealtimeEventBus();
    const resolved = resolveRealtimeConfig();
    this.experiments = options.experiments ?? DEFAULT_REALTIME_EXPERIMENTS;
    this.ml = resolveEffectiveMlFlags(options.ml ?? resolved.ml, computeMlMetrics());
    this.fallback = options.fallback ?? resolved.fallback;
    this.onProfileFlush = options.onProfileFlush;
    this.onNbaLog = options.onNbaLog;
    getGlobalTrainingPipeline({
      onPersist: (log) => this.onNbaLog?.(log),
    });
  }

  getEventBus(): RealtimeEventBus {
    return this.bus;
  }

  subscribe(childId: string, msg: ClientSubscribeMessage): RealtimeSessionState {
    const profile = ensureLearningProfile(msg.profile, childId);
    const moduleId = msg.sessionPlan[0]?.moduleId ?? "phonics";
    const base = computeTargetDifficulty(profile, moduleId, Date.now() % 1000);

    const state: RealtimeSessionState = {
      childId,
      sessionPlan: [...msg.sessionPlan],
      currentIndex: 0,
      profile,
      attention: createAttentionState(),
      liveDifficulty: {
        baseDifficulty: base.targetDifficulty,
        baseLevel: base.targetLevel,
        liveLevel: base.targetLevel,
        liveDifficulty: base.targetDifficulty,
        adjustments: 0,
      },
      recentEvents: [],
      explorationRate: 0.2,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
      ageBand: msg.ageBand ?? "36_48",
      developmentStage: msg.developmentStage ?? "preschooler",
      countryCode: msg.countryCode,
      recentNbaActions: [],
      personalityProfile: ensurePersonalityProfile(undefined, childId),
      learningPath: ensureLearningPath(
        undefined,
        childId,
        profile,
        msg.ageBand ?? "36_48",
      ),
    };
    state.behavioralPrediction = runPrediction({
      childId,
      profile,
      personality: state.personalityProfile,
      learningPath: state.learningPath,
    });
    if (
      state.behavioralPrediction &&
      shouldTriggerEarlyIntervention(state.behavioralPrediction)
    ) {
      state.explorationRate = Math.min(0.4, state.explorationRate + 0.1);
    }

    state.explorationRate = computeDynamicExplorationRate(
      0.2,
      state.attention,
      profile,
    );

    this.sessions.set(childId, state);
    this.rewards.set(childId, createRewardEngineState());
    this.ensureStreamProcessor(childId);
    return state;
  }

  handleClientMessage(
    raw: ClientEmitMessage | ClientSubscribeMessage,
  ): SessionUpdateMessage | null {
    if (raw.type === "subscribe") {
      const state = this.subscribe(raw.childId, raw);
      return this.buildUpdate(state, hybridDecisionInFallbackMode());
    }

    if (raw.type !== "event") return null;
    return this.processEvent(raw.payload);
  }

  processEvent(event: RealtimeEvent): SessionUpdateMessage | null {
    this.bus.emit(event);

    const state = this.sessions.get(event.childId);
    if (!state) return null;

    if (this.fallback.realtimeDisabled || !this.experiments.realtimeEnabled) {
      return this.buildUpdate(state, hybridDecisionInFallbackMode());
    }

    state.lastEventAt = event.timestamp;
    state.recentEvents = [...state.recentEvents, event].slice(-20);

    if (event.type === "CONTENT_STARTED") {
      const idx = state.sessionPlan.findIndex((p) => p.contentId === event.contentId);
      if (idx >= 0) state.currentIndex = idx;
    }

    const stream = this.ensureStreamProcessor(event.childId);
    state.profile = stream.onEvent(event, state.profile);

    state.attention = updateAttentionState(
      state.attention,
      state.recentEvents,
      event.timestamp,
    );

    state.explorationRate = computeDynamicExplorationRate(
      0.2,
      state.attention,
      state.profile,
      undefined,
    );

    if (state.personalityProfile) {
      const prevTraits = { ...state.personalityProfile.traits };
      state.personalityProfile = updatePersonalityFromEvents(
        state.personalityProfile,
        state.recentEvents,
      );
      const drift = applyPersonalityDriftResponse(
        state.personalityProfile,
        prevTraits,
        (d) => {
          if (d.drifted && state.learningPath) {
            getSegmentModelRegistry().boostExplorationWeight(
              `${state.ageBand ?? "36_48"}|${state.countryCode ?? "GLOBAL"}|${state.developmentStage ?? "preschooler"}`,
              d.explorationBoost,
            );
            state.learningPath = reEvaluateLearningPath(
              state.learningPath,
              state.profile,
              state.ageBand ?? "36_48",
            );
          }
        },
      ).drift;
      if (drift.drifted) {
        state.explorationRate = Math.min(0.45, state.explorationRate + drift.explorationBoost);
      }
    }

    let decision: EnrichedRealtimeDecision = evaluateHybridRealtimeDecision(
      state,
      event,
      state.attention,
      {
        mlFlags: this.ml,
        ctx: {
          ageBand: state.ageBand ?? "36_48",
          developmentStage: state.developmentStage ?? "preschooler",
          countryCode: (state.countryCode ?? "GLOBAL") as CountryCode,
          personality: state.personalityProfile,
          behavioralPrediction: state.behavioralPrediction,
        },
        logTraining: true,
      },
    );

    state.lastDecisionSource = decision.source;

    const rewardState = this.rewards.get(event.childId)!;
    const milestone = checkMilestoneReached(state.profile, rewardState);
    if (milestone) {
      decision = {
        ...milestone,
        source: "rule",
        confidence: 1,
        rewardEstimate: 0.8,
        mlEnabled: this.ml.mlEnabled,
        fallbackUsed: true,
      };
    } else if (
      shouldInjectReward(
        state.attention,
        this.experiments,
        rewardState,
        event.timestamp,
        state.personalityProfile,
      )
    ) {
      const reward = buildRewardDecision("attention_reward");
      decision = {
        ...reward,
        source: "rule",
        confidence: 1,
        rewardEstimate: 0.7,
        nbaAction: "INJECT_REWARD",
        mlEnabled: this.ml.mlEnabled,
        fallbackUsed: true,
      };
      markRewardInjected(rewardState, event.timestamp);
    }

    this.recordOutcomeFeedback(state, event, decision);
    this.lastDecisionMeta.set(event.childId, decision);

    if (decision.action === "ADJUST_DIFFICULTY") {
      state.liveDifficulty = this.applyDifficultyDecision(state.liveDifficulty, decision, event);
    }

    const mutated = mutateSession(state, decision);
    state.sessionPlan = mutated.sessionPlan;
    state.currentIndex = mutated.currentIndex;

    return this.buildUpdate(state, decision);
  }

  getSession(childId: string): RealtimeSessionState | undefined {
    return this.sessions.get(childId);
  }

  endSession(childId: string): void {
    const state = this.sessions.get(childId);
    const meta = this.lastDecisionMeta.get(childId);
    if (state) {
      recordSessionEnd({
        childId,
        startedAt: state.startedAt,
        endedAt: Date.now(),
        source: meta?.source ?? state.lastDecisionSource ?? "rule",
      });
    }
    void this.streamByChild.get(childId)?.flushNow(childId);
    void getGlobalTrainingPipeline().flushBatch();
    this.sessions.delete(childId);
    this.rewards.delete(childId);
    this.streamByChild.delete(childId);
    this.lastDecisionMeta.delete(childId);
    clearBanditState(childId);
    this.bus.clearChild(childId);
  }

  getMlMetrics() {
    return computeMlMetrics();
  }

  private recordOutcomeFeedback(
    state: RealtimeSessionState,
    event: RealtimeEvent,
    decision: EnrichedRealtimeDecision,
  ): void {
    if (
      event.type !== "CONTENT_COMPLETED" &&
      event.type !== "CONTENT_SKIPPED" &&
      event.type !== "USER_IDLE"
    ) {
      return;
    }
    const prevEngagement = state.profile.behavior.engagementScore;
    const pipeline = getGlobalTrainingPipeline();
    const engagementDelta = state.profile.behavior.engagementScore - prevEngagement;
    const current = state.sessionPlan[state.currentIndex];
    pipeline.attachOutcome(
      state.childId,
      event.timestamp,
      {
        completed: event.type === "CONTENT_COMPLETED",
        skipped: event.type === "CONTENT_SKIPPED",
        idle: event.type === "USER_IDLE",
        engagementDelta,
        engagementHigh: engagementDelta >= 8,
        exploredContent: state.explorationRate > 0.25,
        difficultyLevel: decision.payload?.direction === "up" ? 3 : 2,
      },
      getBanditState(state.childId),
      decision.nbaAction,
      undefined,
      current?.moduleId,
    );
  }

  private applyDifficultyDecision(
    live: LiveDifficultyState,
    decision: RealtimeDecision,
    event: RealtimeEvent,
  ): LiveDifficultyState {
    const direction = decision.payload.direction as "up" | "down" | undefined;
    const applied = applyLiveDifficultyAdjustment(
      {
        baseLevel: live.baseLevel,
        baseDifficulty: live.baseDifficulty,
        adjustments: live.adjustments,
      },
      {
        direction,
        delta: Number(decision.payload.delta ?? 0.35),
        responseTimeMs: event.metadata?.responseTime,
        skips: event.type === "CONTENT_SKIPPED" ? 1 : 0,
        accuracy: event.metadata?.correct === false ? 0.2 : 0.85,
      },
    );
    return {
      ...live,
      liveLevel: applied.liveLevel,
      liveDifficulty: applied.liveDifficulty,
      adjustments: applied.adjustments,
    };
  }

  private ensureStreamProcessor(childId: string): RealtimeStreamProcessor {
    let stream = this.streamByChild.get(childId);
    if (!stream) {
      stream = new RealtimeStreamProcessor({
        debounceMs: REALTIME_THRESHOLDS.streamFlushDebounceMs,
        onFlush: async ({ childId: id, profile }) => {
          const s = this.sessions.get(id);
          if (s) s.profile = profile;
          await this.onProfileFlush?.(id, profile);
        },
      });
      this.streamByChild.set(childId, stream);
    }
    return stream;
  }

  private buildUpdate(
    state: RealtimeSessionState,
    decision: EnrichedRealtimeDecision,
  ): SessionUpdateMessage {
    return {
      type: "session_update",
      action: decision.action,
      payload: decision.payload,
      sessionPlan: state.sessionPlan,
      currentIndex: state.currentIndex,
      attention: state.attention,
      liveDifficulty: state.liveDifficulty,
      explorationRate: state.explorationRate,
      source: decision.source,
      confidence: decision.confidence,
      rewardEstimate: decision.rewardEstimate,
      nbaAction: decision.nbaAction,
      mlEnabled: decision.mlEnabled,
      fallbackUsed: decision.fallbackUsed,
    };
  }
}

let globalCoordinator: RealtimeCoordinator | null = null;

export function getGlobalRealtimeCoordinator(
  options?: RealtimeCoordinatorOptions,
): RealtimeCoordinator {
  if (!globalCoordinator) globalCoordinator = new RealtimeCoordinator(options);
  return globalCoordinator;
}

export function resetGlobalRealtimeCoordinator(): void {
  globalCoordinator = null;
}
