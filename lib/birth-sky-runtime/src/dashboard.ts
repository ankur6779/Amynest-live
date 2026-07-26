/**
 * Admin dashboard payload assembler.
 */

import {
  ADAPTIVE_ENGINE_VERSION,
} from "@workspace/birth-sky-adaptive";
import {
  CONVERSATION_ENGINE_VERSION,
} from "@workspace/birth-sky-conversation";
import {
  DEVELOPMENT_ENGINE_VERSION,
} from "@workspace/birth-sky-development";
import {
  EVIDENCE_ENGINE_VERSION,
} from "@workspace/birth-sky-evidence";
import {
  MEANING_ENGINE_VERSION,
} from "@workspace/birth-sky-meaning";
import { resolvePipelineFeatureFlags } from "./flags.js";
import {
  computeCostRollup,
  computeQualityMetrics,
  experimentArmCounts,
  listObservabilityEvents,
  p95,
  topErrorCodes,
} from "./metrics-store.js";
import {
  BIRTH_SKY_RUNTIME_VERSION,
  PIPELINE_SLO_MS,
  type AdminDashboardPayload,
} from "./types.js";

export function buildAdminDashboard(windowMs = 24 * 60 * 60 * 1000): AdminDashboardPayload {
  const flags = resolvePipelineFeatureFlags();
  const since = Date.now() - windowMs;
  const rows = listObservabilityEvents().filter((e) => e.ts >= since);
  const pipelineMs = rows.map((r) => r.totalPipelineMs);
  const sloPass = pipelineMs.filter((ms) => ms <= PIPELINE_SLO_MS).length;

  return {
    runtimeVersion: BIRTH_SKY_RUNTIME_VERSION,
    pipelineVersions: {
      meaning: MEANING_ENGINE_VERSION,
      development: DEVELOPMENT_ENGINE_VERSION,
      adaptive: ADAPTIVE_ENGINE_VERSION,
      conversation: CONVERSATION_ENGINE_VERSION,
      evidence: EVIDENCE_ENGINE_VERSION,
      evaluation: "ai-evaluation/1.0.0",
      runtime: BIRTH_SKY_RUNTIME_VERSION,
    },
    featureFlags: flags,
    latency: {
      averagePipelineMs:
        pipelineMs.length === 0
          ? null
          : Math.round(
              (pipelineMs.reduce((a, b) => a + b, 0) / pipelineMs.length) * 10,
            ) / 10,
      p95PipelineMs: p95(pipelineMs),
      sloMs: PIPELINE_SLO_MS,
      sloPassRate: pipelineMs.length ? sloPass / pipelineMs.length : null,
    },
    quality: computeQualityMetrics(windowMs),
    cost: computeCostRollup(windowMs),
    errors: topErrorCodes(windowMs),
    experiments: experimentArmCounts(windowMs),
    recentRequestCount: rows.length,
  };
}
