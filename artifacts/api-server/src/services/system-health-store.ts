/**
 * Global system health state — aggregated infra + audio metrics for self-healing.
 */

import { getApiHealthSnapshot, getRecentApiHealthSnapshot } from "./api-health-store.js";
import { getAdminDashboard } from "./audio-health-store.js";
import { resetHealHysteresisForTests, updateHealthLatches } from "./heal-hysteresis.js";

export type SystemHealthState = {
  apiHealthy: boolean;
  streamingHealthy: boolean;
  cacheHealthy: boolean;
  workerHealthy: boolean;
  dbHealthy: boolean;
  failureRate: number;
  avgTTFA: number;
  lastUpdated: number;
};

export type SystemMetrics = {
  audioFailureRate: number;
  fallbackRate: number;
  avgTTFA: number;
  streamingStallRate: number;
  apiErrorRate: number;
  workerQueueDelayMs: number;
  cacheHitRate: number;
  dbLatencyMs: number;
  redisHealthy: boolean;
};

export type SystemIncident = {
  type: "incident";
  cause: string;
  detectedAt: number;
  failureRate: number;
  avgTTFA: number;
};

export type SystemHealthSnapshot = {
  health: SystemHealthState;
  metrics: SystemMetrics;
  incidents: SystemIncident[];
  services?: import("./service-crash-store.js").ServiceCrashSnapshot;
  bullmq?: {
    failedJobs: import("../queue/failed-job-diagnostics.js").FailedAiJobDiagnostic[];
  };
  warmup?: import("../queue/warmup-job-stats.js").WarmupJobStats;
  predictive?: {
    ops: import("./predictive-ops-store.js").PredictiveOpsState;
    trends: import("./predictive-trend-store.js").MetricsHistory;
    predictedIncidents: import("./predictive-ops-store.js").PredictedIncident[];
  };
};

const systemHealth: SystemHealthState = {
  apiHealthy: true,
  streamingHealthy: true,
  cacheHealthy: true,
  workerHealthy: true,
  dbHealthy: true,
  failureRate: 0,
  avgTTFA: 0,
  lastUpdated: Date.now(),
};

let latestMetrics: SystemMetrics = {
  audioFailureRate: 0,
  fallbackRate: 0,
  avgTTFA: 0,
  streamingStallRate: 0,
  apiErrorRate: 0,
  workerQueueDelayMs: 0,
  cacheHitRate: 1,
  dbLatencyMs: 0,
  redisHealthy: true,
};

const incidents: SystemIncident[] = [];
const MAX_INCIDENTS = 20;

/** Previous sample for spike detection. */
let prevMetrics: SystemMetrics | null = null;

async function measureDbLatencyMs(): Promise<number> {
  const start = Date.now();
  try {
    if (!process.env.DATABASE_URL?.trim()) return Date.now() - start;
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    return Date.now() - start;
  } catch {
    return Date.now() - start;
  }
}

async function measureWorkerQueueDelayMs(): Promise<number> {
  try {
    const { isBullMqActive } = await import("../queue/mode.js");
    if (!isBullMqActive()) return 0;
    const { getAiJobsQueue } = await import("../queue/index.js");
    const queue = getAiJobsQueue();
    const jobs = await queue.getJobs(["waiting", "delayed"], 0, 0, true);
    if (jobs.length === 0) return 0;
    const oldestTs = jobs.reduce(
      (min, job) => Math.min(min, job.timestamp ?? Date.now()),
      Date.now(),
    );
    return Math.max(0, Date.now() - oldestTs);
  } catch {
    return 0;
  }
}

async function pingRedis(): Promise<boolean> {
  try {
    const { verifyRedisConnection } = await import("../queue/redis.js");
    return await verifyRedisConnection();
  } catch {
    return false;
  }
}

function maxApiErrorRate(now: number): number {
  const snap = getApiHealthSnapshot(now);
  return snap.routes.reduce((max, route) => Math.max(max, route.errorRate), 0);
}

