/**
 * useInfantPoemPlayer — ambient poem / lullaby / story playback (loop, fade, volume, sleep timer).
 *
 * Bundled `/infant-sleep-audio/` MP3s use the UI/static channel (same as white-noise loops).
 * Live TTS narration uses the speech channel via amyVoiceController.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { isBundledInfantSleepAudioUrl } from "@/data/infant-sleep-catalog";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
import { resolveApiMediaUrl } from "@/lib/api";
import { emitAudioPlaybackEvent } from "@/lib/audio-playback-events";
import { playInfantSleepBundledMp3 } from "@/lib/infant-sleep-bundled-playback";
import {
  logInfantSleepPlaybackRequest,
  warnIfAudioSourceDuplicated,
  type InfantSleepContentType,
} from "@/lib/infant-sleep-playback-trace";
import { isAudioUnlocked, recordTtsUserGesture } from "@/lib/tts-guard";

const FADE_IN_MS = 2000;
const FADE_TICK_MS = 60;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface PoemPlayerOptions {
  /** The poem text to read aloud (joined lines). Required unless `audioUrl`. */
  text: string;
  /** Optional pre-recorded MP3 URL — preferred when present (skips synth). */
  audioUrl?: string;
  /** Reserved for future per-poem language hints; ignored today (server picks the voice). */
  lang?: string;
  /** Fired when playback completes naturally (not loop). */
  onEnded?: () => void;
  /** Track id for telemetry / library state. */
  trackId?: string;
  /** Drives pipeline selection — lullabies use bundled MP3; poems/stories use TTS narration. */
  contentType?: InfantSleepContentType;
}

