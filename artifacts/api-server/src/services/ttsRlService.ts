/**
 * Server-side RL aggregation — Q-values from reward telemetry (24h window).
 */

import type { LearnableLayer } from "./ttsIntelligenceService.js";

export type RlTelemetryEvent = {
  contextKey: string;
  layer: LearnableLayer;
  reward: number;
  ttfaMs: number;
  bufferingEvents: number;
  success: boolean;
  exploration?: boolean;
  streaming?: boolean;
};

type StoredRlEvent = RlTelemetryEvent & { at: number };

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 30_000;

const rlEvents: StoredRlEvent[] = [];
const globalQ: Record<LearnableLayer, { sum: number; count: number }> = {
  static: { sum: 0, count: 0 },
  cache: { sum: 0, count: 0 },
  api: { sum: 0, count: 0 },
  elevenlabs: { sum: 0, count: 0 },
};

function prune(now = Date.now()): void {
  const cutoff = now - WINDOW_MS;
  while (rlEvents.length > 0 && rlEvents[0]!.at < cutoff) {
    rlEvents.shift();
  }
  if (rlEvents.length > MAX_EVENTS) {
    rlEvents.splice(0, rlEvents.length - MAX_EVENTS);
  }
}

export function ingestRlTelemetry(events: RlTelemetryEvent[]): { accepted: number } {
  const now = Date.now();
  let accepted = 0;
  for (const raw of events) {
    if (!raw?.layer || typeof raw.reward !== "number") continue;
    rlEvents.push({ ...raw, at: now });
    globalQ[raw.layer].sum += raw.reward;
    globalQ[raw.layer].count += 1;
    accepted += 1;
  }
  prune(now);
  return { accepted };
}

export type RlStrategyResponse = {
  qValues: Record<LearnableLayer, number>;
  streamingBoost: number;
  ttfaTargetMs: number;
};

export function resolveRlStrategy(): RlStrategyResponse {
  prune();
  const qValues = {} as Record<LearnableLayer, number>;
  for (const layer of Object.keys(globalQ) as LearnableLayer[]) {
    const bucket = globalQ[layer];
    qValues[layer] = bucket.count > 0 ? bucket.sum / bucket.count : 0.5;
  }

  const apiEvents = rlEvents.filter((e) => e.layer === "api" && e.streaming);
  const streamSuccess =
    apiEvents.length > 0
      ? apiEvents.filter((e) => e.success).length / apiEvents.length
      : 0.7;
  const streamingBoost = streamSuccess > 0.75 ? 0.15 : streamSuccess < 0.5 ? -0.1 : 0.05;

  return {
    qValues,
    streamingBoost,
    ttfaTargetMs: 300,
  };
}

export function _resetTtsRlForTests(): void {
  rlEvents.length = 0;
  for (const layer of Object.keys(globalQ) as LearnableLayer[]) {
    globalQ[layer] = { sum: 0, count: 0 };
  }
}
