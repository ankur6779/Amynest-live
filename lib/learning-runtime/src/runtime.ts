import type { LearningEvent } from "@workspace/learning-events";
import { enrichDecisionPatch, finalizeDecision } from "./enrich.js";
import { normalizeLearningEvent } from "./normalize.js";
import { DEFAULT_FEATURE_FLAGS, DEFAULT_RUNTIME_RULES } from "./rule-pack.js";
import { evaluateRules, mergeDecisionPatches } from "./rules.js";
import { evaluateRulesDetailed } from "./rule-evaluation.js";
import {
  applySignalToState,
  createChildRuntimeState,
  markRuleFired,
} from "./state.js";
import {
  buildKnowledgeDelta,
  compactMatchedRules,
  ruleDependencyIndex,
  type RuntimeTraceFrame,
  type RuntimeTracer,
} from "./trace.js";
import type {
  ChildRuntimeState,
  LearningDecision,
  RuntimeInputSnapshots,
  RuntimeRule,
} from "./types.js";

export type LearningRuntimeOptions = {
  rules?: RuntimeRule[];
  featureFlags?: Record<string, boolean>;
  now?: () => Date;
  createDecisionId?: () => string;
};

/** Slim per-decision metrics — safe for production (no frame allocation). */
export type RuntimeMetricsSample = {
  latencyMs: number;
  ruleId: string;
  matchedRuleCount: number;
  ruleEvaluations: number;
  cooldownHits: number;
  ruleFailures: number;
  reviewQueueSize: number;
  recommendationNodeId: string | null;
  nextActivityNodeId: string | null;
  eventType: string;
  childId: string;
  attentionClassification: string | null;
};

export type RuntimeMetricsObserver = (sample: RuntimeMetricsSample) => void;

export type ProcessEventResult = {
  decision: LearningDecision;
  state: ChildRuntimeState;
  /** Present only when a tracer is attached (inspector). */
  trace?: RuntimeTraceFrame;
};

export type LearningRuntime = {
  /** Event → Normalize → Rules → State → Decision */
  processEvent(
    event: LearningEvent,
    snapshots?: RuntimeInputSnapshots | null,
  ): ProcessEventResult;
  getState(childId: string | number): ChildRuntimeState;
  setFeatureFlags(flags: Record<string, boolean>): void;
  getFeatureFlags(): Record<string, boolean>;
  replaceRules(rules: RuntimeRule[]): void;
  getRules(): RuntimeRule[];
  getSnapshotVersion(): number;
  /**
   * Attach/detach inspector tracer. When null, processEvent takes the
   * production fast path (no skip bookkeeping, no frame allocation)
   * unless a detailed metrics observer is attached.
   */
  setTracer(tracer: RuntimeTracer | null): void;
  /**
   * Production metrics sink. Lite by default; set detailed=true to count
   * cooldown / skip reasons (uses evaluateRulesDetailed).
   */
  setMetricsObserver(
    observer: RuntimeMetricsObserver | null,
    options?: { detailed?: boolean },
  ): void;
  clearChild(childId?: string | number): void;
};

let decisionCounter = 0;
let traceCounter = 0;

function defaultDecisionId(): string {
  decisionCounter += 1;
  return `ld_${Date.now().toString(36)}_${decisionCounter.toString(36)}`;
}

/**
 * Create an Amy Learning Runtime instance.
 * Incremental per-child state; target decision path &lt; 5ms.
 */
