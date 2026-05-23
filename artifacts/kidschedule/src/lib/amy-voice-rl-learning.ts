/**
 * Reinforcement-learning layer selection — Q-table with epsilon-greedy + softmax.
 * Merges client Q (0.6) + server Q (0.4). Best-effort IndexedDB persistence.
 */

import type { LearnableLayer, LayerScoringContext } from "@/lib/amy-voice-pipeline-learning";
import { LEARNABLE_LAYERS } from "@/lib/amy-voice-pipeline-learning";

export const RL_LEARNING_RATE = 0.15;
export const RL_EPSILON = 0.08;
export const RL_MAX_LATENCY_MS = 4000;
export const RL_MAX_TTFA_MS = 1200;
export const RL_SOFTMAX_TEMPERATURE = 0.35;

export type RlContextKey = string;

export type RlTelemetryPayload = {
  context: LayerScoringContext;
  chosenLayer: LearnableLayer;
  reward: number;
  ttfaMs: number;
  bufferingEvents: number;
  success: boolean;
  exploration?: boolean;
  streaming?: boolean;
};

const DB_NAME = "amynest_tts_rl";
const STORE = "qtable";
const DB_VERSION = 1;

type QRow = { key: RlContextKey; values: Record<LearnableLayer, number>; updatedAt: number };

const qMirror = new Map<RlContextKey, Record<LearnableLayer, number>>();
let serverQ: Partial<Record<LearnableLayer, number>> = {};
let serverQAt = 0;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function emptyQ(): Record<LearnableLayer, number> {
  return { static: 0, cache: 0, api: 0, elevenlabs: 0 };
}

export function buildRlContextKey(context: LayerScoringContext): RlContextKey {
  const hour = typeof Date !== "undefined" ? new Date().getHours() : 12;
  const bucket = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `${context.deviceClass}:${context.networkProfile}:${context.module}:${context.shortText ? "short" : "long"}:${bucket}`;
}

function openRlDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => resolve(null);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "key" });
          }
        };
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function persistQ(key: RlContextKey, values: Record<LearnableLayer, number>): Promise<void> {
  const db = await openRlDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, values, updatedAt: Date.now() } satisfies QRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* best-effort */
  }
}

export async function hydrateRlStore(): Promise<void> {
  const db = await openRlDb();
  if (!db) return;
  try {
    const rows = await new Promise<QRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as QRow[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const row of rows) {
      qMirror.set(row.key, { ...emptyQ(), ...row.values });
    }
  } catch {
    /* ignore */
  }
}

export function getClientQ(context: LayerScoringContext, layer: LearnableLayer): number {
  const key = buildRlContextKey(context);
  return qMirror.get(key)?.[layer] ?? 0;
}

export function hasClientQData(context: LayerScoringContext): boolean {
  const key = buildRlContextKey(context);
  const q = qMirror.get(key);
  if (!q) return false;
  return LEARNABLE_LAYERS.some((l) => Math.abs(q[l]) > 0.01);
}

export function setServerRlQ(values: Partial<Record<LearnableLayer, number>>): void {
  serverQ = values;
  serverQAt = Date.now();
}

export function getMergedQ(
  context: LayerScoringContext,
  layer: LearnableLayer,
  bootstrap = 0.5,
): number {
  const client = getClientQ(context, layer);
  const hasClient = hasClientQData(context);
  const server = serverQ[layer] ?? bootstrap;

  if (!hasClient) return server;
  if (Date.now() - serverQAt > 6 * 60 * 60 * 1000) return client;
  if (typeof navigator !== "undefined" && !navigator.onLine) return client;
  return client * 0.6 + server * 0.4;
}

export function computeRlReward(
  success: boolean,
  latencyMs: number,
  ttfaMs: number,
  bufferingEvents: number,
): number {
  if (!success) return -1;
  let reward = 1;
  reward -= Math.min(1, latencyMs / RL_MAX_LATENCY_MS);
  reward -= Math.min(0.6, ttfaMs / RL_MAX_TTFA_MS);
  reward -= Math.min(0.4, bufferingEvents * 0.15);
  return Math.max(-1, Math.min(1, reward));
}

