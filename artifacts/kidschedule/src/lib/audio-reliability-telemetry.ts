/**
 * P0 audio reliability telemetry — every playback request tracked end-to-end.
 * Single schema for Speech Coach, Phonics, Blending, Reading, Parent Hub, Lessons.
 */

import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { getModuleLatencyAverages } from "@/lib/audio-latency-metrics";
import { getPlaybackQueueStats } from "@/lib/audio-playback-queue";
import { getHotCacheStats } from "@/lib/audio-hot-cache";

export type AudioReliabilityEvent =
  | "audio_requested"
  | "audio_cache_hit"
  | "audio_cache_miss"
  | "audio_download_started"
  | "audio_download_complete"
  | "audio_play_started"
  | "audio_play_failed"
  | "audio_timeout"
  | "audio_cancelled"
  | "audio_recovered"
  | "audio_completed";

export type AudioReliabilityModule =
  | "speech_coach"
  | "phonics"
  | "blending"
  | "reading"
  | "parent_hub"
  | "lesson"
  | "other";

export type AudioSourceLayer =
  | "BUNDLED"
  | "LOCAL_CACHE"
  | "STATIC_GCS"
  | "DYNAMIC_TTS"
  | "FALLBACK";

export type AudioReliabilityPlatform = "android_webview" | "android_browser" | "ios" | "web";

/** Phase 10 — classified failure reasons (telemetry-only taxonomy). */
export type AudioFailureReason =
  | "AUDIO_FOCUS_LOST"
  | "PLAY_REJECTED"
  | "SOURCE_NOT_FOUND"
  | "CACHE_MISS"
  | "NETWORK_TIMEOUT"
  | "DECODE_ERROR"
  | "UNMOUNTED_DURING_PLAY"
  | "AUTOPLAY_BLOCKED"
  | "PIPELINE_TIMEOUT"
  | "UNKNOWN";

export type AudioTraceStep =
  | "REQUESTED"
  | "CACHE_LOOKUP"
  | "CACHE_HIT"
  | "CACHE_MISS"
  | "DOWNLOAD_START"
  | "DOWNLOAD_END"
  | "DECODE_START"
  | "DECODE_END"
  | "PLAY_START"
  | "PLAY_END"
  | "FAILURE";

export type AudioLifecycleInterruptKind =
  | "visibility_hidden"
  | "visibility_visible"
  | "page_hide"
  | "page_show"
  | "window_blur"
  | "window_focus"
  | "before_unload"
  | "audio_destroyed_before_play";

export type AudioTrace = {
  audio_trace_id: string;
  module: AudioReliabilityModule;
  audioIdentity?: string;
  steps: Array<{ step: AudioTraceStep; ts: number; detail?: string }>;
  failed: boolean;
  failureReason?: AudioFailureReason;
  failureError?: string;
  platform: AudioReliabilityPlatform;
  startedAt: number;
};

export type AudioFailureDashboardRow = {
  module: AudioReliabilityModule;
  failure_reason: AudioFailureReason;
  count: number;
  percentage: number;
};

export type AudioRootCauseRow = {
  failure_reason: AudioFailureReason;
  count: number;
  percentage: number;
  impactRank: number;
};

export type AudioReliabilityRecord = {
  event: AudioReliabilityEvent;
  module: AudioReliabilityModule;
  sourceLayer?: AudioSourceLayer;
  audioIdentity?: string;
  audio_trace_id?: string;
  failureReason?: AudioFailureReason;
  device: string;
  platform: AudioReliabilityPlatform;
  latencyToFirstSoundMs?: number;
  error?: string;
  recoveredFrom?: AudioSourceLayer;
  /** HTMLAudioElement state captured on audio_start_timeout (production diagnostics). */
  elementSnapshot?: {
    readyState: number;
    readyStateLabel: string;
    paused: boolean;
    currentTime: number;
    muted: boolean;
    volume: number;
    ended: boolean;
    mediaErrorCode: number | null;
    srcTail: string;
  };
  ts: number;
  sessionId: string;
};

export type AudioModuleDashboard = {
  module: AudioReliabilityModule;
  requested: number;
  playStarted: number;
  playFailed: number;
  timeouts: number;
  cancelled: number;
  recovered: number;
  cacheHits: number;
  cacheMisses: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
};

