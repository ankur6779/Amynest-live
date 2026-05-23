/**
 * Global TTS pipeline intelligence — cross-user aggregation (24h rolling window).
 * Privacy: accepts hashed cacheKey only; no raw text stored.
 */

import { logger } from "../lib/logger.js";

export const LEARNABLE_LAYERS = ["static", "cache", "api", "elevenlabs"] as const;
export type LearnableLayer = (typeof LEARNABLE_LAYERS)[number];

export type TtsTelemetryEvent = {
  cacheKeyHash: string;
  layer: LearnableLayer;
  success: boolean;
  latency: number;
  deviceClass: "low" | "mid" | "high" | string;
  networkType: "fast" | "slow" | string;
  textLength: number;
  module?: "lesson" | "phonics" | "catalog" | "default" | string;
  exploration?: boolean;
  fromKeyHash?: string;
  toKeyHash?: string;
};

type StoredEvent = TtsTelemetryEvent & { at: number };

export type LayerAggregate = {
  successRate: number;
  avgLatency: number;
  sampleCount: number;
};

export type TtsStrategyResponse = {
  preferredLayers: LearnableLayer[];
  penalties: Partial<Record<LearnableLayer, number>>;
  boosts: Partial<Record<LearnableLayer, number>>;
  apiDegraded: boolean;
  popularCacheKeys: string[];
  transitions: Record<string, Record<string, number>>;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 40_000;
const LATENCY_OUTLIER_CAP_MS = 12_000;
const API_DEGRADED_MIN_SAMPLES = 12;
const API_DEGRADED_FAIL_RATE = 0.42;
const API_DEGRADED_WINDOW_MS = 15 * 60 * 1000;

const eventLog: StoredEvent[] = [];
const transitionCounts = new Map<string, Map<string, number>>();
const cacheKeyPopularity = new Map<string, number>();

function isLearnableLayer(layer: string): layer is LearnableLayer {
  return (LEARNABLE_LAYERS as readonly string[]).includes(layer);
}

function pruneOldEvents(now = Date.now()): void {
  const cutoff = now - WINDOW_MS;
  while (eventLog.length > 0 && eventLog[0]!.at < cutoff) {
    eventLog.shift();
  }
  if (eventLog.length > MAX_EVENTS) {
    eventLog.splice(0, eventLog.length - MAX_EVENTS);
  }
}

function filterLatency(latency: number): number {
  if (!Number.isFinite(latency) || latency < 0) return 0;
  return Math.min(latency, LATENCY_OUTLIER_CAP_MS);
}

function aggregateLayerStats(
  events: StoredEvent[],
  layer: LearnableLayer,
): LayerAggregate {
  const layerEvents = events.filter((e) => e.layer === layer);
  if (layerEvents.length === 0) {
    return { successRate: 0.5, avgLatency: 0, sampleCount: 0 };
  }

  let success = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const e of layerEvents) {
    if (e.success) success += 1;
    if (e.success && e.latency > 0) {
      latencySum += filterLatency(e.latency);
      latencyCount += 1;
    }
  }

  return {
    successRate: success / layerEvents.length,
    avgLatency: latencyCount > 0 ? latencySum / latencyCount : 0,
    sampleCount: layerEvents.length,
  };
}

function segmentKey(event: StoredEvent): string[] {
  const keys: string[] = [];
  if (event.networkType === "slow") keys.push("slow-network");
  if (event.deviceClass === "low") keys.push("low-end-device");
  if (event.textLength <= 80) keys.push("short-text");
  if (event.module === "lesson") keys.push("lesson-mode");
  if (event.module === "phonics") keys.push("phonics-mode");
  return keys;
}

function scoreLayer(agg: LayerAggregate, layer: LearnableLayer): number {
  if (agg.sampleCount === 0) return 0.5;
  const latencyRef = layer === "static" || layer === "cache" ? 800 : 2500;
  const latencyScore =
    agg.avgLatency > 0 ? 1 - Math.min(1, agg.avgLatency / latencyRef) : 0.5;
  return agg.successRate * 0.55 + latencyScore * 0.45;
}

function detectApiDegraded(now = Date.now()): boolean {
  const cutoff = now - API_DEGRADED_WINDOW_MS;
  const recent = eventLog.filter((e) => e.at >= cutoff && e.layer === "api");
  if (recent.length < API_DEGRADED_MIN_SAMPLES) return false;
  const fails = recent.filter((e) => !e.success).length;
  return fails / recent.length >= API_DEGRADED_FAIL_RATE;
}

