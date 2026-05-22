import { parseEnvMs } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { getMemoryCacheStats } from "./staticAudioBufferCache.js";
import { getActiveGcsReads, getMaxConcurrentGcsReads } from "./staticAudioConcurrency.js";

export type StaticAudioMetricOutcome = "success" | "failed" | "notFound";

const FAILURE_RATE_ALERT = Number(process.env.STATIC_AUDIO_FAILURE_RATE_ALERT ?? "0.05");
const CIRCUIT_FAILURE_THRESHOLD = Number(process.env.STATIC_AUDIO_CIRCUIT_FAILURES ?? "15");
const CIRCUIT_COOLDOWN_MS = parseEnvMs("STATIC_AUDIO_CIRCUIT_COOLDOWN_MS", 60_000);

const metrics = {
  total: 0,
  success: 0,
  failed: 0,
  notFound: 0,
};

let gcsReads = 0;
let gcsBytesRead = 0;
let responseTimeMsTotal = 0;
let responseTimeCount = 0;
let originRequests = 0;
let originMemoryServes = 0;
let originGcsServes = 0;
let cdnRevalidationRequests = 0;
let reportedCdnEdgeHit = 0;
let reportedCdnEdgeMiss = 0;

/** USD per GiB GCS egress (approximate — override via env). */
const GCS_EGRESS_USD_PER_GIB = Number(process.env.STATIC_AUDIO_GCS_USD_PER_GIB ?? "0.12");

let circuitOpen = false;
let circuitOpenedAt = 0;
let consecutiveFailures = 0;
let lastAlertAt = 0;
let dbFallbackServes = 0;
let placeholderServes = 0;
let onDemandGenerations = 0;
let generationQueueSize = 0;
let missingAudioReports = 0;

export function recordGcsRead(byteLength: number): void {
  gcsReads += 1;
  gcsBytesRead += byteLength;
}

/** Classify inbound request CDN headers (when edge revalidates to origin). */
export function recordCdnRequestHeaders(headers: Record<string, unknown>): void {
  const cf = String(headers["cf-cache-status"] ?? headers["CF-Cache-Status"] ?? "").toUpperCase();
  const xCache = String(headers["x-cache"] ?? headers["X-Cache"] ?? "").toUpperCase();
  const age = headers["age"] ?? headers["Age"];

  if (cf.includes("HIT") || xCache.includes("HIT")) {
    reportedCdnEdgeHit += 1;
  } else if (cf.includes("MISS") || xCache.includes("MISS") || cf.includes("EXPIRED")) {
    reportedCdnEdgeMiss += 1;
  } else if (age !== undefined && age !== null && String(age).length > 0) {
    reportedCdnEdgeHit += 1;
  }
}

export function recordOriginServe(
  headers: Record<string, unknown>,
  source: "memory" | "gcs",
  byteLength: number,
): void {
  originRequests += 1;
  if (source === "memory") originMemoryServes += 1;
  else originGcsServes += 1;

  recordCdnRequestHeaders(headers);

  if (headers["if-none-match"] || headers["if-modified-since"]) {
    cdnRevalidationRequests += 1;
  }
}

function estimateGcsCostUsd(): number {
  const gib = gcsBytesRead / (1024 * 1024 * 1024);
  return Number((gib * GCS_EGRESS_USD_PER_GIB).toFixed(6));
}

function estimateCostPer1kUsersUsd(): number {
  if (metrics.total === 0) return 0;
  const perRequest = estimateGcsCostUsd() / metrics.total;
  const requestsPerUser = 30;
  return Number((perRequest * requestsPerUser * 1000).toFixed(4));
}

export function recordResponseTimeMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  responseTimeMsTotal += ms;
  responseTimeCount += 1;
}

export function recordStaticAudioRequest(outcome: StaticAudioMetricOutcome): void {
  metrics.total += 1;
  if (outcome === "success") {
    metrics.success += 1;
    consecutiveFailures = 0;
    if (circuitOpen && Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
      circuitOpen = false;
      logger.info({ evt: "static_audio.circuit_closed" }, "static audio circuit closed after cooldown");
    }
  } else if (outcome === "notFound") {
    metrics.notFound += 1;
    consecutiveFailures += 1;
  } else {
    metrics.failed += 1;
    consecutiveFailures += 1;
  }

  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    openCircuit("consecutive_failures");
  }

  checkFailureRateAlert();
}

