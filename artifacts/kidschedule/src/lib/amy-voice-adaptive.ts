/**
 * Rolling telemetry stats — adapt circuit duration, stagger, and layer priority.
 */

import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

const STATS_WINDOW = 48;

type Outcome = { layer: AmyVoiceLayer; ok: boolean; at: number };

const outcomes: Outcome[] = [];

export function recordAdaptiveOutcome(layer: AmyVoiceLayer, ok: boolean): void {
  outcomes.push({ layer, ok, at: Date.now() });
  if (outcomes.length > STATS_WINDOW) outcomes.splice(0, outcomes.length - STATS_WINDOW);
}

function layerOutcomes(layer: AmyVoiceLayer): Outcome[] {
  return outcomes.filter((o) => o.layer === layer);
}

/** Share of recent OpenAI attempts that failed (0–1). */
export function getApiFailRate(): number {
  const api = layerOutcomes("api");
  if (api.length < 4) return 0;
  const fails = api.filter((o) => !o.ok).length;
  return fails / api.length;
}

/** Share of recent pregen hits (static or cache) that succeeded. */
export function getCacheSuccessRate(): number {
  const pregen = outcomes.filter((o) => o.layer === "static" || o.layer === "cache");
  if (pregen.length < 4) return 0.5;
  return pregen.filter((o) => o.ok).length / pregen.length;
}

/** Dynamic TTS circuit open duration from recent API reliability. */
export function getAdaptiveApiCircuitMs(): number {
  const rate = getApiFailRate();
  if (rate >= 0.65) return 60_000;
  if (rate >= 0.4) return 45_000;
  return 30_000;
}

/** Delay before starting ElevenLabs when OpenAI is already in flight (cost control). */
export function getElevenLabsStaggerMs(): number {
  const apiFail = getApiFailRate();
  const cacheHit = getCacheSuccessRate();
  if (apiFail >= 0.5) return 800;
  if (cacheHit >= 0.85) return 500;
  return 400;
}

/** Skip ElevenLabs entirely when API is very unreliable and we're offline-safe. */
export function shouldDeferElevenLabsFallback(): boolean {
  return getApiFailRate() >= 0.75 && getCacheSuccessRate() >= 0.6;
}

export function getAdaptiveSnapshot(): {
  apiFailRate: number;
  cacheSuccessRate: number;
  apiCircuitMs: number;
  elevenStaggerMs: number;
  sampleSize: number;
} {
  return {
    apiFailRate: getApiFailRate(),
    cacheSuccessRate: getCacheSuccessRate(),
    apiCircuitMs: getAdaptiveApiCircuitMs(),
    elevenStaggerMs: getElevenLabsStaggerMs(),
    sampleSize: outcomes.length,
  };
}
