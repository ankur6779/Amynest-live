/**
 * Playback quality audit telemetry — temporary diagnostics for child-quality investigation.
 * Enable: localStorage PLAYBACK_QUALITY_AUDIT=1 or ?playbackQuality=1
 *
 * Events: audio_requested | audio_loaded | audio_started | audio_completed |
 * audio_failed | audio_interrupted | audio_overlap_detected | audio_duplicate_detected
 */

export type PlaybackQualityEvent =
  | "audio_requested"
  | "audio_loaded"
  | "audio_started"
  | "audio_completed"
  | "audio_failed"
  | "audio_interrupted"
  | "audio_overlap_detected"
  | "audio_duplicate_detected";

export type PlaybackQualityPayload = {
  evt: PlaybackQualityEvent;
  ts: number;
  sessionId: string;
  owner: string;
  assetRequested?: string;
  assetResolved?: string;
  assetUrl?: string;
  durationSec?: number;
  playbackStartTs?: number;
  firstSampleTs?: number;
  playbackEndTs?: number;
  interruptionReason?: string;
  stopReason?: string;
  tapToStartMs?: number;
  duplicateWithinMs?: number;
  overlapWithSession?: string;
  extra?: Record<string, unknown>;
};

let auditEnabled: boolean | null = null;
let sessionCounter = 0;
let activeSession: {
  sessionId: string;
  owner: string;
  assetRequested: string;
  requestedAt: number;
  startedAt?: number;
} | null = null;

const recentRequests: Array<{ key: string; at: number; sessionId: string }> = [];
const DUPLICATE_WINDOW_MS = 400;
const eventLog: PlaybackQualityPayload[] = [];
const MAX_LOG = 200;

export function isPlaybackQualityAuditEnabled(): boolean {
  if (auditEnabled !== null) return auditEnabled;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("PLAYBACK_QUALITY_AUDIT") === "1") return true;
    if (new URLSearchParams(window.location.search).has("playbackQuality")) return true;
  } catch {
    /* ignore */
  }
  auditEnabled = false;
  return false;
}

function nextSessionId(): string {
  sessionCounter += 1;
  return `pq-${Date.now()}-${sessionCounter}`;
}

function requestKey(owner: string, asset: string): string {
  return `${owner}::${asset}`;
}

function pushEvent(payload: PlaybackQualityPayload): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  eventLog.push(payload);
  if (eventLog.length > MAX_LOG) eventLog.shift();
  console.warn("[PLAYBACK_QUALITY]", payload);
  try {
    (window as unknown as { __PLAYBACK_QUALITY_LOG__?: PlaybackQualityPayload[] }).__PLAYBACK_QUALITY_LOG__ =
      eventLog;
    (window as unknown as { __PLAYBACK_QUALITY_LAST__?: PlaybackQualityPayload }).__PLAYBACK_QUALITY_LAST__ =
      payload;
  } catch {
    /* ignore */
  }
}

/** Call at tap / speak entry before async work. */
export function recordPlaybackQualityRequested(opts: {
  owner: string;
  assetRequested: string;
  assetResolved?: string;
  assetUrl?: string;
  tapTimestamp?: number;
  extra?: Record<string, unknown>;
}): string {
  const sessionId = nextSessionId();
  if (!isPlaybackQualityAuditEnabled()) return sessionId;

  const key = requestKey(opts.owner, opts.assetRequested);
  const now = performance.now();
  const dup = recentRequests.find(
    (r) => r.key === key && now - r.at < DUPLICATE_WINDOW_MS,
  );
  if (dup) {
    pushEvent({
      evt: "audio_duplicate_detected",
      ts: Date.now(),
      sessionId,
      owner: opts.owner,
      assetRequested: opts.assetRequested,
      assetResolved: opts.assetResolved,
      assetUrl: opts.assetUrl?.slice(0, 160),
      duplicateWithinMs: Math.round(now - dup.at),
      overlapWithSession: dup.sessionId,
      extra: opts.extra,
    });
  }
  recentRequests.push({ key, at: now, sessionId });
  while (recentRequests.length > 20) recentRequests.shift();

  if (activeSession && activeSession.sessionId !== sessionId) {
    pushEvent({
      evt: "audio_overlap_detected",
      ts: Date.now(),
      sessionId,
      owner: opts.owner,
      assetRequested: opts.assetRequested,
      overlapWithSession: activeSession.sessionId,
      interruptionReason: "new_request_while_active",
      extra: {
        priorOwner: activeSession.owner,
        priorAsset: activeSession.assetRequested,
        ...opts.extra,
      },
    });
  }

  activeSession = {
    sessionId,
    owner: opts.owner,
    assetRequested: opts.assetRequested,
    requestedAt: now,
  };

  pushEvent({
    evt: "audio_requested",
    ts: Date.now(),
    sessionId,
    owner: opts.owner,
    assetRequested: opts.assetRequested,
    assetResolved: opts.assetResolved,
    assetUrl: opts.assetUrl?.slice(0, 160),
    tapToStartMs: opts.tapTimestamp != null ? Math.round(now - opts.tapTimestamp) : undefined,
    extra: opts.extra,
  });

  return sessionId;
}

