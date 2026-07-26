/**
 * Bridge between birth-sky AI routes and @workspace/birth-sky-runtime.
 * No engine internals modified.
 */

import { randomUUID } from "node:crypto";
import {
  buildAdminDashboard,
  recordPipelineObservability,
  recordProductAnalytics,
  resolvePipelineFeatureFlags,
  type PipelineObservabilityEvent,
  type RuntimePipelineResult,
} from "@workspace/birth-sky-runtime";
import type { BirthSkyAiContextInput } from "./ai-context.js";

export function newBirthSkyRequestId(): string {
  return `bsr_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/** Hash conversation id for dashboards (no raw id required). */
export function conversationKey(conversationId: string): string {
  let h = 2166136261;
  for (let i = 0; i < conversationId.length; i++) {
    h ^= conversationId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ck_${(h >>> 0).toString(16)}`;
}

export function recordBirthSkyPipelineObs(input: {
  requestId: string;
  conversationId?: string;
  pipeline?: Pick<
    RuntimePipelineResult,
    | "stageTimings"
    | "totalPipelineMs"
    | "failoverStages"
    | "flags"
    | "experiment"
    | "status"
    | "snapshotVersions"
  > | null;
  llmLatencyMs?: number | null;
  cacheHit?: boolean | null;
  evaluationScore?: number | null;
  safetyScore?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCostUsd?: number | null;
  status?: PipelineObservabilityEvent["status"];
}): void {
  const flags = input.pipeline?.flags ?? resolvePipelineFeatureFlags();
  recordPipelineObservability({
    requestId: input.requestId,
    conversationKey: input.conversationId
      ? conversationKey(input.conversationId)
      : null,
    stageTimings: input.pipeline?.stageTimings ?? [],
    totalPipelineMs: input.pipeline?.totalPipelineMs ?? 0,
    llmLatencyMs: input.llmLatencyMs ?? null,
    cacheHit: input.cacheHit ?? null,
    cacheMiss:
      input.cacheHit === true ? false : input.cacheHit === false ? true : null,
    evaluationScore: input.evaluationScore ?? null,
    safetyScore: input.safetyScore ?? null,
    snapshotVersions: input.pipeline?.snapshotVersions ?? {
      meaning: null,
      development: null,
      adaptive: null,
      conversation: null,
      evidence: null,
    },
    flags,
    experiment: input.pipeline?.experiment
      ? {
          experimentId: input.pipeline.experiment.experimentId,
          armId: input.pipeline.experiment.armId,
        }
      : null,
    failoverStages: input.pipeline?.failoverStages ?? [],
    status:
      input.status ??
      (input.pipeline?.status === "degraded" ? "degraded" : "ok"),
    promptTokens: input.promptTokens ?? null,
    completionTokens: input.completionTokens ?? null,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
  });
}

export function trackBirthSkyProductEvent(
  name: Parameters<typeof recordProductAnalytics>[0]["name"],
  props?: Record<string, string | number | boolean>,
): void {
  recordProductAnalytics({ name, props });
}

export function getBirthSkyOpsDashboard() {
  return buildAdminDashboard();
}

/** Whether server should skip evidence in LLM (existing DEBUG_EXPLAINABILITY). */
export function shouldSkipEvidenceLayer(): boolean {
  return !resolvePipelineFeatureFlags().evidence;
}

export function applyServerFeatureFlagNulls(
  input: BirthSkyAiContextInput,
): BirthSkyAiContextInput {
  const flags = resolvePipelineFeatureFlags();
  return {
    ...input,
    meaningSnapshot: flags.meaning ? input.meaningSnapshot : null,
    developmentSnapshot: flags.development ? input.developmentSnapshot : null,
    adaptiveSnapshot: flags.adaptive ? input.adaptiveSnapshot : null,
    conversationPlan: flags.conversation ? input.conversationPlan : null,
    evidenceSnapshot: flags.evidence ? input.evidenceSnapshot : null,
    includeEvidence: flags.evidence ? input.includeEvidence : false,
  };
}

export { resolvePipelineFeatureFlags };
