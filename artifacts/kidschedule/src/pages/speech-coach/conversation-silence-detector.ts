import { useEffect, useRef } from "react";
import { microphoneSessionManager } from "@/lib/microphone-session-manager";

/** Normalized mic level (0..1) below which we treat input as silence. */
export const CONVO_SILENCE_LEVEL_THRESHOLD = 0.06;
/** Normalized mic level above which we treat input as child speech. */
export const CONVO_SPEECH_LEVEL_THRESHOLD = 0.1;
/** Sustained silence before auto-stop (ms) — generous for slow child speech. */
export const CONVO_SILENCE_DURATION_MS = 1800;
/** Minimum speech detected before silence can end the turn (ms). */
export const CONVO_MIN_SPEECH_MS = 700;
/** Hard cap — fallback when silence detection is unavailable. */
export const CONVO_MAX_LISTEN_MS = 9000;

/**
 * Energy-based end-of-speech for Talk with Amy (MediaRecorder / whisper path only).
 * Native Web Speech API callers should rely on the engine stop + max timeout.
 */
export function useConversationSilenceStop(opts: {
  active: boolean;
  enabled: boolean;
  onSilenceStop: () => void;
  onMaxTimeout: () => void;
}): void {
  const onSilenceRef = useRef(opts.onSilenceStop);
  const onMaxRef = useRef(opts.onMaxTimeout);
  onSilenceRef.current = opts.onSilenceStop;
  onMaxRef.current = opts.onMaxTimeout;

  useEffect(() => {
    if (!opts.active || !opts.enabled) return;

    let raf = 0;
    let speechStartedAt: number | null = null;
    let silenceStartedAt: number | null = null;
    let stopped = false;

    const finish = (fn: () => void) => {
      if (stopped) return;
      stopped = true;
      fn();
    };

    const maxTimer = window.setTimeout(() => {
      finish(() => onMaxRef.current());
    }, CONVO_MAX_LISTEN_MS);

    const tick = () => {
      if (stopped) return;
      const level = microphoneSessionManager.getMicLevel();
      const now = Date.now();

      if (level >= CONVO_SPEECH_LEVEL_THRESHOLD) {
        speechStartedAt = speechStartedAt ?? now;
        silenceStartedAt = null;
      } else if (level < CONVO_SILENCE_LEVEL_THRESHOLD && speechStartedAt != null) {
        silenceStartedAt = silenceStartedAt ?? now;
        const speechMs = now - speechStartedAt;
        if (
          speechMs >= CONVO_MIN_SPEECH_MS &&
          now - silenceStartedAt >= CONVO_SILENCE_DURATION_MS
        ) {
          finish(() => onSilenceRef.current());
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(maxTimer);
    };
  }, [opts.active, opts.enabled]);
}