export interface PoemPlayer {
  isPlaying: boolean;
  isPaused: boolean;
  /** True while the synth request is in flight (before audio.play() fires). */
  isLoading: boolean;
  /** True while the 2s fade-in window is still active after playback starts. */
  fadeInProgress: boolean;
  loop: boolean;
  volume: number;
  timerMs: number | null;
  remainingMs: number | null;
  /** True if the runtime exposes `Audio` (always true in modern browsers). */
  supported: boolean;
  /** Last error code from synth or playback, or null. */
  error: string | null;
  play: (opts: PoemPlayerOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setLoop: (loop: boolean) => void;
  setVolume: (v: number) => void;
  setTimer: (ms: number | null) => void;
}

export function useInfantPoemPlayer(): PoemPlayer {
  const authFetch = useAuthFetch();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeInProgress, setFadeInProgress] = useState(false);
  const [loop, setLoopState] = useState(true);
  const [volume, setVolumeState] = useState(0.85);
  const [timerMs, setTimerMsState] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported = typeof window !== "undefined" && typeof Audio !== "undefined";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);
  const bundledPlaybackRef = useRef(false);

  const loopRef = useRef(loop);
  const volumeRef = useRef(volume);
  const onEndedRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const timerStartRef = useRef<number | null>(null);
  const timerTotalRef = useRef<number | null>(null);

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    setFadeInProgress(false);
  }, []);

  const teardownAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      try { a.pause(); } catch { /* noop */ }
      try { a.removeAttribute("src"); } catch { /* noop */ }
      try { a.load(); } catch { /* noop */ }
    }
    audioRef.current = null;
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const beginFadeIn = useCallback(() => {
    clearFade();
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0;
    setFadeInProgress(true);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const a2 = audioRef.current;
      if (!a2) { clearFade(); return; }
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / FADE_IN_MS);
      a2.volume = clamp01(volumeRef.current * progress);
      if (progress >= 1) clearFade();
    }, FADE_TICK_MS);
    fadeIntervalRef.current = interval;
  }, [clearFade]);

  const play = useCallback(
    async (opts: PoemPlayerOptions) => {
      if (!supported) return;
      const text = (opts.text ?? "").trim();
      if (!text && !opts.audioUrl) return;

      recordTtsUserGesture();
      if (!isAudioUnlocked()) {
        console.warn("Audio blocked: waiting for user interaction");
        setError("audio_blocked_until_gesture");
        emitAudioPlaybackEvent("audio_failed", {
          source: "poem_player",
          error: "audio_blocked_until_gesture",
        });
        return;
      }

      onEndedRef.current = opts.onEnded;

      const myId = ++reqIdRef.current;
      const contentType: InfantSleepContentType = opts.contentType ?? "poem";
      const wantsBundled =
        contentType === "lullaby" && isBundledInfantSleepAudioUrl(opts.audioUrl);
      abortInFlight();
      clearFade();
      teardownAudio();
      if (!wantsBundled) {
        amyVoiceController.pause();
      }
      setError(null);
      setIsPaused(false);
      setIsPlaying(false);
      setIsLoading(true);

      const attachHandlers = (audio: HTMLAudioElement, bundled: boolean) => {
        audio.loop = loopRef.current;
        audio.volume = bundled ? volumeRef.current : 0;
        audio.onended = () => {
          if (myId !== reqIdRef.current) return;
          setIsPlaying(false);
          setIsPaused(false);
          clearFade();
          emitAudioPlaybackEvent("audio_completed", { source: "poem_player" });
          if (!loopRef.current) {
            onEndedRef.current?.();
          }
        };
        audio.onerror = () => {
          if (myId !== reqIdRef.current) return;
          setError("playback_failed");
          setIsPlaying(false);
          setIsPaused(false);
          clearFade();
          emitAudioPlaybackEvent("audio_failed", {
            source: "poem_player",
            error: "playback_failed",
          });
        };
        audioRef.current = audio;
      };

      const startPlayback = async (
        trimmedUrl: string,
        bundled: boolean,
      ): Promise<boolean> => {
        logInfantSleepPlaybackRequest({
          selectedId: opts.trackId,
          resolvedAudioUrl: trimmedUrl,
          contentType,
          pipeline: bundled ? "bundled_mp3" : "tts_narration",
        });
        if (opts.trackId) {
          warnIfAudioSourceDuplicated(opts.trackId, trimmedUrl);
        }
        emitAudioPlaybackEvent("audio_started", {
          source: bundled ? "infant_sleep_mp3" : "poem_player",
          proxyUrl: trimmedUrl.slice(0, 120),
        });

        if (bundled) {
          const audio = audioManager.create(trimmedUrl);
          attachHandlers(audio, true);
          return playInfantSleepBundledMp3(trimmedUrl, audio, {
            loop: loopRef.current,
            volume: volumeRef.current,
          });
        }

        const proxyUrl = resolveApiMediaUrl(trimmedUrl);
        const audio = audioManager.create(proxyUrl);
        attachHandlers(audio, false);

        return audioManager.play(
          audio,
          {
            proxyUrl,
            source: "poem_player",
            channel: "speech",
            interrupt: true,
            srcType: "tts",
            phrase: opts.trackId,
          },
          { channel: "speech", interrupt: true },
        );
      };

      try {
        let audioUrl = wantsBundled ? opts.audioUrl : undefined;
        let bundled = wantsBundled;

        if (!audioUrl) {
          const controller = new AbortController();
          abortRef.current = controller;
          const resolved = await amyVoiceController.fetchNarrationUrl(
            authFetch,
            text,
            { signal: controller.signal, category: "sentences" },
          );
          if (myId !== reqIdRef.current) return;
          if (!resolved?.url) {
            setError("tts_failed");
            setIsLoading(false);
            emitAudioPlaybackEvent("audio_failed", {
              source: "poem_player",
              phrase: text.slice(0, 80),
              error: "tts_failed",
            });
            return;
          }
          audioUrl = resolved.url;
          bundled = false;
        }

        let trimmedUrl = (audioUrl ?? "").trim();
        if (!trimmedUrl || trimmedUrl.includes("undefined")) {
          setError("tts_failed");
          emitAudioPlaybackEvent("audio_failed", {
            source: "poem_player",
            error: "invalid_audio_url",
          });
          return;
        }

        bundledPlaybackRef.current = bundled;
        let played = await startPlayback(trimmedUrl, bundled);

        // Lullaby bundled MP3 missing or blocked — fall back to TTS so content still plays.
        if (!played && bundled && contentType === "lullaby" && text) {
          teardownAudio();
          const controller = new AbortController();
          abortRef.current = controller;
          const resolved = await amyVoiceController.fetchNarrationUrl(
            authFetch,
            text,
            { signal: controller.signal, category: "sentences" },
          );
          if (myId !== reqIdRef.current) return;
          if (resolved?.url) {
            trimmedUrl = resolved.url.trim();
            bundled = false;
            bundledPlaybackRef.current = false;
            played = await startPlayback(trimmedUrl, false);
          }
        }

        if (!played) {
          if (myId !== reqIdRef.current) return;
          setError("playback_failed");
          setIsPlaying(false);
          setIsPaused(false);
          clearFade();
          teardownAudio();
          emitAudioPlaybackEvent("audio_failed", {
            source: "poem_player",
            error: "play_failed",
          });
          return;
        }
        if (myId !== reqIdRef.current) {
          try { audioRef.current?.pause(); } catch { /* noop */ }
          teardownAudio();
          emitAudioPlaybackEvent("audio_interrupted", { source: "poem_player" });
          return;
        }
        setIsPlaying(true);
        setIsLoading(false);
        if (!bundled) beginFadeIn();
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name === "AbortError") return;
        if (myId !== reqIdRef.current) return;
        const message = err instanceof Error ? err.message : "tts_failed";
        setError(message);
        teardownAudio();
        setIsPlaying(false);
        emitAudioPlaybackEvent("audio_failed", {
          source: "poem_player",
          error: message,
        });
      } finally {
        if (myId === reqIdRef.current) {
          if (abortRef.current) abortRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [supported, authFetch, abortInFlight, clearFade, teardownAudio, beginFadeIn],
  );

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try { a.pause(); } catch { /* noop */ }
    setIsPaused(true);
    emitAudioPlaybackEvent("audio_interrupted", {
      source: "poem_player",
      interruptedBy: "pause",
    });
  }, []);

  const resume = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    recordTtsUserGesture();
    if (!isAudioUnlocked()) {
      console.warn("Audio blocked: waiting for user interaction");
      return;
    }
    void audioManager.resumeElement(a).then((ok) => {
      if (!ok) setError("playback_failed");
    });
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    clearFade();
    teardownAudio();
    if (!bundledPlaybackRef.current) {
      amyVoiceController.pause();
    }
    bundledPlaybackRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    emitAudioPlaybackEvent("audio_interrupted", {
      source: "poem_player",
      interruptedBy: "stop",
    });
  }, [abortInFlight, clearFade, teardownAudio]);

  const setLoop = useCallback((next: boolean) => {
    setLoopState(next);
    if (audioRef.current) audioRef.current.loop = next;
  }, []);

  const setVolume = useCallback((v: number) => {
    const next = clamp01(v);
    setVolumeState(next);
    if (audioRef.current && fadeIntervalRef.current === null) {
      audioRef.current.volume = next;
    }
  }, []);

  const setTimer = useCallback((ms: number | null) => {
    setTimerMsState(ms);
  }, []);

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
      const elapsed = Date.now() - timerStartRef.current;
      const remaining = Math.max(0, timerTotalRef.current - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        reqIdRef.current += 1;
        if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
        if (fadeIntervalRef.current !== null) {
          window.clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        const a = audioRef.current;
        if (a) {
          a.onended = null;
          a.onerror = null;
          try { a.pause(); } catch { /* noop */ }
          try { a.removeAttribute("src"); } catch { /* noop */ }
          try { a.load(); } catch { /* noop */ }
        }
        audioRef.current = null;
        bundledPlaybackRef.current = false;
        setFadeInProgress(false);
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerMs]);

  useEffect(() => {
    return () => {
      reqIdRef.current += 1;
      if (abortRef.current) abortRef.current.abort();
      if (fadeIntervalRef.current !== null) window.clearInterval(fadeIntervalRef.current);
      const a = audioRef.current;
      if (a) {
        a.onended = null;
        a.onerror = null;
        try { a.pause(); } catch { /* noop */ }
        try { a.removeAttribute("src"); } catch { /* noop */ }
        try { a.load(); } catch { /* noop */ }
      }
      audioRef.current = null;
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    isLoading,
    fadeInProgress,
    loop,
    volume,
    timerMs,
    remainingMs,
    supported,
    error,
    play,
    pause,
    resume,
    stop,
    setLoop,
    setVolume,
    setTimer,
  };
}
