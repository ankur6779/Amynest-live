/**
 * Self-learning TTS pipeline intelligence — persistent stats, scoring, transitions.
 * IndexedDB on web/Capacitor; in-memory mirror for sync pipeline reads.
 */

import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";
import type { SpeakOptions } from "@/hooks/use-amy-voice";
import {
  isAndroidLiteClient,
  isLowMemoryIosClient,
} from "@/lib/device-lite";
import {
  getMergedTransitionProbability,
  getServerLayerScore,
  isApiGloballyDegraded,
  mergeHybridScore,
  refreshServerTtsStrategy,
} from "@/lib/amy-voice-pipeline-server-sync";
import {
  buildRlContextKey,
  computeRlReward,
  hydrateRlStore,
  selectLayersWithRl,
  type RlTelemetryPayload,
} from "@/lib/amy-voice-rl-learning";
import { isStreamingLayerPenalized } from "@/lib/amy-voice-stream-player";

export type PipelineStrategy = "dynamic_first" | "static_first" | "hybrid";

export const LEARNING_TTL_MS = 24 * 60 * 60 * 1000;
export const LEARNING_DECAY_HALF_LIFE_MS = 12 * 60 * 60 * 1000;
export const LATENCY_EMA_ALPHA = 0.2;
export const TRANSITION_PREFETCH_THRESHOLD = 0.6;
export const EXPLORATION_EPSILON = 0.1;

export type LearnableLayer = "static" | "cache" | "api" | "elevenlabs";
export type DeviceClass = "low" | "mid" | "high";
export type NetworkProfile = "fast" | "slow";

export type LayerStat = {
  success: number;
  fail: number;
  avgLatency: number;
  lastUsedAt?: number;
};

export type LayerStatsMap = Record<LearnableLayer, LayerStat>;

export type LayerScoringContext = {
  textLength: number;
  shortText: boolean;
  lessonMode: boolean;
  phonics: boolean;
  catalogPlayback: boolean;
  deviceClass: DeviceClass;
  networkProfile: NetworkProfile;
  module: "lesson" | "phonics" | "catalog" | "default";
};

export type PhraseLearningRecord = {
  cacheKey: string;
  scopeKey: string;
  layerStats: LayerStatsMap;
  lastUpdatedAt: number;
};

export type GlobalLearningRecord = {
  scopeKey: string;
  layerStats: LayerStatsMap;
  lastUpdatedAt: number;
};

export type TransitionRecord = {
  fromKey: string;
  transitions: Record<string, number>;
  lastUpdatedAt: number;
};

const DB_NAME = "amynest_tts_learning";
const DB_VERSION = 1;
const PHRASE_STORE = "phrase";
const GLOBAL_STORE = "global";
const TRANSITION_STORE = "transitions";

export const LEARNABLE_LAYERS: LearnableLayer[] = [
  "static",
  "cache",
  "api",
  "elevenlabs",
];

const DEFAULT_LAYER_STAT = (): LayerStat => ({
  success: 0,
  fail: 0,
  avgLatency: 0,
});

export function emptyLayerStatsMap(): LayerStatsMap {
  return {
    static: DEFAULT_LAYER_STAT(),
    cache: DEFAULT_LAYER_STAT(),
    api: DEFAULT_LAYER_STAT(),
    elevenlabs: DEFAULT_LAYER_STAT(),
  };
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const phraseMirror = new Map<string, PhraseLearningRecord>();
const globalMirror = new Map<string, GlobalLearningRecord>();
const transitionMirror = new Map<string, TransitionRecord>();
const recentFailRing = new Map<string, number[]>();
let hydrated = false;

function openLearningDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => resolve(null);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(PHRASE_STORE)) {
            db.createObjectStore(PHRASE_STORE, { keyPath: "scopeKey" });
          }
          if (!db.objectStoreNames.contains(GLOBAL_STORE)) {
            db.createObjectStore(GLOBAL_STORE, { keyPath: "scopeKey" });
          }
          if (!db.objectStoreNames.contains(TRANSITION_STORE)) {
            db.createObjectStore(TRANSITION_STORE, { keyPath: "fromKey" });
          }
        };
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openLearningDb();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbPut(store: string, value: unknown): Promise<void> {
  const db = await openLearningDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* best-effort persistence */
  }
}