export function updateClientQ(
  context: LayerScoringContext,
  layer: LearnableLayer,
  reward: number,
): void {
  const key = buildRlContextKey(context);
  const current = { ...emptyQ(), ...qMirror.get(key) };
  const old = current[layer];
  current[layer] = old + RL_LEARNING_RATE * (reward - old);
  qMirror.set(key, current);
  void persistQ(key, current);
}

function softmaxPick(
  layers: LearnableLayer[],
  scores: Record<LearnableLayer, number>,
): LearnableLayer {
  const exp = layers.map((l) => Math.exp(scores[l] / RL_SOFTMAX_TEMPERATURE));
  const sum = exp.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < layers.length; i++) {
    r -= exp[i]!;
    if (r <= 0) return layers[i]!;
  }
  return layers[layers.length - 1]!;
}

export function selectLayersWithRl(
  context: LayerScoringContext,
  penalized: Set<string>,
  bootstrapScores: Record<LearnableLayer, number>,
  streamingBoost = true,
): { layers: LearnableLayer[]; exploring: boolean } {
  const available = LEARNABLE_LAYERS.filter((l) => !penalized.has(l));
  if (available.length === 0) return { layers: [...LEARNABLE_LAYERS], exploring: false };

  const scores = {} as Record<LearnableLayer, number>;
  for (const layer of LEARNABLE_LAYERS) {
    let q = getMergedQ(context, layer, bootstrapScores[layer]);
    if (streamingBoost && layer === "api" && context.networkProfile === "fast") {
      q += 0.12;
    }
    if (layer === "static" || layer === "cache") {
      q += context.shortText ? 0.08 : 0;
    }
    scores[layer] = q;
  }

  const exploring = Math.random() < RL_EPSILON;
  if (exploring && available.length > 1) {
    const pick = available[1 + Math.floor(Math.random() * (available.length - 1))]!;
    return {
      layers: [pick, ...available.filter((l) => l !== pick), ...LEARNABLE_LAYERS.filter((l) => penalized.has(l))],
      exploring: true,
    };
  }

  const ranked = [...available].sort((a, b) => scores[b] - scores[a]);
  const top = ranked[0]!;
  if (available.length > 1 && Math.random() < 0.15) {
    const pick = softmaxPick(available, scores);
    if (pick !== top) {
      return {
        layers: [pick, ...ranked.filter((l) => l !== pick)],
        exploring: false,
      };
    }
  }

  return {
    layers: [...ranked, ...LEARNABLE_LAYERS.filter((l) => penalized.has(l))],
    exploring: false,
  };
}

export function logTtsRL(payload: RlTelemetryPayload): void {
  if (import.meta.env.DEV) {
    console.debug("[AmyVoiceRL]", payload);
  }
}

export function recordRlOutcome(payload: RlTelemetryPayload, latencyMs: number): void {
  const reward = computeRlReward(
    payload.success,
    latencyMs,
    payload.ttfaMs,
    payload.bufferingEvents,
  );
  updateClientQ(payload.context, payload.chosenLayer, reward);
  logTtsRL({ ...payload, reward });
  queueRlTelemetry(payload, reward);
}

function queueRlTelemetry(payload: RlTelemetryPayload, reward: number): void {
  void import("@/lib/amy-voice-pipeline-server-sync").then((m) => {
    m.queueServerRlTelemetry({
      contextKey: buildRlContextKey(payload.context),
      layer: payload.chosenLayer,
      reward,
      ttfaMs: payload.ttfaMs,
      bufferingEvents: payload.bufferingEvents,
      success: payload.success,
      exploration: payload.exploration,
      streaming: payload.streaming,
    });
  });
}

/** Test-only reset */
export function _resetRlForTests(): void {
  qMirror.clear();
  serverQ = {};
  serverQAt = 0;
  dbPromise = null;
}