function computeStreamingStallRate(
  layerHealth: ReturnType<typeof getAdminDashboard>["layerHealth"],
): number {
  const streaming = layerHealth.find((l) => l.layer === "streaming");
  if (!streaming || streaming.total === 0) return 0;
  return streaming.failurePct;
}

function detectIncident(metrics: SystemMetrics, now: number): SystemIncident | null {
  if (!prevMetrics) return null;

  const failureSpike =
    metrics.audioFailureRate - prevMetrics.audioFailureRate > 0.03 &&
    metrics.audioFailureRate > 0.05;
  const ttfaSpike =
    metrics.avgTTFA - prevMetrics.avgTTFA > 400 && metrics.avgTTFA > 1200;

  if (!failureSpike && !ttfaSpike) return null;

  let cause = "system_degraded";
  if (metrics.apiErrorRate > 0.05) cause = "api_degraded";
  else if (metrics.streamingStallRate > 0.1) cause = "streaming_unstable";
  else if (metrics.workerQueueDelayMs > 5000) cause = "worker_delayed";
  else if (metrics.dbLatencyMs > 300) cause = "db_slow";
  else if (failureSpike) cause = "failure_spike";
  else if (ttfaSpike) cause = "ttfa_spike";

  return {
    type: "incident",
    cause,
    detectedAt: now,
    failureRate: metrics.audioFailureRate,
    avgTTFA: metrics.avgTTFA,
  };
}

export async function collectSystemMetrics(now = Date.now()): Promise<SystemMetrics> {
  const dashboard = getAdminDashboard(now);
  const [dbLatencyMs, workerQueueDelayMs, redisHealthy] = await Promise.all([
    measureDbLatencyMs(),
    measureWorkerQueueDelayMs(),
    pingRedis(),
  ]);

  const apiErrorRate = maxApiErrorRate(now);
  const streamingStallRate = computeStreamingStallRate(dashboard.layerHealth);
  const cacheHitRate = dashboard.cacheHealth.hitRate;

  const metrics: SystemMetrics = {
    audioFailureRate: dashboard.failureRate,
    fallbackRate: dashboard.fallbackRate,
    avgTTFA: dashboard.avgTTFA,
    streamingStallRate,
    apiErrorRate,
    workerQueueDelayMs,
    cacheHitRate,
    dbLatencyMs,
    redisHealthy,
  };

  latestMetrics = metrics;

  const incident = detectIncident(metrics, now);
  if (incident) {
    incidents.unshift(incident);
    if (incidents.length > MAX_INCIDENTS) incidents.length = MAX_INCIDENTS;
  }
  prevMetrics = { ...metrics };

  return metrics;
}

export function updateSystemHealthFromMetrics(metrics: SystemMetrics, now = Date.now()): SystemHealthState {
  const latches = updateHealthLatches({
    apiErrorRate: metrics.apiErrorRate,
    streamingStallRate: metrics.streamingStallRate,
    failureRate: metrics.audioFailureRate,
  });
  systemHealth.apiHealthy = latches.apiHealthy;
  systemHealth.streamingHealthy = latches.streamingHealthy;
  systemHealth.cacheHealthy = metrics.cacheHitRate >= 0.3 || metrics.cacheHitRate === 0;
  systemHealth.workerHealthy = metrics.workerQueueDelayMs <= 5000;
  systemHealth.dbHealthy = metrics.dbLatencyMs <= 300;
  systemHealth.failureRate = metrics.audioFailureRate;
  systemHealth.avgTTFA = metrics.avgTTFA;
  systemHealth.lastUpdated = now;
  return { ...systemHealth };
}

export function getSystemHealthState(): SystemHealthState {
  return { ...systemHealth };
}

export function markSystemComponentRecovered(
  component: keyof Pick<
    SystemHealthState,
    "apiHealthy" | "streamingHealthy" | "cacheHealthy" | "workerHealthy" | "dbHealthy"
  >,
): void {
  systemHealth[component] = true;
  systemHealth.lastUpdated = Date.now();
}

