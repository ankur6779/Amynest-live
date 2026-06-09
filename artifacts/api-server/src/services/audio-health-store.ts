/**
 * Server-side audio health aggregation — rolling 15-minute realtime + 24h trends.
 */

import {
  computePercentiles,
  TTFA_P95_SLO_MS,
} from "../lib/audio-slo-utils.js";
import { logger } from "../lib/logger.js";
import { getApiHealthSnapshot, type ApiHealthSnapshot } from "./api-health-store.js";
import { getAdminOpsState, type AdminOpsState } from "./admin-ops-store.js";

export type AudioHealthLayer = "static" | "cache" | "api" | "streaming" | "emergency";
export type AudioHealthModule = "lesson" | "parentHub" | "phonics" | "coach";

export type IngestAudioHealthEvent = {
  event: "audio_success" | "audio_failure" | "audio_fallback" | "audio_start";
  module: AudioHealthModule;
  layer?: AudioHealthLayer;
  success?: boolean;
  fallbackUsed?: boolean;
  ttfaMs?: number;
  totalDurationMs?: number;
  bufferingEvents?: number;
  errorType?: string;
  device: "low" | "mid" | "high";
  network: "slow" | "fast";
  timestamp: number;
  sessionId?: string;
  from?: string;
  to?: string;
};

type StoredEvent = IngestAudioHealthEvent & { at: number };

export type ModuleStats = {
  module: AudioHealthModule;
  label: string;
  total: number;
  success: number;
  failure: number;
  fallback: number;
  avgTtfaMs: number;
};

export type LayerHealthRow = {
  layer: AudioHealthLayer;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  usagePct: number;
  avgTtfaMs: number;
};

export type ErrorFeedRow = {
  time: number;
  module: AudioHealthModule;
  error: string;
  layer?: AudioHealthLayer;
};

export type SessionFlowStep = {
  event: string;
  layer?: AudioHealthLayer;
  success?: boolean;
  errorType?: string;
  timestamp: number;
};

export type SessionFlow = {
  sessionId: string;
  module: AudioHealthModule;
  steps: SessionFlowStep[];
  outcome: "success" | "failure" | "in_progress";
  startedAt: number;
  lastAt: number;
};

export type TrendHourBucket = {
  hour: string;
  successRate: number;
  failureRate: number;
  total: number;
};

export type CacheHealthMetrics = {
  hitRate: number;
  missRate: number;
  invalidBlobCount: number;
  prefetchSuccessRate: number;
};

export type DeviceNetworkHeatmapRow = {
  device: string;
  network: string;
  total: number;
  failures: number;
  failPct: number;
};

export type AudioHealthAlert = {
  code: string;
  message: string;
  severity: "warning" | "critical";
  emoji: string;
  value: number;
  threshold: number;
};

export type TtfaSloMetrics = {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  sampleCount: number;
  p95TargetMs: number;
  p95Met: boolean;
};

export type AudioSloSnapshot = {
  windowMs: number;
  generatedAt: number;
  ttfa: TtfaSloMetrics;
  byModule: Record<
    AudioHealthModule,
    { p50: number; p95: number; sampleCount: number }
  >;
};

export type AdminDashboard = {
  windowMs: number;
  generatedAt: number;
  totalRequests: number;
  successRate: number;
  fallbackRate: number;
  failureRate: number;
  avgTTFA: number;
  ttfaP50: number;
  ttfaP95: number;
  ttfaP99: number;
  ttfaSlo: TtfaSloMetrics;
  avgBuffering: number;
  status: "healthy" | "degraded" | "failing";
  perModuleStats: ModuleStats[];
  layerHealth: LayerHealthRow[];
  cacheHealth: CacheHealthMetrics;
  apiHealth: ApiHealthSnapshot;
  errorFeed: ErrorFeedRow[];
  sessionFlows: SessionFlow[];
  deviceNetworkHeatmap: DeviceNetworkHeatmapRow[];
  trends24h: TrendHourBucket[];
  alerts: AudioHealthAlert[];
  ops: AdminOpsState;
};

const WINDOW_MS = 15 * 60 * 1000;
const TREND_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 20_000;
const MAX_ERROR_FEED = 100;
const MAX_SESSIONS = 10;