export function isSlowNetworkProfile(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return (
    conn.effectiveType === "slow-2g" ||
    conn.effectiveType === "2g" ||
    conn.effectiveType === "3g"
  );
}

export function getNetworkProfile(): NetworkProfile {
  return isSlowNetworkProfile() ? "slow" : "fast";
}

export function getDeviceClass(): DeviceClass {
  if (typeof navigator === "undefined") return "high";
  if (isLowMemoryIosClient() || isAndroidLiteClient()) return "low";
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof dm === "number") {
    if (dm <= 4) return "low";
    if (dm <= 8) return "mid";
  }
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores <= 4) return "mid";
  return "high";
}

function scopeKey(network: NetworkProfile, device: DeviceClass, cacheKey?: string): string {
  const base = `${network}:${device}`;
  return cacheKey ? `${base}:${cacheKey}` : base;
}

function applyDecayToStat(stat: LayerStat, recordAgeMs: number): LayerStat {
  if (recordAgeMs > LEARNING_TTL_MS) return DEFAULT_LAYER_STAT();
  const factor = Math.pow(0.5, recordAgeMs / LEARNING_DECAY_HALF_LIFE_MS);
  return {
    success: stat.success * factor,
    fail: stat.fail * factor,
    avgLatency: stat.avgLatency,
    lastUsedAt: stat.lastUsedAt,
  };
}

function decayLayerStatsMap(stats: LayerStatsMap, recordAgeMs: number): LayerStatsMap {
  const out = emptyLayerStatsMap();
  for (const layer of LEARNABLE_LAYERS) {
    out[layer] = applyDecayToStat(stats[layer], recordAgeMs);
  }
  return out;
}

function mergeLayerStat(local: LayerStat, global: LayerStat): LayerStat {
  const success = local.success + global.success * 0.35;
  const fail = local.fail + global.fail * 0.35;
  const localWeight = local.success + local.fail;
  const globalWeight = (global.success + global.fail) * 0.35;
  const totalWeight = localWeight + globalWeight;
  const avgLatency =
    totalWeight > 0
      ? (local.avgLatency * localWeight + global.avgLatency * globalWeight) / totalWeight
      : global.avgLatency || local.avgLatency;
  const lastUsedAt = Math.max(local.lastUsedAt ?? 0, global.lastUsedAt ?? 0) || undefined;
  return { success, fail, avgLatency, lastUsedAt };
}

export function buildScoringContext(
  text: string,
  policy: AmySpeechPolicy,
  opts?: SpeakOptions,
): LayerScoringContext {
  const module: LayerScoringContext["module"] = opts?.lessonParagraph
    ? "lesson"
    : opts?.catalogPlayback
      ? "catalog"
      : policy.pipelineMode === "phonics" || policy.forcePhonicsOnly
        ? "phonics"
        : "default";

  return {
    textLength: text.length,
    shortText: text.length <= 80,
    lessonMode: Boolean(opts?.lessonParagraph),
    phonics: policy.pipelineMode === "phonics" || policy.forcePhonicsOnly,
    catalogPlayback: Boolean(opts?.catalogPlayback),
    deviceClass: getDeviceClass(),
    networkProfile: getNetworkProfile(),
    module,
  };
}

export function computeLayerScore(
  stat: LayerStat,
  layer: LearnableLayer,
  context: LayerScoringContext,
): number {
  const total = stat.success + stat.fail;
  const successRate = total > 0 ? stat.success / total : 0.5;

  const refLatency = context.networkProfile === "slow" ? 4000 : 2500;
  const latencyScore =
    stat.avgLatency > 0 ? 1 - Math.min(1, stat.avgLatency / refLatency) : 0.5;

  const ageMs = stat.lastUsedAt ? Date.now() - stat.lastUsedAt : Number.POSITIVE_INFINITY;
  const recencyWeight =
    Number.isFinite(ageMs) && stat.lastUsedAt
      ? Math.exp(-ageMs / (6 * 60 * 60 * 1000))
      : 0;

  let successW = 0.5;
  let latencyW = 0.3;
  let recencyW = 0.2;

  if (context.lessonMode) {
    successW = 0.65;
    latencyW = 0.2;
    recencyW = 0.15;
  }

  let score = successRate * successW + latencyScore * latencyW + recencyWeight * recencyW;

  if (context.shortText && (layer === "static" || layer === "cache")) {
    score += 0.12;
  }
  if (context.phonics && layer === "static") {
    score += 0.15;
  }
  if (context.networkProfile === "slow" && (layer === "api" || layer === "elevenlabs")) {
    score -= 0.25;
  }
  if (context.deviceClass === "low" && (layer === "api" || layer === "elevenlabs")) {
    score -= 0.15;
  }
  if (context.deviceClass === "high" && layer === "cache") {
    score += 0.05;
  }

  return Math.max(0, Math.min(1.5, score));
}