export function getSystemMetrics(): SystemMetrics {
  return { ...latestMetrics };
}

export function getSystemIncidents(): SystemIncident[] {
  return [...incidents];
}

export async function getSystemHealthSnapshot(now = Date.now()): Promise<SystemHealthSnapshot> {
  const metrics = await collectSystemMetrics(now);
  const health = updateSystemHealthFromMetrics(metrics, now);
  const { getServiceCrashSnapshot } = await import("./service-crash-store.js");
  const { getPredictiveOpsState, getPredictedIncidents } = await import("./predictive-ops-store.js");
  const { getMetricsHistory } = await import("./predictive-trend-store.js");
  const { getRecentFailedAiJobDiagnostics } = await import("../queue/failed-job-diagnostics.js");
  const failedJobs = await getRecentFailedAiJobDiagnostics(5);
  const { collectWarmupJobStats } = await import("../queue/warmup-job-stats.js");
  const warmup = await collectWarmupJobStats();
  return {
    health,
    metrics,
    incidents: getSystemIncidents(),
    services: getServiceCrashSnapshot(now),
    bullmq: { failedJobs },
    warmup,
    predictive: {
      ops: getPredictiveOpsState(),
      trends: getMetricsHistory(now),
      predictedIncidents: getPredictedIncidents(),
    },
  };
}

/** Service-level probes for recovery loop. */
export async function probeApiHealthy(): Promise<boolean> {
  const snap = getRecentApiHealthSnapshot();
  const maxError = snap.routes.reduce((max, route) => Math.max(max, route.errorRate), 0);
  const hasSamples = snap.routes.some((route) => route.total >= 3);
  return !hasSamples || maxError <= 0.03;
}

export async function probeStreamingHealthy(): Promise<boolean> {
  const dashboard = getAdminDashboard();
  const stallRate = computeStreamingStallRate(dashboard.layerHealth);
  const streaming = dashboard.layerHealth.find((l) => l.layer === "streaming");
  if (!streaming || streaming.total < 5) return true;
  return stallRate <= 0.06;
}

export async function probeWorkerHealthy(): Promise<boolean> {
  const delay = await measureWorkerQueueDelayMs();
  return delay <= 3000;
}

export async function probeCacheHealthy(): Promise<boolean> {
  const metrics = getSystemMetrics();
  if (metrics.cacheHitRate === 0) return true;
  return metrics.cacheHitRate >= 0.25;
}

export async function probeDbHealthy(): Promise<boolean> {
  const latency = await measureDbLatencyMs();
  return latency <= 250;
}

export async function probeInfraHealth(): Promise<{
  redis: boolean;
  queue: Awaited<
    ReturnType<(typeof import("../queue/bootstrap.js"))["getQueueHealthSnapshot"]>
  >;
  dbLatencyMs: number;
}> {
  const { getQueueHealthSnapshot } = await import("../queue/bootstrap.js");
  const [redis, queue, dbLatencyMs] = await Promise.all([
    pingRedis(),
    getQueueHealthSnapshot(),
    measureDbLatencyMs(),
  ]);
  return { redis, queue, dbLatencyMs };
}

/** Test-only reset. */
export function resetSystemHealthStoreForTests(): void {
  systemHealth.apiHealthy = true;
  systemHealth.streamingHealthy = true;
  systemHealth.cacheHealthy = true;
  systemHealth.workerHealthy = true;
  systemHealth.dbHealthy = true;
  systemHealth.failureRate = 0;
  systemHealth.avgTTFA = 0;
  systemHealth.lastUpdated = Date.now();
  latestMetrics = {
    audioFailureRate: 0,
    fallbackRate: 0,
    avgTTFA: 0,
    streamingStallRate: 0,
    apiErrorRate: 0,
    workerQueueDelayMs: 0,
    cacheHitRate: 1,
    dbLatencyMs: 0,
    redisHealthy: true,
  };
  prevMetrics = null;
  incidents.length = 0;
  resetHealHysteresisForTests();
}
