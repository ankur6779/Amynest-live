/**
 * Hybrid TTS learning — server strategy pull + batched telemetry push.
 * Privacy: only hashed cache keys leave the device.
 */

import type { LearnableLayer, LayerScoringContext, NetworkProfile } from "@/lib/amy-voice-pipeline-learning";
import { setServerRlQ } from "@/lib/amy-voice-rl-learning";

export type ServerTtsStrategy = {
  preferredLayers: LearnableLayer[];
  penalties: Partial<Record<LearnableLayer, number>>;
  boosts: Partial<Record<LearnableLayer, number>>;
  apiDegraded: boolean;
  popularCacheKeys: string[];
  transitions: Record<string, Record<string, number>>;
  degradedMode?: boolean;
  layerWeights?: {
    static: number;
    cache: number;
    api: number;
    streaming: number;
    elevenlabs: number;
  };
  apiUsageFactor?: number;
  streamingWeightFactor?: number;
  prefetchDepth?: number;
};

export type ServerTelemetryEvent = {
  cacheKeyHash: string;
  layer: LearnableLayer;
  success: boolean;
  latency: number;
  deviceClass: string;
  networkType: NetworkProfile;
  textLength: number;
  module?: string;
  exploration?: boolean;
  fromKeyHash?: string;
  toKeyHash?: string;
};

export type ServerRlTelemetryEvent = {
  contextKey: string;
  layer: LearnableLayer;
  reward: number;
  ttfaMs: number;
  bufferingEvents: number;
  success: boolean;
  exploration?: boolean;
  streaming?: boolean;
};

const rlTelemetryQueue: ServerRlTelemetryEvent[] = [];
const FLUSH_BATCH_SIZE = 15;
const STRATEGY_REFRESH_MS = 5 * 60 * 1000;
const TELEMETRY_FLUSH_MS = 30_000;

let cachedStrategy: ServerTtsStrategy | null = null;
let strategyFetchedAt = 0;
let strategyAvailable = false;
let lastContextKey = "";
const telemetryQueue: ServerTelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_STRATEGY: ServerTtsStrategy = {
  preferredLayers: ["static", "cache", "api", "elevenlabs"],
  penalties: {},
  boosts: {},
  apiDegraded: false,
  popularCacheKeys: [],
  transitions: {},
};

export function hashCacheKeySync(cacheKey: string): string {
  let h = 2166136261;
  for (let i = 0; i < cacheKey.length; i++) {
    h ^= cacheKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${hex}${cacheKey.length.toString(16)}`;
}

export function isServerStrategyAvailable(): boolean {
  return strategyAvailable && cachedStrategy != null;
}

export function isApiGloballyDegraded(): boolean {
  return cachedStrategy?.apiDegraded ?? false;
}

export function isServerDegradedMode(): boolean {
  return cachedStrategy?.degradedMode ?? false;
}

export function getServerPrefetchDepth(): number {
  return Math.max(1, Math.min(2, cachedStrategy?.prefetchDepth ?? 1));
}

export function getServerLayerWeight(layer: LearnableLayer): number {
  const weights = cachedStrategy?.layerWeights;
  if (!weights) return 1;
  if (layer === "static") return weights.static;
  if (layer === "cache") return weights.cache;
  if (layer === "api") return weights.api;
  if (layer === "elevenlabs") return weights.elevenlabs;
  return 1;
}

export function getServerStrategy(): ServerTtsStrategy {
  return cachedStrategy ?? DEFAULT_STRATEGY;
}

export function getServerLayerScore(
  layer: LearnableLayer,
  context: LayerScoringContext,
): number {
  const strategy = getServerStrategy();
  const idx = strategy.preferredLayers.indexOf(layer);
  const rankScore = idx >= 0 ? 1 - idx * 0.18 : 0.25;
  let score = Math.max(0.1, rankScore);
  score += strategy.boosts[layer] ?? 0;
  score -= strategy.penalties[layer] ?? 0;
  score *= getServerLayerWeight(layer);

  if (strategy.apiUsageFactor != null && strategy.apiUsageFactor < 1 && layer === "api") {
    score *= strategy.apiUsageFactor;
  }

  if (context.networkProfile === "slow" && (layer === "api" || layer === "elevenlabs")) {
    score -= 0.1;
  }
  if (context.shortText && (layer === "static" || layer === "cache")) {
    score += 0.08;
  }

  return Math.max(0, Math.min(1.5, score));
}

export function mergeHybridScore(
  clientScore: number,
  serverScore: number,
  hasClientData: boolean,
): number {
  if (!strategyAvailable || !navigator.onLine) return clientScore;
  if (!hasClientData) return serverScore;
  return clientScore * 0.6 + serverScore * 0.4;
}

export function getMergedTransitionProbability(
  fromKey: string,
  toKey: string,
  localCount: number,
  localTotal: number,
): number {
  const fromHash = hashCacheKeySync(fromKey);
  const toHash = hashCacheKeySync(toKey);
  const serverBucket = getServerStrategy().transitions[fromHash];
  const serverCount = serverBucket?.[toHash] ?? 0;
  const serverTotal = serverBucket
    ? Object.values(serverBucket).reduce((a, b) => a + b, 0)
    : 0;

  const mergedCount = localCount + serverCount * 0.5;
  const mergedTotal = localTotal + serverTotal * 0.5;
  if (mergedTotal <= 0) return 0;
  return mergedCount / mergedTotal;
}

export function getPopularPrefetchHashes(): string[] {
  return getServerStrategy().popularCacheKeys.slice(0, 10);
}

function contextQueryKey(context: LayerScoringContext): string {
  return `${context.deviceClass}:${context.networkProfile}:${context.module ?? "default"}:${context.shortText ? "short" : "long"}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { getFirebaseAuth } = await import("@/lib/firebase");
    const user = getFirebaseAuth().currentUser;
    if (user) {
      const token = await user.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* unsigned telemetry is rejected — ok */
  }
  return headers;
}

export async function refreshServerTtsStrategy(
  context?: LayerScoringContext,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const key = context ? contextQueryKey(context) : "default";
  const stale = Date.now() - strategyFetchedAt > STRATEGY_REFRESH_MS;
  if (!stale && key === lastContextKey && cachedStrategy) return;

  void refreshServerRlStrategy();

  try {
    const { getApiUrl } = await import("@/lib/api");
    const params = new URLSearchParams();
    if (context?.deviceClass) params.set("deviceClass", context.deviceClass);
    if (context?.networkProfile) params.set("networkType", context.networkProfile);
    if (context?.textLength != null) params.set("textLength", String(context.textLength));
    if (context?.module) params.set("module", context.module);

    const qs = params.toString();
    const url = getApiUrl(`/api/tts/strategy${qs ? `?${qs}` : ""}`);
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) return;

    const data = (await res.json()) as ServerTtsStrategy;
    cachedStrategy = {
      preferredLayers: data.preferredLayers?.length
        ? data.preferredLayers
        : DEFAULT_STRATEGY.preferredLayers,
      penalties: data.penalties ?? {},
      boosts: data.boosts ?? {},
      apiDegraded: Boolean(data.apiDegraded),
      popularCacheKeys: data.popularCacheKeys ?? [],
      transitions: data.transitions ?? {},
    };
    strategyAvailable = true;
    strategyFetchedAt = Date.now();
    lastContextKey = key;
  } catch {
    /* offline — keep last strategy or defaults */
  }
}