const eventLog: StoredEvent[] = [];
const errorFeed: ErrorFeedRow[] = [];
const sessionMap = new Map<string, SessionFlow>();
const hourBuckets = new Map<string, { success: number; failure: number; total: number }>();

const LAYERS: AudioHealthLayer[] = ["static", "cache", "api", "streaming", "emergency"];
const MODULES: AudioHealthModule[] = ["lesson", "parentHub", "phonics", "coach"];

const MODULE_LABELS: Record<AudioHealthModule, string> = {
  lesson: "Lessons",
  parentHub: "Parent Hub",
  phonics: "Phonics",
  coach: "Coach",
};

function prune(now = Date.now()): void {
  const cutoff = now - TREND_MS;
  while (eventLog.length > 0 && eventLog[0]!.at < cutoff) {
    eventLog.shift();
  }
  if (eventLog.length > MAX_EVENTS) {
    eventLog.splice(0, eventLog.length - MAX_EVENTS);
  }
  while (errorFeed.length > MAX_ERROR_FEED) {
    errorFeed.pop();
  }
  for (const [hour, bucket] of hourBuckets) {
    const hourTs = Date.parse(hour);
    if (!Number.isNaN(hourTs) && hourTs < cutoff) {
      hourBuckets.delete(hour);
    } else if (bucket.total === 0) {
      hourBuckets.delete(hour);
    }
  }
}

function isValidModule(value: string): value is AudioHealthModule {
  return (MODULES as readonly string[]).includes(value);
}

function isValidLayer(value: string | undefined): value is AudioHealthLayer {
  return value != null && (LAYERS as readonly string[]).includes(value);
}