type ActiveRequest = {
  module: AudioReliabilityModule;
  audioIdentity?: string;
  requestedAt: number;
  sourceLayer?: AudioSourceLayer;
  traceId: string;
};

const MAX_EVENTS = 500;
const MAX_LATENCY_SAMPLES = 200;
const MAX_TRACES = 100;
const MAX_FAILED_TRACES = 40;

const events: AudioReliabilityRecord[] = [];
const traces = new Map<string, AudioTrace>();
const failedTraces: AudioTrace[] = [];
const failureReasonCounts = new Map<string, number>(); // `${module}:${reason}`
const lifecycleInterruptCounts = new Map<AudioLifecycleInterruptKind, number>();
const coachCacheStats = { hits: 0, misses: 0, regenerated: new Map<string, number>() };
const latencySamples = new Map<AudioReliabilityModule, number[]>();
const counters = new Map<
  AudioReliabilityModule,
  {
    requested: number;
    playStarted: number;
    playFailed: number;
    timeouts: number;
    cancelled: number;
    recovered: number;
    cacheHits: number;
    cacheMisses: number;
  }
>();

const activeRequests = new Map<string, ActiveRequest>();
let sessionId = createSessionId();
let requestSeq = 0;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCounters() {
  return {
    requested: 0,
    playStarted: 0,
    playFailed: 0,
    timeouts: 0,
    cancelled: 0,
    recovered: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
}

function getCounters(module: AudioReliabilityModule) {
  let c = counters.get(module);
  if (!c) {
    c = emptyCounters();
    counters.set(module, c);
  }
  return c;
}

function getPlatform(): AudioReliabilityPlatform {
  if (typeof navigator === "undefined") return "web";
  if (isAndroidAmyNestAudioClient()) return "android_webview";
  if (/Android/i.test(navigator.userAgent)) return "android_browser";
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  return "web";
}

function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem != null && mem <= 2) return "low_end";
  if (mem != null && mem <= 4) return "mid_range";
  return "standard";
}

export function resolveAudioReliabilityModule(opts?: {
  speakOpts?: SpeakOptions;
  phonics?: boolean;
  blending?: boolean;
  reading?: boolean;
  label?: string;
}): AudioReliabilityModule {
  const o = opts?.speakOpts;
  if (opts?.blending) return "blending";
  if (o?.parentHub) return "parent_hub";
  if (o?.coach) return "speech_coach";
  if (o?.lessonParagraph) return "lesson";
  if (opts?.reading || o?.catalogPlayback) return "reading";
  if (opts?.phonics || o?.mode === "phonics" || o?.phoneme) return "phonics";
  if (opts?.label?.includes("phonics")) return "phonics";
  if (opts?.label?.includes("blend")) return "blending";
  return "other";
}

/** Map pipeline / playback layers to P0 source taxonomy. */
export function mapToAudioSourceLayer(
  layer?: string,
  meta?: { bundled?: boolean; srcType?: string },
): AudioSourceLayer {
  if (meta?.bundled) return "BUNDLED";
  const l = (layer ?? "").toLowerCase();
  if (l === "cache" || l === "local" || l === "indexeddb") return "LOCAL_CACHE";
  if (l === "static" || meta?.srcType === "static") return "STATIC_GCS";
  if (
    l === "api" ||
    l === "elevenlabs" ||
    l === "dynamic" ||
    l === "tts" ||
    meta?.srcType === "tts"
  ) {
    return "DYNAMIC_TTS";
  }
  if (
    l === "emergency_local" ||
    l === "emergency" ||
    l === "text_visual" ||
    l === "fallback"
  ) {
    return "FALLBACK";
  }
  return "STATIC_GCS";
}