function getMergedStatsForKey(
  cacheKey: string,
  network: NetworkProfile,
  device: DeviceClass,
): LayerStatsMap {
  const phraseKey = scopeKey(network, device, cacheKey);
  const globalKey = scopeKey(network, device);
  const now = Date.now();

  const phrase = phraseMirror.get(phraseKey);
  const global = globalMirror.get(globalKey);

  const phraseStats = phrase
    ? decayLayerStatsMap(phrase.layerStats, now - phrase.lastUpdatedAt)
    : emptyLayerStatsMap();
  const globalStats = global
    ? decayLayerStatsMap(global.layerStats, now - global.lastUpdatedAt)
    : emptyLayerStatsMap();

  const merged = emptyLayerStatsMap();
  for (const layer of LEARNABLE_LAYERS) {
    merged[layer] = mergeLayerStat(phraseStats[layer], globalStats[layer]);
  }
  return merged;
}

function hasClientLayerData(stat: LayerStat): boolean {
  return stat.success + stat.fail > 0.05;
}

function applyExploration(ranked: LearnableLayer[]): {
  layers: LearnableLayer[];
  exploring: boolean;
} {
  if (ranked.length < 2 || Math.random() >= EXPLORATION_EPSILON) {
    return { layers: ranked, exploring: false };
  }
  const pick = 1 + Math.floor(Math.random() * Math.min(2, ranked.length - 1));
  const candidate = ranked[pick]!;
  return {
    layers: [candidate, ...ranked.filter((l) => l !== candidate)],
    exploring: true,
  };
}

function bootstrapScores(
  stats: LayerStatsMap,
  context: LayerScoringContext,
): Record<LearnableLayer, number> {
  const out = {} as Record<LearnableLayer, number>;
  for (const layer of LEARNABLE_LAYERS) {
    const clientScore = computeLayerScore(stats[layer], layer, context);
    const serverScore = getServerLayerScore(layer, context);
    out[layer] = mergeHybridScore(clientScore, serverScore, hasClientLayerData(stats[layer]));
  }
  return out;
}

export function getRankedLearnableLayers(
  cacheKey: string,
  context: LayerScoringContext,
): LearnableLayer[] {
  void refreshServerTtsStrategy(context);

  const stats = getMergedStatsForKey(cacheKey, context.networkProfile, context.deviceClass);
  const penalized = new Set<string>();

  for (const layer of LEARNABLE_LAYERS) {
    if (isLayerScorePenalized(layer, cacheKey)) penalized.add(layer);
  }
  if (isApiGloballyDegraded()) {
    penalized.add("api");
  }
  if (isStreamingLayerPenalized(cacheKey)) {
    penalized.add("api");
  }

  const bootstrap = bootstrapScores(stats, context);
  const streamingBoost = context.networkProfile === "fast" && !context.phonics;
  const rl = selectLayersWithRl(context, penalized, bootstrap, streamingBoost);
  return rl.layers.length > 0 ? rl.layers : [...LEARNABLE_LAYERS];
}

export function buildRlTelemetryPayload(
  context: LayerScoringContext,
  chosenLayer: LearnableLayer,
  success: boolean,
  ttfaMs: number,
  latencyMs: number,
  bufferingEvents: number,
  exploration = false,
  streaming = false,
): RlTelemetryPayload {
  return {
    context,
    chosenLayer,
    success,
    ttfaMs,
    bufferingEvents,
    exploration,
    streaming,
    reward: computeRlReward(success, latencyMs, ttfaMs, bufferingEvents),
  };
}

export function getRlContextKey(context: LayerScoringContext): string {
  return buildRlContextKey(context);
}

export function isExplorationSelection(): boolean {
  return Math.random() < EXPLORATION_EPSILON;
}

