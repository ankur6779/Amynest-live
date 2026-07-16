/**
 * Lesson / static audio pipeline diagnostics — production-safe, feature-flagged.
 *
 * Enable at runtime (Android WebView):
 *   localStorage.setItem('DEBUG_AUDIO_PIPELINE', 'true')
 * Or URL: ?DEBUG_AUDIO_PIPELINE=true
 * Or build: VITE_DEBUG_AUDIO_PIPELINE=true
 */

import { snapshotAudibleElement } from "@/lib/audible-start-diagnostic";
import { audioManager } from "@/lib/audio-manager";
import { isStaticAudioMapReady } from "@/lib/static-audio";

export type LessonPlaybackMachineState =
  | "idle"
  | "playing"
  | "speak_start"
  | "static_lookup"
  | "static_play"
  | "audible_start"
  | "wait_until_end"
  | "handle_result"
  | "advance"
  | "error"
  | "cancelled";

export type AudioPipelineEvent = {
  ts: number;
  event: string;
  state?: LessonPlaybackMachineState;
  nextState?: LessonPlaybackMachineState;
  paragraphIdx?: number;
  lessonId?: string;
  audioUrl?: string | null;
  detail?: Record<string, unknown>;
  stack?: string;
};

export type AudioPipelineSnapshot = {
  stateMachine: LessonPlaybackMachineState;
  paragraphIdx: number | null;
  lessonId: string | null;
  intent: "idle" | "playing" | null;
  playbackError: string | null;
  audioUrl: string | null;
  mapReady: boolean;
  watchdogStatus: string | null;
  lastError: string | null;
  element: ReturnType<typeof snapshotAudibleElement>;
  updatedAt: number;
};

const MAX_EVENTS = 80;

let machineState: LessonPlaybackMachineState = "idle";
let paragraphIdx: number | null = null;
let lessonId: string | null = null;
let intent: "idle" | "playing" | null = null;
let playbackError: string | null = null;
let audioUrl: string | null = null;
let watchdogStatus: string | null = null;
let events: AudioPipelineEvent[] = [];

const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* panel hook */
    }
  }
}

export function isDebugAudioPipelineEnabled(): boolean {
  if (import.meta.env.VITE_DEBUG_AUDIO_PIPELINE === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("DEBUG_AUDIO_PIPELINE") === "true") return true;
    const q = new URLSearchParams(window.location.search);
    if (q.get("DEBUG_AUDIO_PIPELINE") === "true") return true;
  } catch {
    /* private mode */
  }
  return false;
}

export function subscribeAudioPipelineDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAudioPipelineSnapshot(): AudioPipelineSnapshot {
  const el = audioManager.getCurrentElement();
  return {
    stateMachine: machineState,
    paragraphIdx,
    lessonId,
    intent,
    playbackError,
    audioUrl,
    mapReady: isStaticAudioMapReady(),
    watchdogStatus,
    lastError: audioManager.getLastPlayError(),
    element: snapshotAudibleElement(el),
    updatedAt: Date.now(),
  };
}

export function getAudioPipelineEvents(): readonly AudioPipelineEvent[] {
  return events;
}

export function setAudioPipelineContext(ctx: {
  paragraphIdx?: number;
  lessonId?: string;
  intent?: "idle" | "playing";
  playbackError?: string | null;
  audioUrl?: string | null;
}): void {
  if (!isDebugAudioPipelineEnabled()) return;
  if (ctx.paragraphIdx !== undefined) paragraphIdx = ctx.paragraphIdx;
  if (ctx.lessonId !== undefined) lessonId = ctx.lessonId;
  if (ctx.intent !== undefined) intent = ctx.intent;
  if (ctx.playbackError !== undefined) playbackError = ctx.playbackError;
  if (ctx.audioUrl !== undefined) audioUrl = ctx.audioUrl;
  notify();
}

export function setAudioPipelineMachineState(
  next: LessonPlaybackMachineState,
  detail?: Record<string, unknown>,
): void {
  if (!isDebugAudioPipelineEnabled()) return;
  const prev = machineState;
  machineState = next;
  logAudioPipeline("state_transition", {
    state: prev,
    nextState: next,
    detail,
  });
}

export function setAudioPipelineWatchdogStatus(status: string | null): void {
  if (!isDebugAudioPipelineEnabled()) return;
  watchdogStatus = status;
  logAudioPipeline("watchdog", { detail: { status } });
}

export function logAudioPipeline(
  event: string,
  opts: {
    state?: LessonPlaybackMachineState;
    nextState?: LessonPlaybackMachineState;
    paragraphIdx?: number;
    lessonId?: string;
    audioUrl?: string | null;
    detail?: Record<string, unknown>;
    trace?: boolean;
  } = {},
): void {
  if (!isDebugAudioPipelineEnabled()) return;

  const entry: AudioPipelineEvent = {
    ts: Date.now(),
    event,
    state: opts.state ?? machineState,
    nextState: opts.nextState,
    paragraphIdx: opts.paragraphIdx ?? paragraphIdx ?? undefined,
    lessonId: opts.lessonId ?? lessonId ?? undefined,
    audioUrl: opts.audioUrl ?? audioUrl,
    detail: opts.detail,
    stack: opts.trace ? new Error().stack?.split("\n").slice(2, 8).join("\n") : undefined,
  };

  events = [...events.slice(-(MAX_EVENTS - 1)), entry];
  console.info("[DEBUG_AUDIO_PIPELINE]", event, {
    ...entry,
    mapReady: isStaticAudioMapReady(),
    lastPlayError: audioManager.getLastPlayError(),
  });
  notify();
}

/** Attach playing/ended/error listeners for one HTMLAudioElement session. */
export function attachAudioPipelineElementListeners(
  audio: HTMLAudioElement,
  label: string,
): () => void {
  if (!isDebugAudioPipelineEnabled()) return () => {};

  const on = (name: string) => () => {
    logAudioPipeline(`audio_${name}`, {
      detail: {
        label,
        ...snapshotAudibleElement(audio),
      },
    });
  };

  const handlers: Array<[string, () => void]> = [
    ["play_called", on("play_called")],
    ["playing", on("playing")],
    ["ended", on("ended")],
    ["error", on("error")],
    ["pause", on("pause")],
    ["waiting", on("waiting")],
    ["canplay", on("canplay")],
  ];

  for (const [ev, fn] of handlers) {
    audio.addEventListener(ev, fn);
  }

  return () => {
    for (const [ev, fn] of handlers) {
      audio.removeEventListener(ev, fn);
    }
  };
}

export function resetAudioPipelineDebugForTests(): void {
  machineState = "idle";
  paragraphIdx = null;
  lessonId = null;
  intent = null;
  playbackError = null;
  audioUrl = null;
  watchdogStatus = null;
  events = [];
}
