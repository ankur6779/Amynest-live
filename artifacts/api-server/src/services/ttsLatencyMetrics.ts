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
  gcsWriteMs?: number;
  queueWaitMs?: number;
  clientDownloadMs?: number;
};

export type UserTtsClientMetric = {
  ts?: number;
  route: string;
  feature?: string;
  requestStartMs: number;
  firstNetworkByteMs: number | null;
  firstPlayableByteMs: number | null;
  downloadCompleteMs: number | null;
  userPlaybackStartMs: number | null;
  userFirstAudioHeardMs: number | null;
  playbackStartedBeforeDownloadComplete: boolean;
  streamingUsed: boolean;
  cacheKey?: string;
};

export type CoachCacheMetric = {
  ts: number;
  planCacheKey: string;
  winIndex: number;
  cacheHit: boolean;
  generationMs: number;
};

const MAX_EVENTS = 10_000;
const events: TtsLatencyEvent[] = [];
const userEvents: UserTtsClientMetric[] = [];
const coachEvents: CoachCacheMetric[] = [];

let requestTotal = 0;
let cacheHitTotal = 0;
let cacheMissTotal = 0;
let generationMsSum = 0;
let generationCount = 0;
let firstAudioMsSum = 0;
let firstAudioCount = 0;
let elevenLabsCalls = 0;

let userPlaybackStartSum = 0;
let userPlaybackStartCount = 0;
let userFirstAudioHeardSum = 0;
let userFirstAudioHeardCount = 0;
let playbackBeforeDownloadCompleteCount = 0;
let userMetricTotal = 0;

let coachCacheHitTotal = 0;
let coachCacheMissTotal = 0;
let coachGenerationMsSum = 0;
let coachGenerationCount = 0;

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
      gcsWriteMs: sample.gcsWriteMs,
      queueWaitMs: sample.queueWaitMs,
    },
    "tts latency sample",
  );
}

export function recordUserTtsClientMetrics(samples: UserTtsClientMetric[]): number {
  let accepted = 0;
  for (const sample of samples) {
    userMetricTotal += 1;
    if (sample.userPlaybackStartMs != null) {
      userPlaybackStartSum += sample.userPlaybackStartMs;
      userPlaybackStartCount += 1;
    }
    if (sample.userFirstAudioHeardMs != null) {
      userFirstAudioHeardSum += sample.userFirstAudioHeardMs;
      userFirstAudioHeardCount += 1;
    }
    if (sample.playbackStartedBeforeDownloadComplete) {
      playbackBeforeDownloadCompleteCount += 1;
    }
    userEvents.push({ ...sample, ts: sample.ts ?? Date.now() });
    accepted += 1;
  }
  if (userEvents.length > MAX_EVENTS) userEvents.splice(0, userEvents.length - MAX_EVENTS);
  return accepted;
}

export function recordCoachCacheMetric(sample: Omit<CoachCacheMetric, "ts">): void {
  if (sample.cacheHit) coachCacheHitTotal += 1;
  else coachCacheMissTotal += 1;
  coachGenerationMsSum += sample.generationMs;
  coachGenerationCount += 1;
  coachEvents.push({ ts: Date.now(), ...sample });
  if (coachEvents.length > MAX_EVENTS) coachEvents.splice(0, coachEvents.length - MAX_EVENTS);
  logger.info(
    {
      evt: "coach_audio.cache",
      planCacheKey: sample.planCacheKey,
      winIndex: sample.winIndex,
      cacheHit: sample.cacheHit,
      generationMs: sample.generationMs,
    },
    "coach cache sample",
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
  const userPlaybackSamples = userEvents
    .map((e) => e.userPlaybackStartMs)
    .filter((v): v is number => v != null && v >= 0);
  const userHeardSamples = userEvents
    .map((e) => e.userFirstAudioHeardMs)
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
    server_ttfa_ms_p50: percentile(ttfaSamples, 50),
    server_ttfa_ms_p95: percentile(ttfaSamples, 95),
    client_ttfa_ms_p50: percentile(userPlaybackSamples, 50),
    client_ttfa_ms_p95: percentile(userPlaybackSamples, 95),
    user_playback_start_ms_avg:
      userPlaybackStartCount > 0
        ? Math.round(userPlaybackStartSum / userPlaybackStartCount)
        : null,
    user_first_audio_heard_ms_avg:
      userFirstAudioHeardCount > 0
        ? Math.round(userFirstAudioHeardSum / userFirstAudioHeardCount)
        : null,
    user_first_audio_heard_ms_p50: percentile(userHeardSamples, 50),
    user_first_audio_heard_ms_p95: percentile(userHeardSamples, 95),
    playback_started_before_download_complete_pct:
      userMetricTotal > 0
        ? Math.round((playbackBeforeDownloadCompleteCount / userMetricTotal) * 1000) / 10
        : null,
    user_metric_samples: userMetricTotal,
    coach_cache_hit: coachCacheHitTotal,
    coach_cache_miss: coachCacheMissTotal,
    coach_cache_hit_pct:
      coachCacheHitTotal + coachCacheMissTotal > 0
        ? Math.round((coachCacheHitTotal / (coachCacheHitTotal + coachCacheMissTotal)) * 1000) / 10
        : null,
    coach_generation_ms_avg:
      coachGenerationCount > 0 ? Math.round(coachGenerationMsSum / coachGenerationCount) : null,
  };
}

export function resetTtsLatencyMetricsForTests(): void {
  events.length = 0;
  userEvents.length = 0;
  coachEvents.length = 0;
  requestTotal = 0;
  cacheHitTotal = 0;
  cacheMissTotal = 0;
  generationMsSum = 0;
  generationCount = 0;
  firstAudioMsSum = 0;
  firstAudioCount = 0;
  elevenLabsCalls = 0;
  userPlaybackStartSum = 0;
  userPlaybackStartCount = 0;
  userFirstAudioHeardSum = 0;
  userFirstAudioHeardCount = 0;
  playbackBeforeDownloadCompleteCount = 0;
  userMetricTotal = 0;
  coachCacheHitTotal = 0;
  coachCacheMissTotal = 0;
  coachGenerationMsSum = 0;
  coachGenerationCount = 0;
}
