import { logger } from "../lib/logger.js";
import { getAmyTtsModelId, getAmyTtsVoiceId } from "../lib/amy-tts-config.js";

export type TtsLatencyEvent = {
  ts: number;
  route: string;
  provider: "elevenlabs" | "openai" | "cache" | "static";
  cacheHit: boolean;
  generationMs?: number;
  firstAudioMs?: number;
  playbackStartMs?: number;
  streaming: boolean;
  modelId: string;
  voiceId: string;
  charCount: number;
};

const MAX_EVENTS = 10_000;
const events: TtsLatencyEvent[] = [];
let requestTotal = 0;
let cacheHitTotal = 0;
let cacheMissTotal = 0;
let generationMsSum = 0;
let generationCount = 0;
let firstAudioMsSum = 0;
let firstAudioCount = 0;
let elevenLabsCalls = 0;

export function recordTtsLatencySample(sample: Omit<TtsLatencyEvent, "ts" | "modelId" | "voiceId"> & {
  modelId?: string;
  voiceId?: string;
}): void {
  requestTotal += 1;
  if (sample.cacheHit) cacheHitTotal += 1;
  else cacheMissTotal += 1;
  if (sample.provider === "elevenlabs" && !sample.cacheHit) elevenLabsCalls += 1;
  if (sample.generationMs != null) {
    generationMsSum += sample.generationMs;
    generationCount += 1;
  }
  if (sample.firstAudioMs != null) {
    firstAudioMsSum += sample.firstAudioMs;
    firstAudioCount += 1;
  }

  events.push({
    ts: Date.now(),
    modelId: sample.modelId ?? getAmyTtsModelId(),
    voiceId: sample.voiceId ?? getAmyTtsVoiceId(),
    ...sample,
  });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  logger.info(
    {
      evt: "tts.latency",
      route: sample.route,
      provider: sample.provider,
      cacheHit: sample.cacheHit,
      generationMs: sample.generationMs,
      firstAudioMs: sample.firstAudioMs,
      streaming: sample.streaming,
    },
    "tts latency sample",
  );
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

export function getTtsLatencyDashboard(): Record<string, unknown> {
  const ttfaSamples = events
    .map((e) => e.firstAudioMs)
    .filter((v): v is number => v != null && v >= 0);
  const genSamples = events
    .map((e) => e.generationMs)
    .filter((v): v is number => v != null && v >= 0);

  return {
    tts_request_total: requestTotal,
    tts_cache_hit: cacheHitTotal,
    tts_cache_miss: cacheMissTotal,
    tts_cache_hit_pct:
      requestTotal > 0 ? Math.round((cacheHitTotal / requestTotal) * 1000) / 10 : null,
    tts_generation_ms_avg:
      generationCount > 0 ? Math.round(generationMsSum / generationCount) : null,
    tts_first_audio_ms_p50: percentile(ttfaSamples, 50),
    tts_first_audio_ms_p95: percentile(ttfaSamples, 95),
    tts_generation_ms_p50: percentile(genSamples, 50),
    tts_generation_ms_p95: percentile(genSamples, 95),
    tts_elevenlabs_calls: elevenLabsCalls,
    tts_model: getAmyTtsModelId(),
    tts_voice: getAmyTtsVoiceId(),
    recentSamples: events.length,
  };
}

export function resetTtsLatencyMetricsForTests(): void {
  events.length = 0;
  requestTotal = 0;
  cacheHitTotal = 0;
  cacheMissTotal = 0;
  generationMsSum = 0;
  generationCount = 0;
  firstAudioMsSum = 0;
  firstAudioCount = 0;
  elevenLabsCalls = 0;
}
