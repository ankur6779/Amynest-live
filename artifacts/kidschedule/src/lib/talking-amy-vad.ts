/**
 * Voice-activity silence watcher for tap-to-talk — uses existing mic level signal.
 */

import { microphoneSessionManager } from "@/lib/microphone-session-manager";
import { clampMicLevel } from "@/lib/talking-amy-mic-visual";

export const TALKING_AMY_SILENCE_THRESHOLD = 0.06;
export const TALKING_AMY_SILENCE_STOP_MS = 1000;
export const TALKING_AMY_VAD_POLL_MS = 80;

export type SilenceWatcherOptions = {
  getLevel?: () => number;
  onSilence: () => void;
  silenceMs?: number;
  threshold?: number;
  pollMs?: number;
  /** Require at least this much speech before silence can auto-stop. */
  minSpeechMs?: number;
  startedAtMs?: number;
};

export function createSilenceWatcher(options: SilenceWatcherOptions): () => void {
  const {
    getLevel = () => microphoneSessionManager.getMicLevel(),
    onSilence,
    silenceMs = TALKING_AMY_SILENCE_STOP_MS,
    threshold = TALKING_AMY_SILENCE_THRESHOLD,
    pollMs = TALKING_AMY_VAD_POLL_MS,
    minSpeechMs = 400,
    startedAtMs = Date.now(),
  } = options;

  let silenceStartedAt: number | null = null;
  let fired = false;

  const id = window.setInterval(() => {
    if (fired) return;
    const elapsed = Date.now() - startedAtMs;
    if (elapsed < minSpeechMs) {
      silenceStartedAt = null;
      return;
    }

    const level = clampMicLevel(getLevel());
    if (level > threshold) {
      silenceStartedAt = null;
      return;
    }

    const now = Date.now();
    if (silenceStartedAt == null) silenceStartedAt = now;
    if (now - silenceStartedAt >= silenceMs) {
      fired = true;
      onSilence();
    }
  }, pollMs);

  return () => {
    window.clearInterval(id);
  };
}
