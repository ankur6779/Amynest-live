/**
 * Single playback trace — one TRACE_ID per request, grouped console output.
 * Enable: localStorage PLAYBACK_TRACE=1 or AUDIO_ROOT_CAUSE_TRACE=1 or ?playbackTrace=1
 */

export type PlaybackTraceOwner =
  | "AudioManager"
  | "AmyVoicePipeline"
  | "AmyVoiceController"
  | "SpeechCoach"
  | "Abacus"
  | "Phonics"
  | "Spelling";

export type PlaybackTraceTouch = {
  component: string;
  action: string;
  atMs: number;
};

export type PlaybackTraceEvent = {
  atMs: number;
  event: string;
  component: string;
  detail?: string;
  snapshot?: PlaybackElementSnapshot;
};

export type PlaybackElementSnapshot = {
  elementId: string;
  readyState: number;
  networkState: number;
  paused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
};

type TraceSession = {
  traceId: string;
  owner: PlaybackTraceOwner;
  requestedUrl: string;
  phrase?: string;
  startedAt: number;
  elementId: string | null;
  events: PlaybackTraceEvent[];
  lastTouch: PlaybackTraceTouch | null;
  autoFlush: boolean;
  flushed: boolean;
  timeupdateCount: number;
  listenersAttached: boolean;
};

let traceSeq = 0;
let elementSeq = 0;

const sessions = new Map<string, TraceSession>();
const elementToTrace = new WeakMap<HTMLAudioElement, string>();
const elementIds = new WeakMap<HTMLAudioElement, string>();
const traceCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function isPlaybackTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("PLAYBACK_TRACE") === "1") return true;
    if (localStorage.getItem("AUDIO_ROOT_CAUSE_TRACE") === "1") return true;
    const q = new URLSearchParams(window.location.search);
    if (q.has("playbackTrace") || q.has("audioTrace")) return true;
  } catch {
    /* private mode */
  }
  return false;
}

/** Map legacy module labels to trace owner. */
export function playbackTraceOwnerFromModule(
  module: string | null | undefined,
  fallback: PlaybackTraceOwner = "AmyVoiceController",
): PlaybackTraceOwner {
  switch (module) {
    case "Phonics":
      return "Phonics";
    case "Spelling":
      return "Spelling";
    case "Speech Coach":
      return "SpeechCoach";
    case "Abacus":
      return "Abacus";
    default:
      return fallback;
  }
}

export function getPlaybackElementId(audio: HTMLAudioElement): string {
  let id = elementIds.get(audio);
  if (!id) {
    elementSeq += 1;
    id = `el-${elementSeq}`;
    elementIds.set(audio, id);
  }
  return id;
}

export function snapshotPlaybackElement(
  audio: HTMLAudioElement | null | undefined,
): PlaybackElementSnapshot | undefined {
  if (!audio) return undefined;
  return {
    elementId: getPlaybackElementId(audio),
    readyState: audio.readyState,
    networkState: audio.networkState,
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration: audio.duration,
    muted: audio.muted,
    volume: audio.volume,
  };
}