export function recordPlaybackQualityLoaded(
  sessionId: string,
  opts: { durationSec?: number; assetUrl?: string },
): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  pushEvent({
    evt: "audio_loaded",
    ts: Date.now(),
    sessionId,
    owner: activeSession?.sessionId === sessionId ? activeSession.owner : "unknown",
    durationSec: opts.durationSec,
    assetUrl: opts.assetUrl?.slice(0, 160),
  });
}

export function recordPlaybackQualityStarted(
  sessionId: string,
  opts?: { firstSampleTs?: number; durationSec?: number },
): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  const now = performance.now();
  if (activeSession?.sessionId === sessionId) {
    activeSession.startedAt = now;
  }
  pushEvent({
    evt: "audio_started",
    ts: Date.now(),
    sessionId,
    owner: activeSession?.owner ?? "unknown",
    playbackStartTs: now,
    firstSampleTs: opts?.firstSampleTs,
    durationSec: opts?.durationSec,
    tapToStartMs:
      activeSession?.sessionId === sessionId
        ? Math.round(now - activeSession.requestedAt)
        : undefined,
  });
}

export function recordPlaybackQualityCompleted(
  sessionId: string,
  opts?: { stopReason?: string },
): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  const now = performance.now();
  pushEvent({
    evt: "audio_completed",
    ts: Date.now(),
    sessionId,
    owner: activeSession?.owner ?? "unknown",
    playbackEndTs: now,
    stopReason: opts?.stopReason ?? "natural_end",
  });
  if (activeSession?.sessionId === sessionId) activeSession = null;
}

export function recordPlaybackQualityFailed(
  sessionId: string,
  opts: { reason: string; stopReason?: string },
): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  pushEvent({
    evt: "audio_failed",
    ts: Date.now(),
    sessionId,
    owner: activeSession?.owner ?? "unknown",
    interruptionReason: opts.reason,
    stopReason: opts.stopReason ?? "failed",
    playbackEndTs: performance.now(),
  });
  if (activeSession?.sessionId === sessionId) activeSession = null;
}

export function recordPlaybackQualityInterrupted(
  sessionId: string | null,
  opts: { reason: string; owner?: string },
): void {
  if (!isPlaybackQualityAuditEnabled()) return;
  pushEvent({
    evt: "audio_interrupted",
    ts: Date.now(),
    sessionId: sessionId ?? activeSession?.sessionId ?? "unknown",
    owner: opts.owner ?? activeSession?.owner ?? "unknown",
    interruptionReason: opts.reason,
    stopReason: opts.reason,
    playbackEndTs: performance.now(),
  });
  if (!sessionId || activeSession?.sessionId === sessionId) activeSession = null;
}

export function getPlaybackQualityEventLog(): readonly PlaybackQualityPayload[] {
  return eventLog;
}

/** Tap→start latencies from audio_started events (ms). Enable audit mode first. */
export function getPlaybackQualityTapLatencyReport(): {
  count: number;
  p50: number | null;
  p95: number | null;
  worst: number | null;
} {
  const samples = eventLog
    .filter((e) => e.evt === "audio_started" && e.tapToStartMs != null)
    .map((e) => e.tapToStartMs!)
    .sort((a, b) => a - b);
  if (samples.length === 0) {
    return { count: 0, p50: null, p95: null, worst: null };
  }
  const p50 = samples[Math.floor(samples.length * 0.5)] ?? null;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? null;
  return {
    count: samples.length,
    p50,
    p95,
    worst: samples[samples.length - 1] ?? null,
  };
}

if (typeof window !== "undefined") {
  try {
    (window as unknown as { __PLAYBACK_QUALITY_LATENCY__?: typeof getPlaybackQualityTapLatencyReport }).__PLAYBACK_QUALITY_LATENCY__ =
      getPlaybackQualityTapLatencyReport;
  } catch {
    /* ignore */
  }
}
