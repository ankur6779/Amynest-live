/**
 * Amy voice playback contract — streaming-first with safe completion for lessons.
 *
 * RULE:
 * - Default playback is partial-ok (streaming-first)
 * - full-required ONLY for lesson paragraphs and explicit waitUntilEnd
 */

import { audioManager } from "@/lib/audio-manager";

export type PlaybackMode = "partial-ok" | "full-required";

/** Minimal speak opts used to resolve mode (mirrors controller SpeakOptions flags). */
export type PlaybackModeInput = {
  playbackMode?: PlaybackMode;
  lessonParagraph?: boolean;
  parentHub?: boolean;
  narration?: boolean;
  waitUntilEnd?: boolean;
  mode?: "default" | "phonics";
};

export type EarlyCompletionLog = {
  errorType: "early_completion";
  mode: PlaybackMode;
  playedDuration: number;
  expectedDuration: number;
  usedStreaming?: boolean;
};

export type SafeCompletionInput = {
  mode: PlaybackMode;
  actualPlayedDuration: number;
  expectedDuration: number;
};

export type SafeCompletionResult = {
  ok: boolean;
  actualPlayedDuration: number;
  expectedDuration: number;
  earlyCompletion: boolean;
};

export type PlaybackCompletionDebugLog = {
  paragraphIdx?: number;
  duration: number;
  currentTime: number;
  trigger: "timer" | "ended" | "manual" | "failsafe";
};

const FULL_PLAYBACK_RATIO = 0.98;
const EARLY_END_IGNORE_RATIO = 0.95;
const FAILSAFE_MULTIPLIER = 1.5;
const STREAM_POLL_MS = 80;
const STREAM_STALL_MS = 400;

/** Streaming-first default — full audio only for lessons / explicit waitUntilEnd. */
export function resolvePlaybackMode(opts?: PlaybackModeInput): PlaybackMode {
  if (opts?.playbackMode) return opts.playbackMode;
  if (opts?.waitUntilEnd || opts?.lessonParagraph) return "full-required";
  return "partial-ok";
}

/** Streaming allowed for all modes — full-required completion is enforced separately. */
export function canUseStreaming(_mode: PlaybackMode): boolean {
  return true;
}

export function requiresFullPlayback(mode: PlaybackMode): boolean {
  return mode === "full-required";
}

/** Dev-only: streaming is allowed for all playback modes when using progressive MSE pipeline. */
export function assertStreamingAllowed(_mode: PlaybackMode, _streamingEnabled: boolean): void {
  /* no-op — progressive streaming is safe for full-required via MediaSource + completion polling */
}