/** Classify raw error strings into P0 failure taxonomy — no guessing beyond pattern match. */
export function classifyAudioFailureReason(
  error: string,
  ctx?: { lifecycleInterrupt?: boolean; hadCacheLookup?: boolean },
): AudioFailureReason {
  const e = (error ?? "").toLowerCase();
  if (ctx?.lifecycleInterrupt || /focus_pause|focus_loss|external pause|android_lifecycle/i.test(e)) {
    return "AUDIO_FOCUS_LOST";
  }
  if (/playback_busy|play_rejected|audio_superseded|superseded|busy/i.test(e)) {
    return "PLAY_REJECTED";
  }
  if (/static_failed|missing_url|source_not_found|empty_url|phonics_library_missing|not found/i.test(e)) {
    return "SOURCE_NOT_FOUND";
  }
  if (/cache_miss|no cache|indexeddb miss/i.test(e) || (ctx?.hadCacheLookup && /static_failed/i.test(e))) {
    return "CACHE_MISS";
  }
  if (/fetch failed|network|timeout|abort|econnrefused|unreachable|503|502|504/i.test(e)) {
    return "NETWORK_TIMEOUT";
  }
  if (/media_error|decode|corrupt|invalid_audio|silent_output|phonics_url_blocked/i.test(e)) {
    return "DECODE_ERROR";
  }
  if (/stale|unmounted|cancelled|tts_cancelled|component unmount/i.test(e)) {
    return "UNMOUNTED_DURING_PLAY";
  }
  if (/gesture|notallowed|autoplay|user_interaction|blocked_until_gesture/i.test(e)) {
    return "AUTOPLAY_BLOCKED";
  }
  if (/watchdog|pipeline_timeout|audio_start_timeout|controller_loading|max_pipeline/i.test(e)) {
    return "PIPELINE_TIMEOUT";
  }
  return "UNKNOWN";
}

function failureKey(module: AudioReliabilityModule, reason: AudioFailureReason): string {
  return `${module}:${reason}`;
}

function recordFailureReason(module: AudioReliabilityModule, reason: AudioFailureReason): void {
  const key = failureKey(module, reason);
  failureReasonCounts.set(key, (failureReasonCounts.get(key) ?? 0) + 1);
}

function createTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `trace_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTrace(traceId: string): AudioTrace | undefined {
  return traces.get(traceId);
}

/** Append a step to an active audio trace. */
export function traceAudioStep(
  traceId: string,
  step: AudioTraceStep,
  detail?: string,
): void {
  const trace = traces.get(traceId);
  if (!trace) return;
  trace.steps.push({ step, ts: Date.now(), detail });
  if (step === "CACHE_HIT") {
    pushEvent(buildTraceEvent(trace, "audio_cache_hit"));
  } else if (step === "CACHE_MISS") {
    pushEvent(buildTraceEvent(trace, "audio_cache_miss"));
  } else if (step === "DOWNLOAD_START") {
    pushEvent(buildTraceEvent(trace, "audio_download_started"));
  } else if (step === "DOWNLOAD_END") {
    pushEvent(buildTraceEvent(trace, "audio_download_complete"));
  } else if (step === "PLAY_START") {
    /* play_started tracked separately with latency */
  }
}

function buildTraceEvent(trace: AudioTrace, event: AudioReliabilityEvent): AudioReliabilityRecord {
  return {
    event,
    module: trace.module,
    audioIdentity: trace.audioIdentity,
    audio_trace_id: trace.audio_trace_id,
    device: getDeviceLabel(),
    platform: trace.platform,
    ts: Date.now(),
    sessionId,
  };
}

function markTraceFailed(
  traceId: string,
  error: string,
  reason?: AudioFailureReason,
): void {
  const trace = traces.get(traceId);
  if (!trace) return;
  const failureReason = reason ?? classifyAudioFailureReason(error);
  trace.failed = true;
  trace.failureReason = failureReason;
  trace.failureError = error;
  trace.steps.push({ step: "FAILURE", ts: Date.now(), detail: `${failureReason}:${error}` });
  recordFailureReason(trace.module, failureReason);
  failedTraces.push({ ...trace, steps: [...trace.steps] });
  while (failedTraces.length > MAX_FAILED_TRACES) failedTraces.shift();
  pushEvent({
    event: "audio_play_failed",
    module: trace.module,
    audioIdentity: trace.audioIdentity,
    audio_trace_id: trace.audio_trace_id,
    failureReason,
    error,
    device: getDeviceLabel(),
    platform: trace.platform,
    ts: Date.now(),
    sessionId,
  });
}

export function logAndroidLifecycleInterrupt(
  kind: AudioLifecycleInterruptKind,
  detail?: string,
): void {
  lifecycleInterruptCounts.set(kind, (lifecycleInterruptCounts.get(kind) ?? 0) + 1);
  if (import.meta.env.DEV) {
    console.info("[AudioReliability] ANDROID_LIFECYCLE_INTERRUPT", { kind, detail });
  }
  if (kind === "visibility_hidden" || kind === "page_hide" || kind === "before_unload") {
    pushEvent({
      event: "audio_cancelled",
      module: "other",
      error: `ANDROID_LIFECYCLE_INTERRUPT:${kind}${detail ? `:${detail}` : ""}`,
      failureReason: "AUDIO_FOCUS_LOST",
      device: getDeviceLabel(),
      platform: getPlatform(),
      ts: Date.now(),
      sessionId,
    });
  }
}

/** Speech Coach static/cache hit tracking — target >= 90% hit rate. */
export function recordSpeechCoachCacheOutcome(
  text: string,
  hit: boolean,
  source?: "static" | "cache" | "dynamic",
): void {
  if (hit) {
    coachCacheStats.hits += 1;
  } else {
    coachCacheStats.misses += 1;
    const key = text.trim().slice(0, 80).toLowerCase();
    coachCacheStats.regenerated.set(key, (coachCacheStats.regenerated.get(key) ?? 0) + 1);
  }
  if (import.meta.env.DEV && source === "dynamic") {
    console.info("[SpeechCoachCache] miss", { text: text.slice(0, 60) });
  }
}

export function getSpeechCoachCacheHitRate(): number {
  const total = coachCacheStats.hits + coachCacheStats.misses;
  if (total === 0) return 1;
  return Math.round((coachCacheStats.hits / total) * 10_000) / 100;
}

export function getSpeechCoachTopRegenerated(limit = 10): Array<{ text: string; count: number }> {
  return [...coachCacheStats.regenerated.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

export function getSpeechCoachCacheRemediation(): string[] {
  const rate = getSpeechCoachCacheHitRate();
  if (rate >= 90) return [];
  const top = getSpeechCoachTopRegenerated(5);
  const plan = [
    `Speech Coach cache hit rate ${rate}% is below 90% target.`,
    "Pre-generate and warm these top regenerated responses:",
    ...top.map((t) => `- "${t.text}" (${t.count} regenerations)`),
    "Run warmSpeechCoach() with getCoachDialogueWarmupPhrases() on session open.",
  ];
  return plan;
}

export function getFailureDashboard(): AudioFailureDashboardRow[] {
  const rows: AudioFailureDashboardRow[] = [];
  const moduleTotals = new Map<AudioReliabilityModule, number>();

  for (const [key, count] of failureReasonCounts) {
    const [module, reason] = key.split(":") as [AudioReliabilityModule, AudioFailureReason];
    moduleTotals.set(module, (moduleTotals.get(module) ?? 0) + count);
    rows.push({
      module,
      failure_reason: reason,
      count,
      percentage: 0,
    });
  }

  for (const row of rows) {
    const total = moduleTotals.get(row.module) ?? 1;
    row.percentage = Math.round((row.count / total) * 10_000) / 100;
  }

  return rows.sort((a, b) => b.count - a.count);
}

export function getTopFailureCauses(limit = 5): AudioRootCauseRow[] {
  const byReason = new Map<AudioFailureReason, number>();
  let total = 0;
  for (const [key, count] of failureReasonCounts) {
    const reason = key.split(":")[1] as AudioFailureReason;
    byReason.set(reason, (byReason.get(reason) ?? 0) + count);
    total += count;
  }
  if (total === 0) return [];

  return [...byReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([failure_reason, count], idx) => ({
      failure_reason,
      count,
      percentage: Math.round((count / total) * 10_000) / 100,
      impactRank: idx + 1,
    }));
}

export function getRootCauseReport(): {
  topCauses: AudioRootCauseRow[];
  remediation: string[];
  modulesBelowTarget: AudioModuleDashboard[];
  speechCoachCacheHitRate: number;
  lifecycleInterrupts: Record<string, number>;
} {
  const dashboard = getAudioReliabilityDashboard();
  const targetModules: AudioReliabilityModule[] = [
    "speech_coach",
    "phonics",
    "blending",
    "reading",
    "parent_hub",
  ];
  const modulesBelowTarget = dashboard.filter(
    (d) => targetModules.includes(d.module) && d.successRate < 99.5 && d.requested > 0,
  );

  const topCauses = getTopFailureCauses(5);
  const remediation: string[] = [];

  for (const row of topCauses) {
    switch (row.failure_reason) {
      case "AUDIO_FOCUS_LOST":
        remediation.push("Reduce background transitions; re-prime audio on visibility visible (Android WebView).");
        break;
      case "CACHE_MISS":
        remediation.push("Expand startup preload + Parent Hub warmup; verify static-audio-map entries.");
        break;
      case "AUTOPLAY_BLOCKED":
        remediation.push("Ensure primeSpeakGesture on pointerdown for all listen buttons (Android).");
        break;
      case "PIPELINE_TIMEOUT":
        remediation.push("Tighten pipeline budget; prefetch next assets on module open.");
        break;
      case "SOURCE_NOT_FOUND":
        remediation.push("Run parent_hub_only / phonics manifest validation; fix missing GCS objects.");
        break;
      case "NETWORK_TIMEOUT":
        remediation.push("Verify API proxy health; increase IndexedDB warm on first miss.");
        break;
      case "DECODE_ERROR":
        remediation.push("Validate MP3 blobs; reject corrupt cache entries and re-fetch.");
        break;
      default:
        remediation.push(`Investigate ${row.failure_reason} (${row.percentage}% of failures).`);
    }
  }

  remediation.push(...getSpeechCoachCacheRemediation());

  for (const m of modulesBelowTarget) {
    remediation.push(
      `Module ${m.module} at ${m.successRate}% — run device matrix (100 actions) and inspect failed traces.`,
    );
  }

  const lifecycleInterrupts: Record<string, number> = {};
  for (const [k, v] of lifecycleInterruptCounts) {
    lifecycleInterrupts[k] = v;
  }

  return {
    topCauses,
    remediation: [...new Set(remediation)],
    modulesBelowTarget,
    speechCoachCacheHitRate: getSpeechCoachCacheHitRate(),
    lifecycleInterrupts,
  };
}

export function getFailedTraces(limit = 20): AudioTrace[] {
  return failedTraces.slice(-limit);
}

export function getAudioTrace(traceId: string): AudioTrace | undefined {
  return getTrace(traceId);
}

/** Replay a failed trace in dev — logs steps; caller may re-invoke speak with stored identity. */
export function replayFailedTrace(traceId: string): AudioTrace | null {
  const trace = failedTraces.find((t) => t.audio_trace_id === traceId) ?? traces.get(traceId) ?? null;
  if (!trace) return null;
  console.info("[AudioReliability] REPLAY_TRACE", trace);
  return trace;
}

export function exportDeviceMatrixTemplate(): {
  modules: AudioReliabilityModule[];
  devices: string[];
  actionsPerModule: number;
  instructions: string[];
} {
  return {
    modules: ["speech_coach", "phonics", "blending", "reading", "parent_hub"],
    devices: [
      "android_low_end",
      "android_mid_range",
      "android_tablet",
      "iphone",
      "ipad",
    ],
    actionsPerModule: 100,
    instructions: [
      "Reset: window.__amynestAudioReliability.reset()",
      "Exercise 100 playback actions per module on each device.",
      "Export: window.__amynestAudioReliability.deviceMatrixReport()",
    ],
  };
}

export function getDeviceMatrixReport(): {
  dashboard: AudioModuleDashboard[];
  failures: AudioFailureDashboardRow[];
  topCauses: AudioRootCauseRow[];
  avgLatencyByModule: Record<string, number>;
  p95LatencyByModule: Record<string, number>;
} {
  const dashboard = getAudioReliabilityDashboard();
  const avgLatencyByModule: Record<string, number> = {};
  const p95LatencyByModule: Record<string, number> = {};
  for (const d of dashboard) {
    avgLatencyByModule[d.module] = d.avgLatencyMs;
    p95LatencyByModule[d.module] = d.p95LatencyMs;
  }
  return {
    dashboard,
    failures: getFailureDashboard(),
    topCauses: getTopFailureCauses(5),
    avgLatencyByModule,
    p95LatencyByModule,
  };
}

export type LatencyReportRow = {
  module: AudioReliabilityModule;
  avg_first_sound_ms: number;
  p95_first_sound_ms: number;
  cache_hit_rate: number;
  decode_time_ms: number;
  play_time_ms: number;
  network_time_ms: number;
  success_rate: number;
};

/** Phase 11 — aggregate latency + cache + queue stats (no new telemetry events). */
export function getLatencyReport(): {
  modules: LatencyReportRow[];
  queue_interruptions: number;
  stale_audio_prevented: number;
  queue_depth: number;
  hot_cache: ReturnType<typeof getHotCacheStats>;
  targets: {
    learning_zone: { avg_ms: number; p95_ms: number; success_pct: number };
    speech_coach: { avg_ms: number; p95_ms: number; success_pct: number };
    parent_hub: { avg_ms: number; success_pct: number };
  };
} {
  const dashboard = getAudioReliabilityDashboard();
  const queue = getPlaybackQueueStats();

  const modules: LatencyReportRow[] = dashboard.map((d) => {
    const lat = getModuleLatencyAverages(d.module);
    const cacheTotal = d.cacheHits + d.cacheMisses;
    const cacheHitRate =
      cacheTotal === 0 ? 1 : Math.round((d.cacheHits / cacheTotal) * 10_000) / 100;
    return {
      module: d.module,
      avg_first_sound_ms: d.avgLatencyMs,
      p95_first_sound_ms: d.p95LatencyMs,
      cache_hit_rate: cacheHitRate,
      decode_time_ms: lat.decode,
      play_time_ms: lat.play,
      network_time_ms: lat.network,
      success_rate: d.successRate,
    };
  });

  const lz = modules.find((m) => m.module === "phonics") ?? modules.find((m) => m.module === "blending");
  const coach = modules.find((m) => m.module === "speech_coach");
  const hub = modules.find((m) => m.module === "parent_hub");

  return {
    modules,
    queue_interruptions: queue.interruptions,
    stale_audio_prevented: queue.stale_audio_prevented,
    queue_depth: queue.queue_depth,
    hot_cache: getHotCacheStats(),
    targets: {
      learning_zone: {
        avg_ms: lz?.avg_first_sound_ms ?? 0,
        p95_ms: lz?.p95_first_sound_ms ?? 0,
        success_pct: lz?.success_rate ?? 100,
      },
      speech_coach: {
        avg_ms: coach?.avg_first_sound_ms ?? 0,
        p95_ms: coach?.p95_first_sound_ms ?? 0,
        success_pct: coach?.success_rate ?? 100,
      },
      parent_hub: {
        avg_ms: hub?.avg_first_sound_ms ?? 0,
        success_pct: hub?.success_rate ?? 100,
      },
    },
  };
}

function recordLatency(module: AudioReliabilityModule, ms: number): void {
  const samples = latencySamples.get(module) ?? [];
  samples.push(ms);
  while (samples.length > MAX_LATENCY_SAMPLES) samples.shift();
  latencySamples.set(module, samples);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

function pushEvent(record: AudioReliabilityRecord): void {
  events.push(record);
  while (events.length > MAX_EVENTS) events.shift();

  const c = getCounters(record.module);
  switch (record.event) {
    case "audio_requested":
      c.requested += 1;
      break;
    case "audio_play_started":
      c.playStarted += 1;
      if (record.latencyToFirstSoundMs != null) {
        recordLatency(record.module, record.latencyToFirstSoundMs);
      }
      break;
    case "audio_play_failed":
      c.playFailed += 1;
      break;
    case "audio_timeout":
      c.timeouts += 1;
      break;
    case "audio_cancelled":
      c.cancelled += 1;
      break;
    case "audio_recovered":
      c.recovered += 1;
      break;
    case "audio_cache_hit":
      c.cacheHits += 1;
      break;
    case "audio_cache_miss":
      c.cacheMisses += 1;
      break;
    default:
      break;
  }

  if (import.meta.env.DEV || record.event === "audio_play_failed" || record.event === "audio_timeout") {
    console.info("[AudioReliability]", record);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("amynest-audio-reliability", { detail: record }));
  }
}

/** Begin tracking a playback request — returns audio_trace_id. */
export function trackAudioRequest(params: {
  module: AudioReliabilityModule;
  audioIdentity?: string;
  sourceLayer?: AudioSourceLayer;
}): string {
  const traceId = createTraceId();
  const trace: AudioTrace = {
    audio_trace_id: traceId,
    module: params.module,
    audioIdentity: params.audioIdentity,
    steps: [{ step: "REQUESTED", ts: Date.now() }],
    failed: false,
    platform: getPlatform(),
    startedAt: performance.now(),
  };
  traces.set(traceId, trace);
  while (traces.size > MAX_TRACES) {
    const first = traces.keys().next().value;
    if (first) traces.delete(first);
  }

  activeRequests.set(traceId, {
    module: params.module,
    audioIdentity: params.audioIdentity,
    requestedAt: performance.now(),
    sourceLayer: params.sourceLayer,
    traceId,
  });

  pushEvent({
    event: "audio_requested",
    module: params.module,
    audioIdentity: params.audioIdentity,
    audio_trace_id: traceId,
    sourceLayer: params.sourceLayer,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
  return traceId;
}

export function trackAudioCacheHit(
  requestId: string,
  sourceLayer: AudioSourceLayer = "LOCAL_CACHE",
): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  active.sourceLayer = sourceLayer;
  traceAudioStep(requestId, "CACHE_LOOKUP");
  traceAudioStep(requestId, "CACHE_HIT", sourceLayer);
  pushEvent({
    event: "audio_cache_hit",
    module: active.module,
    audioIdentity: active.audioIdentity,
    audio_trace_id: requestId,
    sourceLayer,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioCacheMiss(requestId: string): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  traceAudioStep(requestId, "CACHE_LOOKUP");
  traceAudioStep(requestId, "CACHE_MISS");
  pushEvent({
    event: "audio_cache_miss",
    module: active.module,
    audioIdentity: active.audioIdentity,
    audio_trace_id: requestId,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioDownloadStarted(requestId: string): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  traceAudioStep(requestId, "DOWNLOAD_START");
  pushEvent({
    event: "audio_download_started",
    module: active.module,
    audioIdentity: active.audioIdentity,
    audio_trace_id: requestId,
    sourceLayer: active.sourceLayer,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioDownloadComplete(requestId: string): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  traceAudioStep(requestId, "DOWNLOAD_END");
  pushEvent({
    event: "audio_download_complete",
    module: active.module,
    audioIdentity: active.audioIdentity,
    audio_trace_id: requestId,
    sourceLayer: active.sourceLayer,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioPlayStarted(
  requestId: string,
  sourceLayer: AudioSourceLayer,
): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  active.sourceLayer = sourceLayer;
  const latency = Math.max(0, Math.round(performance.now() - active.requestedAt));
  traceAudioStep(requestId, "PLAY_START", sourceLayer);
  pushEvent({
    event: "audio_play_started",
    module: active.module,
    audioIdentity: active.audioIdentity,
    audio_trace_id: requestId,
    sourceLayer,
    latencyToFirstSoundMs: latency,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
  const trace = traces.get(requestId);
  if (trace) trace.steps.push({ step: "PLAY_END", ts: Date.now(), detail: "started" });
}

export function trackAudioPlayFailed(
  requestId: string,
  error: string,
  sourceLayer?: AudioSourceLayer,
  opts?: { lifecycleInterrupt?: boolean; hadCacheLookup?: boolean },
): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  const reason = classifyAudioFailureReason(error, opts);
  markTraceFailed(requestId, error, reason);
  activeRequests.delete(requestId);
}

export function trackAudioTimeout(
  requestId: string,
  error = "audio_start_timeout",
  elementSnapshot?: AudioReliabilityRecord["elementSnapshot"],
): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  pushEvent({
    event: "audio_timeout",
    module: active.module,
    audioIdentity: active.audioIdentity,
    sourceLayer: active.sourceLayer,
    error,
    elementSnapshot,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioCancelled(requestId: string): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  pushEvent({
    event: "audio_cancelled",
    module: active.module,
    audioIdentity: active.audioIdentity,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
  activeRequests.delete(requestId);
}

export function trackAudioRecovered(
  requestId: string,
  from: AudioSourceLayer,
  to: AudioSourceLayer,
): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  active.sourceLayer = to;
  pushEvent({
    event: "audio_recovered",
    module: active.module,
    audioIdentity: active.audioIdentity,
    sourceLayer: to,
    recoveredFrom: from,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
}

export function trackAudioCompleted(requestId: string): void {
  const active = activeRequests.get(requestId);
  if (!active) return;
  pushEvent({
    event: "audio_completed",
    module: active.module,
    audioIdentity: active.audioIdentity,
    sourceLayer: active.sourceLayer,
    device: getDeviceLabel(),
    platform: getPlatform(),
    ts: Date.now(),
    sessionId,
  });
  activeRequests.delete(requestId);
}

export function finishAudioRequest(requestId: string): void {
  activeRequests.delete(requestId);
}

export function getAudioReliabilityDashboard(): AudioModuleDashboard[] {
  const modules: AudioReliabilityModule[] = [
    "speech_coach",
    "phonics",
    "blending",
    "reading",
    "parent_hub",
    "lesson",
    "other",
  ];
  return modules.map((module) => {
    const c = counters.get(module) ?? emptyCounters();
    const samples = latencySamples.get(module) ?? [];
    const resolved = c.playStarted + c.playFailed + c.timeouts;
    const successRate =
      c.requested === 0 ? 1 : resolved === 0 ? 0 : c.playStarted / Math.max(1, resolved);
    const avgLatencyMs =
      samples.length === 0
        ? 0
        : Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    return {
      module,
      ...c,
      successRate: Math.round(successRate * 10_000) / 100,
      avgLatencyMs,
      p95LatencyMs: percentile(samples, 95),
    };
  });
}

export function getAudioReliabilityEvents(limit = 50): AudioReliabilityRecord[] {
  return events.slice(-limit);
}

export function resetAudioReliabilityTelemetry(forTests = false): void {
  events.length = 0;
  counters.clear();
  latencySamples.clear();
  activeRequests.clear();
  traces.clear();
  failedTraces.length = 0;
  failureReasonCounts.clear();
  lifecycleInterruptCounts.clear();
  coachCacheStats.hits = 0;
  coachCacheStats.misses = 0;
  coachCacheStats.regenerated.clear();
  requestSeq = 0;
  if (forTests) sessionId = createSessionId();
}

declare global {
  interface Window {
    __amynestAudioReliability?: {
      dashboard: () => AudioModuleDashboard[];
      events: () => AudioReliabilityRecord[];
      failures: () => AudioFailureDashboardRow[];
      topCauses: () => AudioRootCauseRow[];
      rootCauseReport: () => ReturnType<typeof getRootCauseReport>;
      failedTraces: () => AudioTrace[];
      replayTrace: (traceId: string) => AudioTrace | null;
      deviceMatrixReport: () => ReturnType<typeof getDeviceMatrixReport>;
      deviceMatrixTemplate: () => ReturnType<typeof exportDeviceMatrixTemplate>;
      speechCoachCache: () => { hitRate: number; topRegenerated: ReturnType<typeof getSpeechCoachTopRegenerated> };
      latencyReport: () => ReturnType<typeof getLatencyReport>;
      reset: () => void;
    };
  }
}

/** Dev / production diagnostics — `window.__amynestAudioReliability.rootCauseReport()` */
export function installAudioReliabilityDevTools(): void {
  if (typeof window === "undefined") return;
  window.__amynestAudioReliability = {
    dashboard: getAudioReliabilityDashboard,
    events: () => getAudioReliabilityEvents(100),
    failures: getFailureDashboard,
    topCauses: () => getTopFailureCauses(5),
    rootCauseReport: getRootCauseReport,
    failedTraces: () => getFailedTraces(20),
    replayTrace: replayFailedTrace,
    deviceMatrixReport: getDeviceMatrixReport,
    deviceMatrixTemplate: exportDeviceMatrixTemplate,
    speechCoachCache: () => ({
      hitRate: getSpeechCoachCacheHitRate(),
      topRegenerated: getSpeechCoachTopRegenerated(10),
    }),
    latencyReport: getLatencyReport,
    reset: () => resetAudioReliabilityTelemetry(true),
  };
}
