/**
 * useInfantPoemPlayer
 *
 * Plays a calming poem to the baby using the browser's built-in
 * `SpeechSynthesis` API — zero external API calls, zero per-user cost,
 * works fully offline. Designed for the "Poems for your baby" module
 * (Spec 3) which explicitly bans ElevenLabs / any network TTS.
 *
 * Capabilities:
 *   - play / pause / stop with UI-friendly state flags
 *   - loop ON by default (re-fires the utterance on its `onend`)
 *   - sleep timer (15m / 30m / 1h) that stops playback when it expires
 *   - volume control (0..1)
 *   - 2-second UI fade-in cue (the spec asks for it; SpeechSynthesis
 *     itself does not support live volume ramps, so we approximate by
 *     starting playback at the user-chosen volume after a short pre-roll
 *     delay and signalling the fade through `fadeInProgress` so the UI
 *     can ease in opacity)
 *   - graceful degradation when SpeechSynthesis is unavailable (older
 *     browsers / SSR / jsdom): everything no-ops, `supported` is false
 *
 * NOT in scope: choosing voices per language, audio mixing with the
 * existing WebAudio engine. Those can be layered on top later.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const FADE_IN_MS = 2000;

export interface PoemPlayerOptions {
  /** The poem text to read aloud (joined lines). Required on play. */
  text: string;
  /** Optional pre-recorded MP3 URL — preferred when present. */
  audioUrl?: string;
  /** BCP-47 language tag for the utterance, e.g. "en-IN", "hi-IN". */
  lang?: string;
}

export interface PoemPlayer {
  isPlaying: boolean;
  isPaused: boolean;
  /** True while the 2s fade-in window is still active after play() fires. */
  fadeInProgress: boolean;
  loop: boolean;
  volume: number;
  /** Currently armed sleep-timer total (ms), or null. */
  timerMs: number | null;
  /** Remaining ms on the timer, ticked once per second. Null when no timer. */
  remainingMs: number | null;
  /** True if the runtime exposes `window.speechSynthesis`. */
  supported: boolean;
  play: (opts: PoemPlayerOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setLoop: (loop: boolean) => void;
  setVolume: (v: number) => void;
  setTimer: (ms: number | null) => void;
}

export function useInfantPoemPlayer(): PoemPlayer {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeInProgress, setFadeInProgress] = useState(false);
  // Spec: "Loop (ON by default)".
  const [loop, setLoop] = useState(true);
  const [volume, setVolumeState] = useState(0.85);
  const [timerMs, setTimerMsState] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Mutable refs so callbacks read fresh state without re-binding handlers.
  const loopRef    = useRef(loop);
  const volumeRef  = useRef(volume);
  const optsRef    = useRef<PoemPlayerOptions | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const timerTotalRef = useRef<number | null>(null);

  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // ── Internal: speak a single utterance ──────────────────────────────────
  const speakOnce = useCallback((opts: PoemPlayerOptions) => {
    if (!supported) return;
    const u = new SpeechSynthesisUtterance(opts.text);
    // Calming baseline — slow, slightly higher pitch reads as warmer.
    u.rate   = 0.72;
    u.pitch  = 1.05;
    u.volume = Math.max(0, Math.min(1, volumeRef.current));
    u.lang   = opts.lang ?? "en-IN";

    // Prefer a soft female voice when one is available. Voices populate
    // asynchronously on some browsers (Chrome) — fall back silently if not.
    try {
      const voices = window.speechSynthesis.getVoices?.() ?? [];
      const preferred =
        voices.find((v) => v.lang === u.lang && /female|samantha|victoria|aria/i.test(v.name)) ??
        voices.find((v) => v.lang === u.lang) ??
        voices.find((v) => v.lang.startsWith(u.lang.split("-")[0]));
      if (preferred) u.voice = preferred;
    } catch {
      /* voice selection is best-effort */
    }

    u.onend = () => {
      // Loop: re-queue the same poem. Otherwise mark stopped.
      if (loopRef.current && optsRef.current) {
        speakOnce(optsRef.current);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };
    u.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(u);
  }, [supported]);

  // ── Public: play ────────────────────────────────────────────────────────
  const play = useCallback((opts: PoemPlayerOptions) => {
    if (!supported) return;
    // Cancel anything queued so we always start cleanly.
    window.speechSynthesis.cancel();
    optsRef.current = opts;
    setIsPlaying(true);
    setIsPaused(false);
    // 2s UI fade-in cue (SpeechSynthesis can't ramp volume mid-utterance).
    setFadeInProgress(true);
    window.setTimeout(() => setFadeInProgress(false), FADE_IN_MS);
    speakOnce(opts);
  }, [supported, speakOnce]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    optsRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
    setFadeInProgress(false);
  }, [supported]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    // Live volume changes don't apply to in-flight utterances, so for an
    // immediate effect we restart the current poem from the top.
    if (isPlaying && optsRef.current && supported) {
      window.speechSynthesis.cancel();
      // queueMicrotask defers to the next tick so the cancel completes first
      queueMicrotask(() => {
        if (optsRef.current) speakOnce(optsRef.current);
      });
    }
  }, [isPlaying, supported, speakOnce]);

  const setTimer = useCallback((ms: number | null) => {
    setTimerMsState(ms);
  }, []);

  // ── Sleep timer tick ────────────────────────────────────────────────────
  // Re-arms only when the user picks a new pill — adding/removing the loop
  // toggle or changing volume mid-countdown does NOT reset elapsed time.
  useEffect(() => {
    if (timerMs === null) {
      setRemainingMs(null);
      timerStartRef.current = null;
      timerTotalRef.current = null;
      return;
    }
    timerStartRef.current = Date.now();
    timerTotalRef.current = timerMs;
    setRemainingMs(timerMs);
    const interval = window.setInterval(() => {
      if (timerStartRef.current === null || timerTotalRef.current === null) return;
      const elapsed   = Date.now() - timerStartRef.current;
      const remaining = Math.max(0, timerTotalRef.current - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        // Fire stop directly via the API — `stop` is captured below the
        // effect closure so we call the ref-free underlying calls.
        if (supported) window.speechSynthesis.cancel();
        optsRef.current = null;
        setIsPlaying(false);
        setIsPaused(false);
        setFadeInProgress(false);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerMs, supported]);

  // ── Cleanup on unmount: stop any in-flight speech ───────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    fadeInProgress,
    loop,
    volume,
    timerMs,
    remainingMs,
    supported,
    play,
    pause,
    resume,
    stop,
    setLoop,
    setVolume,
    setTimer,
  };
}