export function resolveStrategyFromLayers(
  ranked: LearnableLayer[],
  context: LayerScoringContext,
): PipelineStrategy {
  if (context.catalogPlayback) return "static_first";
  if (context.textLength > 120) return "dynamic_first";

  const top = ranked[0];
  const second = ranked[1];
  if (top === "static" || top === "cache") {
    if (second === "static" || second === "cache") return "static_first";
  }
  if (top === "api" || top === "elevenlabs") return "dynamic_first";
  if (context.lessonMode) return "dynamic_first";
  if (context.networkProfile === "slow") return "static_first";
  return "hybrid";
}

export function resolveAdaptivePipelineBudget(
  cacheKey: string,
  context: LayerScoringContext,
  baseMs: number,
): number {
  const stats = getMergedStatsForKey(cacheKey, context.networkProfile, context.deviceClass);
  let successLatencies = 0;
  let successWeight = 0;
  let failWeight = 0;

  for (const layer of LEARNABLE_LAYERS) {
    const s = stats[layer];
    successWeight += s.success;
    failWeight += s.fail;
    if (s.avgLatency > 0 && s.success > 0) {
      successLatencies += s.avgLatency * s.success;
    }
  }

  const avgLatency = successWeight > 0 ? successLatencies / successWeight : baseMs * 0.4;
  const failRate = successWeight + failWeight > 0 ? failWeight / (successWeight + failWeight) : 0;

  let budget = baseMs;
  if (avgLatency < 450 && failRate < 0.2) budget *= 0.85;
  else if (failRate > 0.45) budget *= 1.12;

  if (context.deviceClass === "low") budget *= 0.92;
  if (context.deviceClass === "high") budget *= 1.03;

  return Math.round(Math.max(1800, Math.min(3200, budget)));
}

export function isLayerScorePenalized(layer: string, cacheKey?: string): boolean {
  const key = cacheKey ? `${cacheKey}:${layer}` : layer;
  const ring = recentFailRing.get(key);
  if (!ring) return false;
  const cutoff = Date.now() - 10_000;
  const recent = ring.filter((t) => t > cutoff);
  recentFailRing.set(key, recent);
  return recent.length >= 3;
}

function trackRecentFail(layer: string, cacheKey?: string): void {
  const key = cacheKey ? `${cacheKey}:${layer}` : layer;
  const ring = recentFailRing.get(key) ?? [];
  ring.push(Date.now());
  recentFailRing.set(key, ring.slice(-8));
}

function updateStat(stat: LayerStat, success: boolean, latencyMs: number): LayerStat {
  const now = Date.now();
  if (success) {
    const avgLatency =
      stat.avgLatency > 0
        ? stat.avgLatency * (1 - LATENCY_EMA_ALPHA) + latencyMs * LATENCY_EMA_ALPHA
        : latencyMs;
    return {
      success: stat.success + 1,
      fail: stat.fail,
      avgLatency,
      lastUsedAt: now,
    };
  }
  return {
    success: stat.success,
    fail: stat.fail + 1,
    avgLatency: stat.avgLatency,
    lastUsedAt: now,
  };
}

function applyOutcomeToRecord(
  record: PhraseLearningRecord | GlobalLearningRecord,
  layer: LearnableLayer,
  success: boolean,
  latencyMs: number,
): void {
  const age = Date.now() - record.lastUpdatedAt;
  record.layerStats = decayLayerStatsMap(record.layerStats, age);
  record.layerStats[layer] = updateStat(record.layerStats[layer], success, latencyMs);
  record.lastUpdatedAt = Date.now();
}

export function recordLayerOutcome(
  cacheKey: string,
  layer: string,
  success: boolean,
  latencyMs: number,
  scope?: Pick<LayerScoringContext, "networkProfile" | "deviceClass">,
): void {
  if (!LEARNABLE_LAYERS.includes(layer as LearnableLayer)) return;
  const learnable = layer as LearnableLayer;
  const network = scope?.networkProfile ?? getNetworkProfile();
  const device = scope?.deviceClass ?? getDeviceClass();
  const phraseKey = scopeKey(network, device, cacheKey);
  const globalKey = scopeKey(network, device);

  if (!success) trackRecentFail(learnable, cacheKey);

  let phrase = phraseMirror.get(phraseKey);
  if (!phrase) {
    phrase = {
      cacheKey,
      scopeKey: phraseKey,
      layerStats: emptyLayerStatsMap(),
      lastUpdatedAt: Date.now(),
    };
    phraseMirror.set(phraseKey, phrase);
  }
  applyOutcomeToRecord(phrase, learnable, success, latencyMs);
  void idbPut(PHRASE_STORE, phrase);

  let global = globalMirror.get(globalKey);
  if (!global) {
    global = {
      scopeKey: globalKey,
      layerStats: emptyLayerStatsMap(),
      lastUpdatedAt: Date.now(),
    };
    globalMirror.set(globalKey, global);
  }
  applyOutcomeToRecord(global, learnable, success, latencyMs);
  void idbPut(GLOBAL_STORE, global);
}