export function getExpectedAudioDurationSec(audio: HTMLAudioElement): number {
  const d = audio.duration;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/** Single source of completion for full-required playback. */
export function isPlaybackComplete(currentTime: number, duration: number): boolean {
  if (duration <= 0) return false;
  return currentTime >= duration * FULL_PLAYBACK_RATIO;
}

/** Early browser "ended" events below this ratio are ignored. */
export function isEarlyEndedEvent(currentTime: number, duration: number): boolean {
  if (duration <= 0) return false;
  return currentTime < duration * EARLY_END_IGNORE_RATIO;
}

export function shouldTriggerCompletion(input: SafeCompletionInput): boolean {
  const { mode, actualPlayedDuration, expectedDuration } = input;
  if (mode === "full-required") {
    if (expectedDuration <= 0) {
      return actualPlayedDuration >= 0.25;
    }
    if (isPlaybackComplete(actualPlayedDuration, expectedDuration)) return true;
    // Complete static/cache files often end slightly below 98% when metadata
    // duration exceeds the encoded sample length — still a natural full play.
    return actualPlayedDuration >= expectedDuration * EARLY_END_IGNORE_RATIO;
  }
  return true;
}

export function logTtsEarlyCompletion(payload: EarlyCompletionLog): void {
  if (import.meta.env.DEV) {
    console.warn("[AmyVoiceTTS]", payload);
  }
}

export function logPlaybackCompletion(payload: PlaybackCompletionDebugLog): void {
  if (import.meta.env.DEV) {
    console.log("[AmyVoicePlayback]", payload);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveDurationSec(
  audio: HTMLAudioElement,
  knownDurationSec?: number,
): number {
  if (knownDurationSec != null && knownDurationSec > 0) return knownDurationSec;
  return getExpectedAudioDurationSec(audio);
}

/**
 * Full-required completion — duration polling only; onended is never trusted.
 */
async function waitForFullRequiredCompletion(
  audio: HTMLAudioElement,
  isCancelled: () => boolean,
  opts?: { paragraphIdx?: number; knownDurationSec?: number },
): Promise<SafeCompletionResult> {
  const duration = resolveDurationSec(audio, opts?.knownDurationSec);

  if (!duration || duration < 1) {
    if (import.meta.env.DEV) {
      console.warn("[AmyVoicePlayback] invalid duration — fallback to ended", {
        paragraphIdx: opts?.paragraphIdx,
        duration,
      });
    }
    const waitResult = await audioManager.waitUntilEnd(audio, isCancelled);
    const actualPlayedDuration = audio.currentTime;
    logPlaybackCompletion({
      paragraphIdx: opts?.paragraphIdx,
      duration,
      currentTime: actualPlayedDuration,
      trigger: "ended",
    });
    return {
      ok: waitResult.ok,
      actualPlayedDuration,
      expectedDuration: duration,
      earlyCompletion: false,
    };
  }

  const playStartMs = performance.now();
  const maxElapsedSec = duration * FAILSAFE_MULTIPLIER;
  let hasCompleted = false;

  const finalize = (
    trigger: PlaybackCompletionDebugLog["trigger"],
    ok: boolean,
    earlyCompletion: boolean,
  ): SafeCompletionResult => {
    if (hasCompleted) {
      return {
        ok: false,
        actualPlayedDuration: audio.currentTime,
        expectedDuration: duration,
        earlyCompletion: false,
      };
    }
    hasCompleted = true;
    const currentTime = audio.currentTime;
    logPlaybackCompletion({
      paragraphIdx: opts?.paragraphIdx,
      duration,
      currentTime,
      trigger,
    });
    return {
      ok,
      actualPlayedDuration: currentTime,
      expectedDuration: duration,
      earlyCompletion,
    };
  };

  while (true) {
    if (isCancelled()) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* best-effort stop on user pause */
      }
      return finalize("manual", false, false);
    }

    const currentTime = audio.currentTime;
    const elapsedSec = (performance.now() - playStartMs) / 1000;

    if (duration > 0 && isPlaybackComplete(currentTime, duration)) {
      return finalize("timer", true, false);
    }

    if (audio.ended && duration > 0) {
      if (isEarlyEndedEvent(currentTime, duration)) {
        logPlaybackCompletion({
          paragraphIdx: opts?.paragraphIdx,
          duration,
          currentTime,
          trigger: "ended",
        });
        if (import.meta.env.DEV) {
          console.warn("[AmyVoicePlayback] early-ended ignored", {
            paragraphIdx: opts?.paragraphIdx,
            duration,
            currentTime,
          });
        }
        try {
          void audio.play();
        } catch {
          /* resume best-effort */
        }
      } else {
        return finalize("ended", true, false);
      }
    }

    if (elapsedSec > maxElapsedSec) {
      return finalize("failsafe", true, false);
    }

    await delay(STREAM_POLL_MS);
  }
}

/**
 * Wait for playback completion without trusting "ended" on partial streams.
 * Full-required: duration polling only — never audio.onended.
 */
export async function waitForSafePlaybackCompletion(opts: {
  audio: HTMLAudioElement;
  mode: PlaybackMode;
  isCancelled: () => boolean;
  usedStreaming?: boolean;
  paragraphIdx?: number;
  knownDurationSec?: number;
}): Promise<SafeCompletionResult> {
  const {
    audio,
    mode,
    isCancelled,
    usedStreaming = false,
    paragraphIdx,
    knownDurationSec,
  } = opts;

  if (mode === "full-required") {
    return waitForFullRequiredCompletion(audio, isCancelled, {
      paragraphIdx,
      knownDurationSec,
    });
  }

  if (usedStreaming) {
    return waitForStreamingPlaybackCompletion(audio, mode, isCancelled, knownDurationSec ?? getExpectedAudioDurationSec(audio));
  }

  const waitResult = await audioManager.waitUntilEnd(audio, isCancelled);
  const expectedDuration = resolveDurationSec(audio, knownDurationSec);
  const actualPlayedDuration = audio.currentTime;
  const earlyCompletion =
    waitResult.ok &&
    !shouldTriggerCompletion({ mode, actualPlayedDuration, expectedDuration });

  if (earlyCompletion) {
    logTtsEarlyCompletion({
      errorType: "early_completion",
      mode,
      playedDuration: actualPlayedDuration,
      expectedDuration,
      usedStreaming: false,
    });
  }

  return {
    ok: waitResult.ok && !earlyCompletion,
    actualPlayedDuration,
    expectedDuration,
    earlyCompletion,
  };
}

/**
 * Partial streams: poll currentTime vs expected duration — never use onended alone.
 */
async function waitForStreamingPlaybackCompletion(
  audio: HTMLAudioElement,
  mode: PlaybackMode,
  isCancelled: () => boolean,
  expectedDuration: number,
): Promise<SafeCompletionResult> {
  const startedAt = Date.now();
  let lastTime = audio.currentTime;
  let lastAdvanceAt = Date.now();
  const maxWaitMs =
    expectedDuration > 0
      ? Math.min((expectedDuration * FAILSAFE_MULTIPLIER + 1) * 1000, 120_000)
      : 30_000;

  while (Date.now() - startedAt < maxWaitMs) {
    if (isCancelled()) {
      return {
        ok: false,
        actualPlayedDuration: audio.currentTime,
        expectedDuration,
        earlyCompletion: false,
      };
    }

    const current = audio.currentTime;
    if (current > lastTime + 0.01) {
      lastTime = current;
      lastAdvanceAt = Date.now();
    }

    const actualPlayedDuration = current;
    if (
      shouldTriggerCompletion({ mode, actualPlayedDuration, expectedDuration })
    ) {
      if (audio.ended || audio.paused) {
        return {
          ok: true,
          actualPlayedDuration,
          expectedDuration,
          earlyCompletion: false,
        };
      }
      if (expectedDuration > 0 && isPlaybackComplete(actualPlayedDuration, expectedDuration)) {
        return {
          ok: true,
          actualPlayedDuration,
          expectedDuration,
          earlyCompletion: false,
        };
      }
    }

    if (audio.ended && mode === "full-required") {
      const early = !shouldTriggerCompletion({
        mode,
        actualPlayedDuration: current,
        expectedDuration,
      });
      if (early) {
        logTtsEarlyCompletion({
          errorType: "early_completion",
          mode,
          playedDuration: current,
          expectedDuration,
          usedStreaming: true,
        });
        return {
          ok: false,
          actualPlayedDuration: current,
          expectedDuration,
          earlyCompletion: true,
        };
      }
    }

    if (
      audio.ended &&
      mode === "partial-ok" &&
      Date.now() - lastAdvanceAt >= STREAM_STALL_MS
    ) {
      return {
        ok: true,
        actualPlayedDuration: current,
        expectedDuration,
        earlyCompletion: false,
      };
    }

    await delay(STREAM_POLL_MS);
  }

  return {
    ok: false,
    actualPlayedDuration: audio.currentTime,
    expectedDuration,
    earlyCompletion: false,
  };
}