export function queueServerTelemetry(event: Omit<ServerTelemetryEvent, "cacheKeyHash"> & {
  cacheKey: string;
}): void {
  const { cacheKey, ...rest } = event;
  telemetryQueue.push({
    ...rest,
    cacheKeyHash: hashCacheKeySync(cacheKey),
  });

  if (telemetryQueue.length >= FLUSH_BATCH_SIZE) {
    void flushServerTelemetry();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushServerTelemetry();
    }, TELEMETRY_FLUSH_MS);
  }
}

export async function flushServerTelemetry(): Promise<void> {
  if (telemetryQueue.length === 0 || typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const batch = telemetryQueue.splice(0, 50);
  try {
    const { getApiUrl } = await import("@/lib/api");
    await fetch(getApiUrl("/api/tts/telemetry"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    telemetryQueue.unshift(...batch);
  }
}

export function initHybridTtsLearning(): void {
  if (typeof window === "undefined") return;
  void refreshServerTtsStrategy();
  void refreshServerRlStrategy();
  setInterval(() => {
    void refreshServerTtsStrategy();
    void refreshServerRlStrategy();
    void flushServerTelemetry();
    void flushServerRlTelemetry();
  }, STRATEGY_REFRESH_MS);
}

export async function refreshServerRlStrategy(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    const { getApiUrl } = await import("@/lib/api");
    const res = await fetch(getApiUrl("/api/tts/rl-strategy"), {
      headers: await authHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { qValues?: Partial<Record<LearnableLayer, number>> };
    if (data.qValues) setServerRlQ(data.qValues);
  } catch {
    /* offline */
  }
}

export function queueServerRlTelemetry(event: ServerRlTelemetryEvent): void {
  rlTelemetryQueue.push(event);
  if (rlTelemetryQueue.length >= FLUSH_BATCH_SIZE) {
    void flushServerRlTelemetry();
  }
}

export async function flushServerRlTelemetry(): Promise<void> {
  if (rlTelemetryQueue.length === 0 || typeof window === "undefined" || !navigator.onLine) {
    return;
  }
  const batch = rlTelemetryQueue.splice(0, 50);
  try {
    const { getApiUrl } = await import("@/lib/api");
    await fetch(getApiUrl("/api/tts/rl-telemetry"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    rlTelemetryQueue.unshift(...batch);
  }
}

/** Test-only reset */
export function _resetServerSyncForTests(): void {
  cachedStrategy = null;
  strategyFetchedAt = 0;
  strategyAvailable = false;
  lastContextKey = "";
  telemetryQueue.length = 0;
  rlTelemetryQueue.length = 0;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function _setServerStrategyForTests(strategy: ServerTtsStrategy): void {
  cachedStrategy = strategy;
  strategyAvailable = true;
  strategyFetchedAt = Date.now();
}