function hourKey(ts: number): string {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function bumpHourBucket(ts: number, success: boolean): void {
  const key = hourKey(ts);
  const bucket = hourBuckets.get(key) ?? { success: 0, failure: 0, total: 0 };
  bucket.total += 1;
  if (success) bucket.success += 1;
  else bucket.failure += 1;
  hourBuckets.set(key, bucket);
}

function updateSession(event: StoredEvent): void {
  const sid = event.sessionId;
  if (!sid) return;

  let session = sessionMap.get(sid);
  if (!session) {
    session = {
      sessionId: sid,
      module: event.module,
      steps: [],
      outcome: "in_progress",
      startedAt: event.timestamp,
      lastAt: event.timestamp,
    };
    sessionMap.set(sid, session);
  }

  session.lastAt = event.timestamp;
  session.module = event.module;
  session.steps.push({
    event: event.event,
    layer: event.layer,
    success: event.success,
    errorType: event.errorType,
    timestamp: event.timestamp,
  });

  if (event.event === "audio_success") {
    session.outcome = "success";
  } else if (event.event === "audio_failure") {
    session.outcome = "failure";
  }

  if (sessionMap.size > MAX_SESSIONS * 3) {
    const sorted = [...sessionMap.entries()].sort((a, b) => b[1].lastAt - a[1].lastAt);
    sessionMap.clear();
    for (const [id, flow] of sorted.slice(0, MAX_SESSIONS * 2)) {
      sessionMap.set(id, flow);
    }
  }
}

export function ingestAudioHealthEvents(events: IngestAudioHealthEvent[]): { accepted: number } {
  const now = Date.now();
  let accepted = 0;

  for (const raw of events) {
    if (!raw?.event || !isValidModule(raw.module)) continue;

    const event: StoredEvent = {
      event: raw.event,
      module: raw.module,
      layer: isValidLayer(raw.layer) ? raw.layer : undefined,
      success: raw.success,
      fallbackUsed: raw.fallbackUsed,
      ttfaMs: Math.max(0, Math.min(raw.ttfaMs ?? 0, 60_000)),
      totalDurationMs: Math.max(0, Math.min(raw.totalDurationMs ?? 0, 600_000)),
      bufferingEvents: Math.max(0, raw.bufferingEvents ?? 0),
      errorType: raw.errorType?.slice(0, 120),
      device: raw.device ?? "mid",
      network: raw.network ?? "fast",
      timestamp: raw.timestamp ?? now,
      sessionId: raw.sessionId?.slice(0, 64),
      from: raw.from?.slice(0, 32),
      to: raw.to?.slice(0, 32),
      at: now,
    };

    eventLog.push(event);
    accepted += 1;
    updateSession(event);

    if (event.event === "audio_success" || event.event === "audio_failure") {
      bumpHourBucket(event.timestamp, event.event === "audio_success");
    }

    if (event.event === "audio_failure") {
      errorFeed.unshift({
        time: event.timestamp,
        module: event.module,
        error: event.errorType ?? "unknown",
        layer: event.layer,
      });
    }
  }

  prune(now);

  if (accepted > 0) {
    logger.debug({ accepted, total: eventLog.length }, "audio-health ingested");
  }

  return { accepted };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function resolveStatus(failureRate: number): AdminDashboard["status"] {
  if (failureRate < 0.02) return "healthy";
  if (failureRate <= 0.05) return "degraded";
  return "failing";
}

function buildCacheHealth(windowEvents: StoredEvent[]): CacheHealthMetrics {
  const cacheRows = windowEvents.filter((e) => e.layer === "cache");
  const apiRows = windowEvents.filter((e) => e.layer === "api" || e.layer === "streaming");
  const cacheHits = cacheRows.filter((e) => e.event === "audio_success").length;
  const apiMisses = apiRows.filter(
    (e) => e.event === "audio_success" || e.event === "audio_failure",
  ).length;
  const denom = cacheHits + apiMisses;
  const hitRate = denom > 0 ? cacheHits / denom : 0;

  const invalidBlobCount = windowEvents.filter(
    (e) => e.errorType === "invalid_blob" || e.errorType?.includes("invalid_blob"),
  ).length;

  const staticRows = windowEvents.filter((e) => e.layer === "static");
  const staticSuccess = staticRows.filter((e) => e.event === "audio_success").length;
  const prefetchSuccessRate =
    staticRows.length > 0 ? staticSuccess / staticRows.length : 1;

  return {
    hitRate,
    missRate: denom > 0 ? 1 - hitRate : 0,
    invalidBlobCount,
    prefetchSuccessRate,
  };
}

function buildAlerts(metrics: {
  failureRate: number;
  fallbackRate: number;
  avgTTFA: number;
  ttfaP95: number;
  layerHealth: LayerHealthRow[];
  apiHealth: ApiHealthSnapshot;
  perModuleStats: ModuleStats[];
}): AudioHealthAlert[] {
  const alerts: AudioHealthAlert[] = [];

  if (metrics.failureRate > 0.05) {
    alerts.push({
      code: "system_failing",
      message: "System failure rate exceeded 5%",
      severity: "critical",
      emoji: "🔴",
      value: metrics.failureRate,
      threshold: 0.05,
    });
  }

  for (const route of metrics.apiHealth.routes) {
    if (route.total >= 5 && route.errorRate > 0.05) {
      alerts.push({
        code: `api_degraded_${route.route}`,
        message: `API degraded: ${route.label}`,
        severity: "critical",
        emoji: "🔴",
        value: route.errorRate,
        threshold: 0.05,
      });
    }
    if (route.total >= 5 && route.avgLatencyMs > 1500) {
      alerts.push({
        code: `api_latency_${route.route}`,
        message: `${route.label} latency too high`,
        severity: "warning",
        emoji: "🟡",
        value: route.avgLatencyMs,
        threshold: 1500,
      });
    }
  }

  const streaming = metrics.layerHealth.find((l) => l.layer === "streaming");
  if (streaming && streaming.total >= 8 && streaming.failurePct > 0.15) {
    alerts.push({
      code: "streaming_unstable",
      message: "Streaming layer unstable",
      severity: "warning",
      emoji: "🟡",
      value: streaming.failurePct,
      threshold: 0.15,
    });
  }

  if (metrics.avgTTFA > TTFA_P95_SLO_MS) {
    alerts.push({
      code: "ttfa_avg_high",
      message: "TTFA average too high",
      severity: "warning",
      emoji: "🟡",
      value: metrics.avgTTFA,
      threshold: TTFA_P95_SLO_MS,
    });
  }

  if (metrics.ttfaP95 > TTFA_P95_SLO_MS) {
    alerts.push({
      code: "ttfa_p95_slo_breach",
      message: "TTFA p95 SLO breach",
      severity: "warning",
      emoji: "🟡",
      value: metrics.ttfaP95,
      threshold: TTFA_P95_SLO_MS,
    });
  }

  for (const mod of metrics.perModuleStats) {
    if (mod.total < 10) continue;
    const modFailRate = mod.failure / mod.total;
    if (modFailRate > 0.08) {
      alerts.push({
        code: `module_failure_${mod.module}`,
        message: `High failure in ${mod.label}`,
        severity: modFailRate > 0.15 ? "critical" : "warning",
        emoji: modFailRate > 0.15 ? "🔴" : "🟡",
        value: modFailRate,
        threshold: 0.08,
      });
    }
  }

  if (metrics.fallbackRate > 0.2) {
    alerts.push({
      code: "fallback_rate_high",
      message: "Fallback rate exceeded 20%",
      severity: "warning",
      emoji: "🟡",
      value: metrics.fallbackRate,
      threshold: 0.2,
    });
  }

  return alerts;
}

function buildTrends24h(now: number): TrendHourBucket[] {
  const buckets: TrendHourBucket[] = [];
  for (let i = 23; i >= 0; i -= 1) {
    const ts = now - i * 60 * 60 * 1000;
    const key = hourKey(ts);
    const bucket = hourBuckets.get(key) ?? { success: 0, failure: 0, total: 0 };
    buckets.push({
      hour: key,
      successRate: bucket.total > 0 ? bucket.success / bucket.total : 1,
      failureRate: bucket.total > 0 ? bucket.failure / bucket.total : 0,
      total: bucket.total,
    });
  }
  return buckets;
}

function formatSessionFlow(flow: SessionFlow): SessionFlow {
  return {
    ...flow,
    steps: flow.steps.slice(-12),
  };
}

export function getAdminDashboard(now = Date.now()): AdminDashboard {
  prune(now);
  const cutoff = now - WINDOW_MS;
  const windowEvents = eventLog.filter((e) => e.at >= cutoff);

  const completions = windowEvents.filter(
    (e) => e.event === "audio_success" || e.event === "audio_failure",
  );
  const successes = completions.filter((e) => e.event === "audio_success" || e.success === true);
  const failures = completions.filter((e) => e.event === "audio_failure" || e.success === false);
  const fallbacks = windowEvents.filter(
    (e) => e.event === "audio_fallback" || e.fallbackUsed === true,
  );

  const ttfaSamples = windowEvents
    .filter((e) => e.ttfaMs != null && e.ttfaMs > 0)
    .map((e) => e.ttfaMs!);
  const bufferingSamples = windowEvents.map((e) => e.bufferingEvents ?? 0);

  const totalRequests = Math.max(completions.length, windowEvents.length);
  const successRate = totalRequests > 0 ? successes.length / totalRequests : 1;
  const failureRate = totalRequests > 0 ? failures.length / totalRequests : 0;
  const fallbackRate = totalRequests > 0 ? fallbacks.length / totalRequests : 0;
  const ttfaStats = computePercentiles(ttfaSamples);
  const avgTTFA = ttfaStats.avg;
  const avgBuffering = avg(bufferingSamples);
  const ttfaSlo: TtfaSloMetrics = {
    p50: ttfaStats.p50,
    p95: ttfaStats.p95,
    p99: ttfaStats.p99,
    avg: ttfaStats.avg,
    sampleCount: ttfaStats.count,
    p95TargetMs: TTFA_P95_SLO_MS,
    p95Met: ttfaStats.count === 0 || ttfaStats.p95 <= TTFA_P95_SLO_MS,
  };

  const perModuleStats: ModuleStats[] = MODULES.map((module) => {
    const rows = windowEvents.filter((e) => e.module === module);
    const moduleCompletions = rows.filter(
      (e) => e.event === "audio_success" || e.event === "audio_failure",
    );
    const moduleSuccess = moduleCompletions.filter((e) => e.event === "audio_success").length;
    const moduleFailure = moduleCompletions.filter((e) => e.event === "audio_failure").length;
    const moduleFallback = rows.filter((e) => e.fallbackUsed || e.event === "audio_fallback").length;
    const moduleTtfa = rows.filter((e) => e.ttfaMs).map((e) => e.ttfaMs!);
    return {
      module,
      label: MODULE_LABELS[module],
      total: moduleCompletions.length,
      success: moduleSuccess,
      failure: moduleFailure,
      fallback: moduleFallback,
      avgTtfaMs: avg(moduleTtfa),
    };
  });

  const totalLayerEvents = windowEvents.filter((e) => e.layer).length || 1;
  const layerHealth: LayerHealthRow[] = LAYERS.map((layer) => {
    const rows = windowEvents.filter((e) => e.layer === layer);
    const layerSuccess = rows.filter((e) => e.event === "audio_success" || e.success).length;
    const layerFailure = rows.filter((e) => e.event === "audio_failure").length;
    const layerTotal = rows.length;
    const layerTtfa = rows.filter((e) => e.ttfaMs).map((e) => e.ttfaMs!);
    return {
      layer,
      total: layerTotal,
      success: layerSuccess,
      failure: layerFailure,
      successPct: layerTotal > 0 ? layerSuccess / layerTotal : 0,
      failurePct: layerTotal > 0 ? layerFailure / layerTotal : 0,
      usagePct: layerTotal / totalLayerEvents,
      avgTtfaMs: avg(layerTtfa),
    };
  });

  const deviceNetworkMap = new Map<string, { failures: number; total: number }>();
  for (const e of windowEvents) {
    const key = `${e.device}|${e.network}`;
    const row = deviceNetworkMap.get(key) ?? { failures: 0, total: 0 };
    row.total += 1;
    if (e.event === "audio_failure") row.failures += 1;
    deviceNetworkMap.set(key, row);
  }

  const deviceNetworkHeatmap: DeviceNetworkHeatmapRow[] = Array.from(
    deviceNetworkMap.entries(),
  ).map(([key, stats]) => {
    const [device, network] = key.split("|");
    return {
      device: device!,
      network: network!,
      total: stats.total,
      failures: stats.failures,
      failPct: stats.total > 0 ? stats.failures / stats.total : 0,
    };
  });

  const apiHealth = getApiHealthSnapshot(now);
  const cacheHealth = buildCacheHealth(windowEvents);

  const metrics = {
    failureRate,
    fallbackRate,
    avgTTFA,
    layerHealth,
    apiHealth,
    perModuleStats,
  };

  const sessionFlows = [...sessionMap.values()]
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, MAX_SESSIONS)
    .map(formatSessionFlow);

  return {
    windowMs: WINDOW_MS,
    generatedAt: now,
    totalRequests,
    successRate,
    fallbackRate,
    failureRate,
    avgTTFA,
    avgBuffering,
    status: resolveStatus(failureRate),
    perModuleStats,
    layerHealth,
    cacheHealth,
    apiHealth,
    errorFeed: errorFeed.slice(0, 50),
    sessionFlows,
    deviceNetworkHeatmap,
    trends24h: buildTrends24h(now),
    alerts: buildAlerts({ ...metrics, ttfaP95: ttfaSlo.p95 }),
    ops: getAdminOpsState(),
    ttfaP50: ttfaSlo.p50,
    ttfaP95: ttfaSlo.p95,
    ttfaP99: ttfaSlo.p99,
    ttfaSlo,
  };
}

/** TTFA SLO snapshot for admin monitoring and alerting. */
export function getAudioSloSnapshot(now = Date.now()): AudioSloSnapshot {
  const dash = getAdminDashboard(now);
  const byModule = {} as AudioSloSnapshot["byModule"];
  for (const mod of MODULES) {
    const cutoff = now - WINDOW_MS;
    const moduleTtfa = eventLog
      .filter((e) => e.at >= cutoff && e.module === mod && e.ttfaMs && e.ttfaMs > 0)
      .map((e) => e.ttfaMs!);
    const stats = computePercentiles(moduleTtfa);
    byModule[mod] = {
      p50: stats.p50,
      p95: stats.p95,
      sampleCount: stats.count,
    };
  }
  return {
    windowMs: dash.windowMs,
    generatedAt: dash.generatedAt,
    ttfa: dash.ttfaSlo,
    byModule,
  };
}

/** Back-compat alias for existing /api/admin/audio-health consumers. */
export function getAudioHealthDashboard(now = Date.now()): AdminDashboard {
  return getAdminDashboard(now);
}

/** Test-only reset. */
export function resetAudioHealthStoreForTests(): void {
  eventLog.length = 0;
  errorFeed.length = 0;
  sessionMap.clear();
  hourBuckets.clear();
}