function buildSegmentAdjustments(
  events: StoredEvent[],
): { penalties: Partial<Record<LearnableLayer, number>>; boosts: Partial<Record<LearnableLayer, number>> } {
  const penalties: Partial<Record<LearnableLayer, number>> = {};
  const boosts: Partial<Record<LearnableLayer, number>> = {};

  const slowEvents = events.filter((e) => e.networkType === "slow");
  if (slowEvents.length >= 8) {
    const apiAgg = aggregateLayerStats(slowEvents, "api");
    if (apiAgg.sampleCount >= 5 && apiAgg.avgLatency > 2200) {
      penalties.api = 0.25;
      boosts.static = 0.12;
      boosts.cache = 0.08;
    }
  }

  const shortEvents = events.filter((e) => e.textLength <= 80);
  if (shortEvents.length >= 8) {
    const staticAgg = aggregateLayerStats(shortEvents, "static");
    const apiAgg = aggregateLayerStats(shortEvents, "api");
    if (staticAgg.successRate > apiAgg.successRate + 0.1) {
      boosts.static = (boosts.static ?? 0) + 0.1;
      boosts.cache = (boosts.cache ?? 0) + 0.06;
    }
  }

  return { penalties, boosts };
}

export function ingestTtsTelemetry(events: TtsTelemetryEvent[]): { accepted: number } {
  const now = Date.now();
  let accepted = 0;

  for (const raw of events) {
    if (!raw?.cacheKeyHash || typeof raw.cacheKeyHash !== "string") continue;
    if (!isLearnableLayer(raw.layer)) continue;
    if (typeof raw.success !== "boolean") continue;

    const event: StoredEvent = {
      cacheKeyHash: raw.cacheKeyHash.slice(0, 128),
      layer: raw.layer,
      success: raw.success,
      latency: filterLatency(raw.latency ?? 0),
      deviceClass: raw.deviceClass ?? "mid",
      networkType: raw.networkType ?? "fast",
      textLength: Math.max(0, Math.min(2000, raw.textLength ?? 0)),
      module: raw.module,
      exploration: raw.exploration,
      fromKeyHash: raw.fromKeyHash?.slice(0, 128),
      toKeyHash: raw.toKeyHash?.slice(0, 128),
      at: now,
    };

    eventLog.push(event);
    accepted += 1;

    cacheKeyPopularity.set(
      event.cacheKeyHash,
      (cacheKeyPopularity.get(event.cacheKeyHash) ?? 0) + 1,
    );

    if (event.fromKeyHash && event.toKeyHash && event.fromKeyHash !== event.toKeyHash) {
      let bucket = transitionCounts.get(event.fromKeyHash);
      if (!bucket) {
        bucket = new Map();
        transitionCounts.set(event.fromKeyHash, bucket);
      }
      bucket.set(event.toKeyHash, (bucket.get(event.toKeyHash) ?? 0) + 1);
    }
  }

  pruneOldEvents(now);

  if (accepted > 0) {
    logger.debug(
      { evt: "tts.telemetry.ingest", accepted, total: eventLog.length },
      "TTS telemetry batch ingested",
    );
  }

  return { accepted };
}

export type TtsStrategyQuery = {
  deviceClass?: string;
  networkType?: string;
  textLength?: number;
  module?: string;
};

export function resolveTtsStrategy(query: TtsStrategyQuery = {}): TtsStrategyResponse {
  pruneOldEvents();
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let pool = eventLog.filter((e) => e.at >= cutoff);

  if (query.networkType) {
    pool = pool.filter((e) => e.networkType === query.networkType);
  }
  if (query.deviceClass) {
    pool = pool.filter((e) => e.deviceClass === query.deviceClass);
  }
  if (query.module) {
    const modulePool = pool.filter((e) => e.module === query.module);
    if (modulePool.length >= 6) pool = modulePool;
  }
  if (typeof query.textLength === "number" && query.textLength <= 80) {
    const shortPool = pool.filter((e) => e.textLength <= 80);
    if (shortPool.length >= 6) pool = shortPool;
  }

  const layerScores = LEARNABLE_LAYERS.map((layer) => ({
    layer,
    score: scoreLayer(aggregateLayerStats(pool, layer), layer),
  })).sort((a, b) => b.score - a.score);

  const { penalties, boosts } = buildSegmentAdjustments(pool);
  const apiDegraded = detectApiDegraded(now);

  if (apiDegraded) {
    penalties.api = Math.max(penalties.api ?? 0, 0.35);
  }

  const popularCacheKeys = [...cacheKeyPopularity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key]) => key);

  const transitions: Record<string, Record<string, number>> = {};
  for (const [from, bucket] of transitionCounts.entries()) {
    const next: Record<string, number> = {};
    for (const [to, count] of bucket.entries()) {
      next[to] = count;
    }
    transitions[from] = next;
  }

  return {
    preferredLayers: layerScores.map((l) => l.layer),
    penalties,
    boosts,
    apiDegraded,
    popularCacheKeys,
    transitions,
  };
}

/** Test-only reset */
export function _resetTtsIntelligenceForTests(): void {
  eventLog.length = 0;
  transitionCounts.clear();
  cacheKeyPopularity.clear();
}