function openCircuit(reason: string): void {
  if (circuitOpen) return;
  circuitOpen = true;
  circuitOpenedAt = Date.now();
  logger.error(
    { evt: "static_audio.circuit_open", reason, metrics: getStaticAudioMetrics() },
    "static audio circuit breaker opened",
  );
  console.error("[ALERT] Static audio circuit open", { reason, ...getStaticAudioMetrics() });
}

export function isStaticAudioCircuitOpen(): boolean {
  if (!circuitOpen) return false;
  if (Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
    circuitOpen = false;
    return false;
  }
  return true;
}

export function checkFailureRateAlert(): void {
  if (metrics.total < 20) return;
  const failed = metrics.failed + metrics.notFound;
  const rate = failed / metrics.total;
  if (rate <= FAILURE_RATE_ALERT) return;

  const now = Date.now();
  if (now - lastAlertAt < 60_000) return;
  lastAlertAt = now;

  console.error("[ALERT] Static audio failure rate high", {
    total: metrics.total,
    failed,
    rate: Number(rate.toFixed(4)),
  });
  logger.error(
    {
      evt: "static_audio.failure_rate_high",
      total: metrics.total,
      failed,
      success: metrics.success,
      rate,
    },
    "static audio failure rate above threshold",
  );

  void import("./staticAudioAlerts.js").then(({ sendStaticAudioAlert }) =>
    sendStaticAudioAlert("failure_rate_high", { total: metrics.total, failed, rate }),
  );
}

export function recordDbFallbackServe(): void {
  dbFallbackServes += 1;
}

export function recordPlaceholderServe(): void {
  placeholderServes += 1;
}

export function recordOnDemandGeneration(): void {
  onDemandGenerations += 1;
}

export function recordGenerationQueueDepth(size: number): void {
  generationQueueSize = size;
}

export function recordMissingAudioReport(): void {
  missingAudioReports += 1;
}

export function getStaticAudioMetrics() {
  const mem = getMemoryCacheStats();
  const avgResponseTimeMs =
    responseTimeCount > 0 ? Math.round(responseTimeMsTotal / responseTimeCount) : 0;

  return {
    ...metrics,
    circuitOpen: isStaticAudioCircuitOpen(),
    consecutiveFailures,
    gcsReads,
    gcsBytesRead,
    gcsCostEstimateUsd: estimateGcsCostUsd(),
    estimatedCostPer1kUsersUsd: estimateCostPer1kUsersUsd(),
    avgResponseTimeMs,
    memoryCache: mem,
    activeGcsReads: getActiveGcsReads(),
    maxConcurrentGcsReads: getMaxConcurrentGcsReads(),
    origin: {
      requests: originRequests,
      memoryServes: originMemoryServes,
      gcsServes: originGcsServes,
      revalidations: cdnRevalidationRequests,
    },
    cdn: {
      edgeHitSignals: reportedCdnEdgeHit,
      edgeMissSignals: reportedCdnEdgeMiss,
    },
    reliability: {
      dbFallbackServes,
      placeholderServes,
      onDemandGenerations,
      generationQueueSize,
      missingAudioReports,
      fallbackRate:
        metrics.total > 0
          ? Number(((dbFallbackServes + placeholderServes) / metrics.total).toFixed(4))
          : 0,
    },
  };
}

export function resetStaticAudioMetricsForTests(): void {
  metrics.total = 0;
  metrics.success = 0;
  metrics.failed = 0;
  metrics.notFound = 0;
  gcsReads = 0;
  gcsBytesRead = 0;
  responseTimeMsTotal = 0;
  responseTimeCount = 0;
  originRequests = 0;
  originMemoryServes = 0;
  originGcsServes = 0;
  cdnRevalidationRequests = 0;
  reportedCdnEdgeHit = 0;
  reportedCdnEdgeMiss = 0;
  circuitOpen = false;
  circuitOpenedAt = 0;
  consecutiveFailures = 0;
  lastAlertAt = 0;
  dbFallbackServes = 0;
  placeholderServes = 0;
  onDemandGenerations = 0;
  generationQueueSize = 0;
  missingAudioReports = 0;
}
