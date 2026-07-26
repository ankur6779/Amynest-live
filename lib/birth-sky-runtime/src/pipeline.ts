/**
 * Production pipeline runner — timings + feature flags + graceful failover.
 * Calls public engine APIs only; never edits engine internals.
 */

import {
  computeAdaptiveSnapshot,
  type AdaptiveHistoryInput,
  type AdaptiveSnapshot,
} from "@workspace/birth-sky-adaptive";
import {
  computeConversationPlan,
  type ConversationHistorySummary,
  type ConversationPlan,
} from "@workspace/birth-sky-conversation";
import {
  computeDevelopmentSnapshot,
  type DevelopmentSnapshot,
  type RoutineInput,
} from "@workspace/birth-sky-development";
import {
  computeEvidenceSnapshot,
  type EvidenceSnapshot,
} from "@workspace/birth-sky-evidence";
import {
  computeMeaningSnapshot,
  type MeaningAstronomyInput,
  type MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import { applyExperimentToConversationPlan, assignExperiment } from "./experiments.js";
import { isStageEnabled, resolvePipelineFeatureFlags } from "./flags.js";
import type {
  ExperimentAssignment,
  PipelineFeatureFlags,
  PipelineStageId,
  StageTiming,
} from "./types.js";

export type RuntimePipelineInput = {
  requestId: string;
  astronomy: MeaningAstronomyInput;
  ageMonths?: number | null;
  birthDate?: string | null;
  asOfDate?: string | null;
  parentGoals?: string[];
  milestones?: string[];
  routines?: RoutineInput[];
  adaptiveHistory?: AdaptiveHistoryInput | null;
  userQuestion: string;
  entryPoint?: string | null;
  conversationHistorySummary?: ConversationHistorySummary | null;
  flags?: PipelineFeatureFlags;
  enableExperiments?: boolean;
  /** Prefetched snapshots (optional). */
  meaning?: MeaningSnapshot | null;
  development?: DevelopmentSnapshot | null;
  adaptive?: AdaptiveSnapshot | null;
  conversation?: ConversationPlan | null;
  evidence?: EvidenceSnapshot | null;
};

export type RuntimePipelineResult = {
  meaning: MeaningSnapshot | null;
  development: DevelopmentSnapshot | null;
  adaptive: AdaptiveSnapshot | null;
  conversation: ConversationPlan | null;
  evidence: EvidenceSnapshot | null;
  stageTimings: StageTiming[];
  totalPipelineMs: number;
  failoverStages: PipelineStageId[];
  flags: PipelineFeatureFlags;
  experiment: ExperimentAssignment | null;
  status: "ok" | "degraded";
  snapshotVersions: {
    meaning: string | null;
    development: string | null;
    adaptive: string | null;
    conversation: string | null;
    evidence: string | null;
  };
};

function timeStage<T>(
  stage: PipelineStageId,
  enabled: boolean,
  fn: () => T,
): { value: T | null; timing: StageTiming } {
  if (!enabled) {
    return {
      value: null,
      timing: { stage, durationMs: 0, status: "disabled" },
    };
  }
  const t0 = performance.now();
  try {
    const value = fn();
    return {
      value,
      timing: {
        stage,
        durationMs: Math.round((performance.now() - t0) * 100) / 100,
        status: "ok",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      value: null,
      timing: {
        stage,
        durationMs: Math.round((performance.now() - t0) * 100) / 100,
        status: "failed",
        errorCode: msg.slice(0, 80),
      },
    };
  }
}

/**
 * Run Meaning→Evidence with flags + failover.
 * Failed/disabled stages are skipped; conversation continues with available layers.
 */
export function runIntelligencePipeline(
  input: RuntimePipelineInput,
): RuntimePipelineResult {
  const flags = input.flags ?? resolvePipelineFeatureFlags();
  const stageTimings: StageTiming[] = [];
  const failoverStages: PipelineStageId[] = [];
  const t0 = performance.now();

  let meaning: MeaningSnapshot | null = input.meaning ?? null;
  if (!meaning) {
    const r = timeStage("meaning", isStageEnabled(flags, "meaning"), () =>
      computeMeaningSnapshot(input.astronomy),
    );
    stageTimings.push(r.timing);
    meaning = r.value;
    if (r.timing.status === "failed") failoverStages.push("meaning");
  } else {
    stageTimings.push({
      stage: "meaning",
      durationMs: 0,
      status: isStageEnabled(flags, "meaning") ? "ok" : "disabled",
    });
    if (!isStageEnabled(flags, "meaning")) meaning = null;
  }

  let development: DevelopmentSnapshot | null = input.development ?? null;
  if (!development) {
    const r = timeStage(
      "development",
      isStageEnabled(flags, "development") && Boolean(meaning),
      () =>
        computeDevelopmentSnapshot({
          meaning: meaning!,
          ageMonths: input.ageMonths,
          birthDate: input.birthDate,
          asOfDate: input.asOfDate,
          parentGoals: input.parentGoals,
          milestones: input.milestones,
          routines: input.routines,
        }),
    );
    stageTimings.push(
      r.timing.status === "disabled" && !meaning
        ? { ...r.timing, status: "skipped" }
        : r.timing,
    );
    development = r.value;
    if (r.timing.status === "failed") failoverStages.push("development");
  } else if (!isStageEnabled(flags, "development")) {
    development = null;
    stageTimings.push({ stage: "development", durationMs: 0, status: "disabled" });
  } else {
    stageTimings.push({ stage: "development", durationMs: 0, status: "ok" });
  }

  let adaptive: AdaptiveSnapshot | null = input.adaptive ?? null;
  if (!adaptive) {
    const r = timeStage(
      "adaptive",
      isStageEnabled(flags, "adaptive") && Boolean(development),
      () =>
        computeAdaptiveSnapshot({
          development: development!,
          history: input.adaptiveHistory ?? null,
        }),
    );
    stageTimings.push(
      r.timing.status === "disabled" && !development
        ? { ...r.timing, status: "skipped" }
        : r.timing,
    );
    adaptive = r.value;
    if (r.timing.status === "failed") failoverStages.push("adaptive");
  } else if (!isStageEnabled(flags, "adaptive")) {
    adaptive = null;
    stageTimings.push({ stage: "adaptive", durationMs: 0, status: "disabled" });
  } else {
    stageTimings.push({ stage: "adaptive", durationMs: 0, status: "ok" });
  }

  let conversation: ConversationPlan | null = input.conversation ?? null;
  if (!conversation) {
    const r = timeStage("conversation", isStageEnabled(flags, "conversation"), () =>
      computeConversationPlan({
        meaning,
        development,
        adaptive,
        userQuestion: input.userQuestion,
        entryPoint: input.entryPoint,
        historySummary: input.conversationHistorySummary,
      }),
    );
    stageTimings.push(r.timing);
    conversation = r.value;
    if (r.timing.status === "failed") failoverStages.push("conversation");
  } else if (!isStageEnabled(flags, "conversation")) {
    conversation = null;
    stageTimings.push({ stage: "conversation", durationMs: 0, status: "disabled" });
  } else {
    stageTimings.push({ stage: "conversation", durationMs: 0, status: "ok" });
  }

  const experiment = assignExperiment({
    requestId: input.requestId,
    enabled: input.enableExperiments,
  });
  if (conversation) {
    conversation = applyExperimentToConversationPlan(conversation, experiment);
  }

  let evidence: EvidenceSnapshot | null = input.evidence ?? null;
  if (!evidence) {
    const r = timeStage("evidence", isStageEnabled(flags, "evidence"), () =>
      computeEvidenceSnapshot({
        astronomy: input.astronomy,
        meaning,
        development,
        adaptive,
        conversation,
        level: "compact",
      }),
    );
    stageTimings.push(r.timing);
    evidence = r.value;
    if (r.timing.status === "failed") failoverStages.push("evidence");
  } else if (!isStageEnabled(flags, "evidence")) {
    evidence = null;
    stageTimings.push({ stage: "evidence", durationMs: 0, status: "disabled" });
  } else {
    stageTimings.push({ stage: "evidence", durationMs: 0, status: "ok" });
  }

  // Evaluation stage is offline/CI by default — mark disabled unless flag on.
  stageTimings.push({
    stage: "evaluation",
    durationMs: 0,
    status: isStageEnabled(flags, "evaluation") ? "skipped" : "disabled",
  });

  const totalPipelineMs = Math.round((performance.now() - t0) * 100) / 100;

  return {
    meaning,
    development,
    adaptive,
    conversation,
    evidence,
    stageTimings,
    totalPipelineMs,
    failoverStages,
    flags,
    experiment,
    status: failoverStages.length ? "degraded" : "ok",
    snapshotVersions: {
      meaning: meaning?.meaningEngineVersion ?? null,
      development: development?.developmentEngineVersion ?? null,
      adaptive: adaptive?.adaptiveEngineVersion ?? null,
      conversation: conversation?.conversationEngineVersion ?? null,
      evidence: evidence?.evidenceEngineVersion ?? null,
    },
  };
}