function truncateUrl(url: string, max = 200): string {
  const t = (url ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function scheduleSessionCleanup(traceId: string): void {
  const prev = traceCleanupTimers.get(traceId);
  if (prev) clearTimeout(prev);
  traceCleanupTimers.set(
    traceId,
    setTimeout(() => {
      sessions.delete(traceId);
      traceCleanupTimers.delete(traceId);
    }, 60_000),
  );
}

/**
 * Start a new playback trace (or continue an existing TRACE_ID).
 * Set autoFlush=false when a parent entry point will call flushPlaybackTrace.
 */
export function beginPlaybackTrace(opts: {
  owner: PlaybackTraceOwner;
  requestedUrl: string;
  phrase?: string;
  audio?: HTMLAudioElement | null;
  existingTraceId?: string;
  autoFlush?: boolean;
}): string {
  if (!isPlaybackTraceEnabled()) return opts.existingTraceId ?? "";

  if (opts.existingTraceId && sessions.has(opts.existingTraceId)) {
    const session = sessions.get(opts.existingTraceId)!;
    playbackTraceStep(opts.existingTraceId, "REQUEST_CONTINUE", opts.owner, {
      detail: opts.phrase?.slice(0, 80),
      audio: opts.audio ?? undefined,
    });
    if (opts.audio) playbackTraceAttach(opts.existingTraceId, opts.audio, opts.owner);
    return opts.existingTraceId;
  }

  traceSeq += 1;
  const traceId = `pt-${Date.now()}-${traceSeq}`;
  const session: TraceSession = {
    traceId,
    owner: opts.owner,
    requestedUrl: truncateUrl(opts.requestedUrl),
    phrase: opts.phrase?.slice(0, 120),
    startedAt: performance.now(),
    elementId: opts.audio ? getPlaybackElementId(opts.audio) : null,
    events: [],
    lastTouch: { component: opts.owner, action: "begin", atMs: 0 },
    autoFlush: opts.autoFlush ?? true,
    flushed: false,
    timeupdateCount: 0,
    listenersAttached: false,
  };
  sessions.set(traceId, session);

  playbackTraceStep(traceId, "REQUEST", opts.owner, {
    detail: opts.phrase ? `phrase=${JSON.stringify(opts.phrase.slice(0, 80))}` : undefined,
    audio: opts.audio ?? undefined,
  });

  if (opts.audio) {
    playbackTraceAttach(traceId, opts.audio, opts.owner);
  }

  return traceId;
}

export function getPlaybackTraceId(audio: HTMLAudioElement | null | undefined): string | null {
  if (!audio) return null;
  return elementToTrace.get(audio) ?? null;
}

export function playbackTraceTouch(
  traceId: string | null | undefined,
  component: string,
  action: string,
): void {
  if (!traceId || !isPlaybackTraceEnabled()) return;
  const session = sessions.get(traceId);
  if (!session || session.flushed) return;
  session.lastTouch = {
    component,
    action,
    atMs: Math.round(performance.now() - session.startedAt),
  };
}

export function playbackTraceStep(
  traceId: string | null | undefined,
  event: string,
  component: string,
  opts?: {
    detail?: string;
    audio?: HTMLAudioElement | null;
    error?: unknown;
  },
): void {
  if (!traceId || !isPlaybackTraceEnabled()) return;
  const session = sessions.get(traceId);
  if (!session || session.flushed) return;

  const snap = snapshotPlaybackElement(opts?.audio ?? undefined);
  if (snap) session.elementId = snap.elementId;

  let detail = opts?.detail;
  if (opts?.error !== undefined) {
    const err =
      opts.error instanceof Error
        ? `${opts.error.name}: ${opts.error.message}`
        : String(opts.error);
    detail = detail ? `${detail} | ${err}` : err;
  }

  session.events.push({
    atMs: Math.round(performance.now() - session.startedAt),
    event,
    component,
    detail,
    snapshot: snap,
  });

  playbackTraceTouch(traceId, component, event);
}

export function playbackTracePlayCalled(
  traceId: string | null | undefined,
  component: string,
  audio?: HTMLAudioElement | null,
): void {
  playbackTraceStep(traceId, "play() called", component, { audio: audio ?? undefined });
}

export function playbackTracePlaySettled(
  traceId: string | null | undefined,
  component: string,
  ok: boolean,
  audio?: HTMLAudioElement | null,
  error?: unknown,
): void {
  playbackTraceStep(traceId, ok ? "play() resolved" : "play() rejected", component, {
    audio: audio ?? undefined,
    error: ok ? undefined : error,
    detail: ok ? undefined : "play_failed",
  });
}

/** Attach media element listeners for loadstart / playing / ended / etc. */
export function playbackTraceAttach(
  traceId: string | null | undefined,
  audio: HTMLAudioElement,
  component: string,
): void {
  if (!traceId || !isPlaybackTraceEnabled()) return;
  const session = sessions.get(traceId);
  if (!session || session.flushed) return;

  elementToTrace.set(audio, traceId);
  session.elementId = getPlaybackElementId(audio);

  if (session.listenersAttached) return;
  session.listenersAttached = true;

  const onMedia = (eventName: string) => () => {
    const s = sessions.get(traceId);
    if (!s || s.flushed) return;
    if (eventName === "timeupdate") {
      s.timeupdateCount += 1;
      if (s.timeupdateCount > 1 && s.timeupdateCount % 4 !== 0) return;
    }
    playbackTraceStep(traceId, eventName, "HTMLAudioElement", { audio });
  };

  const events = [
    "loadstart",
    "canplay",
    "canplaythrough",
    "playing",
    "timeupdate",
    "ended",
    "error",
    "pause",
    "emptied",
  ] as const;

  for (const name of events) {
    audio.addEventListener(name, onMedia(name));
  }
}

export function tracePlaybackStop(
  traceId: string | null | undefined,
  component: string,
  reason?: string,
  audio?: HTMLAudioElement | null,
): void {
  playbackTraceStep(traceId, "stop()", component, {
    audio: audio ?? undefined,
    detail: reason,
  });
}

export function tracePlaybackDestroy(
  traceId: string | null | undefined,
  component: string,
  reason?: string,
  audio?: HTMLAudioElement | null,
): void {
  playbackTraceStep(traceId, "destroy()", component, {
    audio: audio ?? undefined,
    detail: reason,
  });
  if (audio) elementToTrace.delete(audio);
}

export function tracePlaybackStopAll(component: string, reason?: string): void {
  if (!isPlaybackTraceEnabled()) return;
  for (const [traceId, session] of sessions) {
    if (session.flushed) continue;
    playbackTraceStep(traceId, "stopAll()", component, { detail: reason });
  }
}

function formatSnapshotLine(snap: PlaybackElementSnapshot | undefined): string {
  if (!snap) return "";
  return [
    `elementId=${snap.elementId}`,
    `readyState=${snap.readyState}`,
    `networkState=${snap.networkState}`,
    `paused=${snap.paused}`,
    `currentTime=${snap.currentTime.toFixed(3)}`,
    `duration=${Number.isFinite(snap.duration) ? snap.duration.toFixed(3) : "NaN"}`,
    `volume=${snap.volume}`,
    `muted=${snap.muted}`,
  ].join(" ");
}

function collapseEventsForDisplay(events: PlaybackTraceEvent[]): string[] {
  const lines: string[] = [];
  let tuRun = 0;
  let tuLast: PlaybackTraceEvent | null = null;

  const flushTu = () => {
    if (tuRun === 0) return;
    if (tuRun === 1 && tuLast) {
      lines.push(formatEventLine(tuLast));
    } else if (tuLast) {
      lines.push(
        `+${tuLast.atMs}ms  timeupdate x${tuRun}  ${formatSnapshotLine(tuLast.snapshot)}`,
      );
    }
    tuRun = 0;
    tuLast = null;
  };

  for (const ev of events) {
    if (ev.event === "timeupdate") {
      tuRun += 1;
      tuLast = ev;
      continue;
    }
    flushTu();
    lines.push(formatEventLine(ev));
  }
  flushTu();
  return lines;
}

function formatEventLine(ev: PlaybackTraceEvent): string {
  const snap = ev.snapshot ? formatSnapshotLine(ev.snapshot) : "";
  const parts = [`+${ev.atMs}ms`, ev.event, `[${ev.component}]`];
  if (ev.detail) parts.push(ev.detail);
  if (snap) parts.push(snap);
  return parts.join("  ");
}

/** Emit one grouped console trace for this playback request. */
export function flushPlaybackTrace(
  traceId: string | null | undefined,
  endReason = "complete",
): void {
  if (!traceId || !isPlaybackTraceEnabled()) return;
  const session = sessions.get(traceId);
  if (!session || session.flushed) return;

  session.flushed = true;
  const lines: string[] = [
    "══════════════════════════════════════════════════════════",
    `[PLAYBACK_TRACE] TRACE_ID=${session.traceId}`,
    `owner=${session.owner}`,
    `requestedUrl=${JSON.stringify(session.requestedUrl)}`,
    session.phrase ? `phrase=${JSON.stringify(session.phrase)}` : "",
    session.elementId ? `audioElementId=${session.elementId}` : "audioElementId=(none)",
    session.lastTouch
      ? `lastTouch=${session.lastTouch.component}:${session.lastTouch.action} @+${session.lastTouch.atMs}ms`
      : "lastTouch=(none)",
    "── events ──",
    ...collapseEventsForDisplay(session.events),
    `── END (${endReason}) ──`,
    "══════════════════════════════════════════════════════════",
  ].filter(Boolean);

  const block = lines.join("\n");
  console.warn(block);
  try {
    (window as unknown as { __PLAYBACK_TRACE_LAST__?: string }).__PLAYBACK_TRACE_LAST__ =
      block;
  } catch {
    /* ignore */
  }

  scheduleSessionCleanup(traceId);
}

/** Flush trace if this session owns autoFlush. */
export function maybeFlushPlaybackTrace(
  traceId: string | null | undefined,
  endReason: string,
): void {
  if (!traceId) return;
  const session = sessions.get(traceId);
  if (!session?.autoFlush || session.flushed) return;
  flushPlaybackTrace(traceId, endReason);
}
