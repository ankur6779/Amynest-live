/**
 * Phase G.5 / Phase 7 — mastery-driven prewarm analytics.
 *
 * Tracks whether the assets we predicted + warmed are the ones the child
 * actually played: prewarm hit/miss rate, cache reuse, time-to-first-audio,
 * estimated bandwidth, and lesson-launch latency. Lightweight client ring
 * buffer + diag events; dashboards read getPrewarmTelemetrySnapshot().
 */
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";

export type PrewarmTelemetryEvent =
  | "prewarm_scheduled"
  | "prewarm_skipped"
  | "prewarm_asset_warmed"
  | "prewarm_hit"
  | "prewarm_miss"
  | "lesson_launch";

/** Rough per-clip transfer size for bandwidth estimation (128 kbps ~ small clips). */
const EST_CLIP_BYTES = 18 * 1024;

type Counters = {
  scheduledSessions: number;
  warmedAssets: number;
  hits: number;
  misses: number;
  ttfaHitMsTotal: number;
  ttfaHitCount: number;
  ttfaMissMsTotal: number;
  ttfaMissCount: number;
  estBandwidthBytes: number;
  lessonLaunchMsTotal: number;
  lessonLaunchCount: number;
};

const counters: Counters = {
  scheduledSessions: 0,
  warmedAssets: 0,
  hits: 0,
  misses: 0,
  ttfaHitMsTotal: 0,
  ttfaHitCount: 0,
  ttfaMissMsTotal: 0,
  ttfaMissCount: 0,
  estBandwidthBytes: 0,
  lessonLaunchMsTotal: 0,
  lessonLaunchCount: 0,
};

/** Asset keys warmed this session — playback checks membership for hit/miss. */
const warmedKeys = new Set<string>();

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export function recordPrewarmScheduled(meta: {
  childId: number;
  level: number;
  confidence: number;
  phonemes: number;
  words: number;
  storyLines: number;
}): void {
  counters.scheduledSessions += 1;
  logAmyVoiceDiag("prewarm_scheduled", meta);
}

export function recordPrewarmSkipped(reason: string): void {
  logAmyVoiceDiag("prewarm_skipped", { reason });
}

/** Mark predicted keys as warmed (phoneme keys + word/story texts). */
export function markPrewarmedKeys(keys: string[]): void {
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (!nk || warmedKeys.has(nk)) continue;
    warmedKeys.add(nk);
    counters.warmedAssets += 1;
    counters.estBandwidthBytes += EST_CLIP_BYTES;
  }
}

export function wasKeyPrewarmed(key: string): boolean {
  return warmedKeys.has(normalizeKey(key));
}

/**
 * Record a phonics playback for hit/miss + TTFA. `ttfaMs` is request→audible.
 * A hit = the played asset was in the predicted+warmed set.
 */
export function recordPhonicsPlayback(key: string, ttfaMs?: number): void {
  const hit = wasKeyPrewarmed(key);
  if (hit) {
    counters.hits += 1;
    if (typeof ttfaMs === "number") {
      counters.ttfaHitMsTotal += ttfaMs;
      counters.ttfaHitCount += 1;
    }
  } else {
    counters.misses += 1;
    if (typeof ttfaMs === "number") {
      counters.ttfaMissMsTotal += ttfaMs;
      counters.ttfaMissCount += 1;
    }
  }
  logAmyVoiceDiag(hit ? "prewarm_hit" : "prewarm_miss", { key: normalizeKey(key), ttfaMs });
}

export function recordLessonLaunchLatency(ms: number): void {
  counters.lessonLaunchMsTotal += ms;
  counters.lessonLaunchCount += 1;
  logAmyVoiceDiag("lesson_launch", { ms });
}

export type PrewarmTelemetrySnapshot = {
  scheduledSessions: number;
  warmedAssets: number;
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
  avgTtfaHitMs: number | null;
  avgTtfaMissMs: number | null;
  estBandwidthKb: number;
  avgLessonLaunchMs: number | null;
};

export function getPrewarmTelemetrySnapshot(): PrewarmTelemetrySnapshot {
  const total = counters.hits + counters.misses;
  return {
    scheduledSessions: counters.scheduledSessions,
    warmedAssets: counters.warmedAssets,
    hits: counters.hits,
    misses: counters.misses,
    hitRate: total > 0 ? Math.round((counters.hits / total) * 100) : 0,
    missRate: total > 0 ? Math.round((counters.misses / total) * 100) : 0,
    avgTtfaHitMs:
      counters.ttfaHitCount > 0 ? Math.round(counters.ttfaHitMsTotal / counters.ttfaHitCount) : null,
    avgTtfaMissMs:
      counters.ttfaMissCount > 0
        ? Math.round(counters.ttfaMissMsTotal / counters.ttfaMissCount)
        : null,
    estBandwidthKb: Math.round(counters.estBandwidthBytes / 1024),
    avgLessonLaunchMs:
      counters.lessonLaunchCount > 0
        ? Math.round(counters.lessonLaunchMsTotal / counters.lessonLaunchCount)
        : null,
  };
}

/** Test-only reset. */
export function _resetPrewarmTelemetryForTests(): void {
  warmedKeys.clear();
  Object.assign(counters, {
    scheduledSessions: 0,
    warmedAssets: 0,
    hits: 0,
    misses: 0,
    ttfaHitMsTotal: 0,
    ttfaHitCount: 0,
    ttfaMissMsTotal: 0,
    ttfaMissCount: 0,
    estBandwidthBytes: 0,
    lessonLaunchMsTotal: 0,
    lessonLaunchCount: 0,
  });
}