export function createLearningRuntime(
  options: LearningRuntimeOptions = {},
): LearningRuntime {
  const states = new Map<string, ChildRuntimeState>();
  let rules = options.rules ?? DEFAULT_RUNTIME_RULES;
  let featureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(options.featureFlags ?? {}),
  };
  const nowFn = options.now ?? (() => new Date());
  const createDecisionId = options.createDecisionId ?? defaultDecisionId;
  let tracer: RuntimeTracer | null = null;
  let metricsObserver: RuntimeMetricsObserver | null = null;
  let detailedMetrics = false;
  let snapshotVersion = 0;
  /** Last snapshots per child — for knowledge delta when tracing. */
  const lastSnapshots = new Map<string, RuntimeInputSnapshots | null>();

  const getOrCreate = (childId: string): ChildRuntimeState => {
    let s = states.get(childId);
    if (!s) {
      s = createChildRuntimeState(childId);
      states.set(childId, s);
    }
    return s;
  };

  return {
    processEvent(event, snapshots = null) {
      const t0 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();

      // Ignore decision echoes only — prevents runtime ↔ bus loops.
      if (event.type === "learning.decision") {
        const childId = String(event.payload.childId);
        const state = getOrCreate(childId);
        const decision = finalizeDecision({
          id: createDecisionId(),
          childId,
          timestamp: nowFn().toISOString(),
          patch: {
            reason: "Ignored learning.decision echo",
            difficulty: "same",
            hints: "none",
            celebrationLevel: 0,
            narrationLength: "medium",
            breakSuggestion: false,
            rewardPriority: "normal",
            nextActivity: null,
            recommendation: null,
            reviewQueue: [],
            confidence: 0,
            evidence: [
              {
                key: "ignored",
                value: event.type,
                source: "runtime",
              },
            ],
          },
          primaryRuleId: "runtime.ignore_echo",
          contributingRuleIds: ["runtime.ignore_echo"],
          confidence: 0,
          sourceEventId: event.id,
          latencyMs: 0,
        });
        return { decision, state };
      }

      const signal = normalizeLearningEvent(event);
      const stateBefore = getOrCreate(signal.childId);
      // Clone only when tracing (production: mutate path uses apply which returns new obj anyway)
      const stateBeforeSnap = tracer
        ? ({
            ...stateBefore,
            recentEventTypes: [...stateBefore.recentEventTypes],
            ruleCooldowns: { ...stateBefore.ruleCooldowns },
          } as ChildRuntimeState)
        : stateBefore;

      let state = applySignalToState(stateBefore, signal, snapshots);
      const nowMs = nowFn().getTime();

      const ctx = {
        signal,
        state,
        snapshots: snapshots ?? {},
        nowMs,
        featureFlags,
      };

      // Fast path: no tracer/detailed metrics → evaluateRules only.
      let fires;
      let skipped: import("./rule-evaluation.js").RuleSkipReason[] = [];
      const wantDetailed = Boolean(tracer) || (Boolean(metricsObserver) && detailedMetrics);
      if (wantDetailed) {
        const detailed = evaluateRulesDetailed(rules, ctx);
        fires = detailed.matched;
        skipped = detailed.skipped;
      } else {
        fires = evaluateRules(rules, ctx);
      }

      for (const fire of fires) {
        state = markRuleFired(state, fire.ruleId, nowMs);
      }

      const merged = mergeDecisionPatches(fires);
      const enriched = enrichDecisionPatch(
        merged.patch,
        signal,
        state,
        snapshots ?? {},
      );

      const t1 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const latencyMs = Math.max(0, t1 - t0);

      const decision = finalizeDecision({
        id: createDecisionId(),
        childId: signal.childId,
        timestamp: signal.timestamp || nowFn().toISOString(),
        patch: {
          ...enriched,
          evidence: [
            ...(enriched.evidence ?? []),
            {
              key: "latencyMs",
              value: Number(latencyMs.toFixed(3)),
              source: "runtime",
            },
          ],
        },
        primaryRuleId: merged.primaryRuleId,
        contributingRuleIds: merged.contributingRuleIds,
        confidence: merged.confidence,
        sourceEventId: signal.eventId,
        latencyMs,
      });

      state = { ...state, lastDecisionId: decision.id };
      states.set(signal.childId, state);
      snapshotVersion += 1;

      let trace: RuntimeTraceFrame | undefined;
      if (tracer) {
        const prevSnap = lastSnapshots.get(signal.childId) ?? null;
        traceCounter += 1;
        trace = {
          schemaVersion: 1,
          id: `rtf_${traceCounter.toString(36)}_${Date.now().toString(36)}`,
          at: decision.timestamp,
          childId: signal.childId,
          sessionId: signal.sessionId ?? state.sessionId,
          snapshotVersion,
          event,
          normalized: signal,
          snapshots: snapshots ?? null,
          stateBefore: stateBeforeSnap,
          stateAfter: {
            ...state,
            recentEventTypes: [...state.recentEventTypes],
            ruleCooldowns: { ...state.ruleCooldowns },
          },
          matchedRules: compactMatchedRules(fires),
          skippedRules: skipped,
          decision,
          featureFlags: { ...featureFlags },
          ruleDependencies: ruleDependencyIndex(rules),
          knowledgeDelta: buildKnowledgeDelta(prevSnap, snapshots),
          attentionState: {
            classification: state.attentionClass,
            score: state.attentionScore,
            suggestBreak: state.suggestBreak,
          },
          latencyMs,
        };
        try {
          tracer(trace);
        } catch {
          /* inspector must never break runtime */
        }
      }

      if (metricsObserver) {
        const cooldownHits = skipped.filter((s) => s.reason === "cooldown").length;
        const ruleFailures = skipped.filter(
          (s) => s.reason === "dependency_unmet",
        ).length;
        try {
          metricsObserver({
            latencyMs,
            ruleId: decision.ruleId,
            matchedRuleCount: fires.length,
            ruleEvaluations: wantDetailed ? rules.length : fires.length,
            cooldownHits,
            ruleFailures,
            reviewQueueSize: decision.reviewQueue?.length ?? 0,
            recommendationNodeId:
              decision.recommendation?.conceptId ??
              decision.recommendation?.id ??
              null,
            nextActivityNodeId:
              decision.nextActivity?.conceptId ??
              decision.nextActivity?.entityId ??
              null,
            eventType: event.type,
            childId: signal.childId,
            attentionClassification: state.attentionClass ?? null,
          });
        } catch {
          /* metrics must never break runtime */
        }
      }

      lastSnapshots.set(signal.childId, snapshots ?? null);

      return { decision, state, trace };
    },

    getState(childId) {
      return getOrCreate(String(childId));
    },

    setFeatureFlags(flags) {
      featureFlags = { ...featureFlags, ...flags };
    },

    getFeatureFlags() {
      return { ...featureFlags };
    },

    replaceRules(next) {
      rules = next;
    },

    getRules() {
      return rules;
    },

    getSnapshotVersion() {
      return snapshotVersion;
    },

    setTracer(next) {
      tracer = next;
    },

    setMetricsObserver(observer, opts) {
      metricsObserver = observer;
      detailedMetrics = Boolean(opts?.detailed);
    },

    clearChild(childId) {
      if (childId == null) {
        states.clear();
        lastSnapshots.clear();
        return;
      }
      const id = String(childId);
      states.delete(id);
      lastSnapshots.delete(id);
    },
  };
}