export function getBestLearnableLayer(
  cacheKey: string,
  context: LayerScoringContext,
): LearnableLayer | null {
  const ranked = getRankedLearnableLayers(cacheKey, context);
  return ranked[0] ?? null;
}

export function recordPhraseTransition(fromKey: string, toKey: string): void {
  if (!fromKey || !toKey || fromKey === toKey) return;
  let record = transitionMirror.get(fromKey);
  if (!record) {
    record = { fromKey, transitions: {}, lastUpdatedAt: Date.now() };
    transitionMirror.set(fromKey, record);
  }
  record.transitions[toKey] = (record.transitions[toKey] ?? 0) + 1;
  record.lastUpdatedAt = Date.now();
  void idbPut(TRANSITION_STORE, record);
}

export function getPredictedNextKey(
  fromKey: string,
  threshold = TRANSITION_PREFETCH_THRESHOLD,
): string | null {
  const record = transitionMirror.get(fromKey);
  const entries = Object.entries(record?.transitions ?? {});
  const localTotal = entries.reduce((sum, [, n]) => sum + n, 0);

  let bestKey: string | null = null;
  let bestProb = 0;

  const candidates = new Set<string>(entries.map(([k]) => k));
  for (const toKey of candidates) {
    const localCount = record?.transitions[toKey] ?? 0;
    const prob = getMergedTransitionProbability(fromKey, toKey, localCount, localTotal);
    if (prob > bestProb) {
      bestProb = prob;
      bestKey = toKey;
    }
  }

  if (bestKey && bestProb >= threshold) return bestKey;

  if (entries.length > 0 && localTotal > 0) {
    const [fallbackKey, fallbackCount] = entries.sort((a, b) => b[1] - a[1])[0]!;
    if (fallbackCount / localTotal >= threshold) return fallbackKey;
  }

  return null;
}

export async function hydratePipelineLearningStore(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const db = await openLearningDb();
  if (!db) return;

  try {
    const phraseRows = await new Promise<PhraseLearningRecord[]>((resolve, reject) => {
      const tx = db.transaction(PHRASE_STORE, "readonly");
      const req = tx.objectStore(PHRASE_STORE).getAll();
      req.onsuccess = () => resolve((req.result as PhraseLearningRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const row of phraseRows) {
      if (Date.now() - row.lastUpdatedAt <= LEARNING_TTL_MS) {
        phraseMirror.set(row.scopeKey, row);
      }
    }

    const globalRows = await new Promise<GlobalLearningRecord[]>((resolve, reject) => {
      const tx = db.transaction(GLOBAL_STORE, "readonly");
      const req = tx.objectStore(GLOBAL_STORE).getAll();
      req.onsuccess = () => resolve((req.result as GlobalLearningRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const row of globalRows) {
      if (Date.now() - row.lastUpdatedAt <= LEARNING_TTL_MS) {
        globalMirror.set(row.scopeKey, row);
      }
    }

    const transitionRows = await new Promise<TransitionRecord[]>((resolve, reject) => {
      const tx = db.transaction(TRANSITION_STORE, "readonly");
      const req = tx.objectStore(TRANSITION_STORE).getAll();
      req.onsuccess = () => resolve((req.result as TransitionRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const row of transitionRows) {
      if (Date.now() - row.lastUpdatedAt <= LEARNING_TTL_MS) {
        transitionMirror.set(row.fromKey, row);
      }
    }
  } catch {
    /* learning store is best-effort */
  }
}

export function initPipelineLearning(): void {
  void hydratePipelineLearningStore();
  void hydrateRlStore();
}

/** Test-only reset */
export function _resetPipelineLearningForTests(): void {
  phraseMirror.clear();
  globalMirror.clear();
  transitionMirror.clear();
  recentFailRing.clear();
  hydrated = false;
  dbPromise = null;
}
