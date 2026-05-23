/**
 * Amy voice playback contract — streaming safety and completion guarantees.
 *
 * RULE:
 * - Streaming is ONLY for partial-ok playback
 * - Full-required playback MUST use complete audio
 * - HTMLAudioElement "ended" cannot be trusted for partial streams
 *
 * New modules MUST set playbackMode explicitly. Default: "full-required".
 */

import { audioManager } from "@/lib/audio-manager";

export type PlaybackMode = "partial-ok" | "full-required";

/** Minimal speak opts used to resolve mode (mirrors controller SpeakOptions flags). */
export type PlaybackModeInput = {
  playbackMode?: PlaybackMode;
  lessonParagraph?: boolean;
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

const FULL_PLAYBACK_RATIO = 0.98;
const STREAM_POLL_MS = 80;
const STREAM_STALL_MS = 400;

/** Safe default — full audio required unless explicitly partial-ok. */
export function resolvePlaybackMode(opts?: PlaybackModeInput): PlaybackMode {
  if (opts?.playbackMode) return opts.playbackMode;
  if (opts?.lessonParagraph || opts?.narration) return "full-required";
  if (opts?.waitUntilEnd) return "full-required";
  if (opts?.mode === "phonics") return "partial-ok";
  return "full-required";
}

/** ONLY gate for streaming eligibility — do not scatter other checks. */
export function canUseStreaming(mode: PlaybackMode): boolean {
  return mode === "partial-ok";
}

export function requiresFullPlayback(mode: PlaybackMode): boolean {
  return mode === "full-required";
}

/** Dev-only hard block: streaming must never run for full-required playback. */
export function assertStreamingAllowed(mode: PlaybackMode, streamingEnabled: boolean): void {
  if (!import.meta.env.DEV) return;
  if (mode === "full-required" && streamingEnabled) {
    throw new Error(
      "Streaming not allowed for full-required playback — use complete audio download",
    );
  }
}

export function getExpectedAudioDurationSec(audio: HTMLAudioElement): number {
  const d = audio.duration;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

export function shouldTriggerCompletion(input: SafeCompletionInput): boolean {
  const { mode, actualPlayedDuration, expectedDuration } = input;
  if (mode === "full-required") {
    if (expectedDuration <= 0) {
      // Unknown duration — require ended + non-trivial play time
      return actualPlayedDuration >= 0.25;
    }
    return actualPlayedDuration >= expectedDuration * FULL_PLAYBACK_RATIO;
  }
  return true;
}

export function logTtsEarlyCompletion(payload: EarlyCompletionLog): void {
  if (import.meta.env.DEV) {
    console.warn("[AmyVoiceTTS]", payload);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wait for playback completion without trusting "ended" on partial streams.
 * Full-file playback may use audioManager.waitUntilEnd (ended is reliable).
 */
export async function waitForSafePlaybackCompletion(opts: {
  audio: HTMLAudioElement;
  mode: PlaybackMode;
  isCancelled: () => boolean;
  usedStreaming?: boolean;
}): Promise<SafeCompletionResult> {
  const { audio, mode, isCancelled, usedStreaming = false } = opts;
  const expectedDuration = getExpectedAudioDurationSec(audio);

  if (usedStreaming) {
    return waitForStreamingPlaybackCompletion(audio, mode, isCancelled, expectedDuration);
  }

  const waitResult = await audioManager.waitUntilEnd(audio, isCancelled);
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
      ? Math.min((expectedDuration * 1.5 + 1) * 1000, 120_000)
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
      if (expectedDuration > 0 && actualPlayedDuration >= expectedDuration * FULL_PLAYBACK_RATIO) {
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
