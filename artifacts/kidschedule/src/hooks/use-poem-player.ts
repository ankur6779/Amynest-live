/**
 * useInfantPoemPlayer — ambient poem playback (loop, fade, volume, sleep timer).
 *
 * TTS resolution and speech-channel arbitration go through amyVoiceController.
 * Loop/fade/volume remain local (ambient UX controls not supported by speak()).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
import { resolveApiMediaUrl } from "@/lib/api";
import { emitAudioPlaybackEvent } from "@/lib/audio-playback-events";
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

  const loopRef = useRef(loop);
  const volumeRef = useRef(volume);
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

      const myId = ++reqIdRef.current;
      abortInFlight();
      clearFade();
      teardownAudio();
      amyVoiceController.pause();
      setError(null);
      setIsPaused(false);
      setIsPlaying(false);
      setIsLoading(true);

      try {
        let audioUrl = opts.audioUrl;

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
        }

        const trimmedUrl = (audioUrl ?? "").trim();
        if (!trimmedUrl || trimmedUrl.includes("undefined")) {
          setError("tts_failed");
          emitAudioPlaybackEvent("audio_failed", {
            source: "poem_player",
            error: "invalid_audio_url",
          });
          return;
        }

        const audio = audioManager.create(trimmedUrl);
        audio.loop = loopRef.current;
        audio.volume = 0;
        audio.onended = () => {
          if (myId !== reqIdRef.current) return;
          setIsPlaying(false);
          setIsPaused(false);
          clearFade();
          emitAudioPlaybackEvent("audio_completed", { source: "poem_player" });
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

        emitAudioPlaybackEvent("audio_started", {
          source: "poem_player",
          proxyUrl: resolveApiMediaUrl(trimmedUrl).slice(0, 120),
        });

        const played = await audioManager.play(
          audio,
          {
            proxyUrl: resolveApiMediaUrl(trimmedUrl),
            source: "poem_player",
            channel: "speech",
            interrupt: true,
            srcType: "tts",
          },
          { channel: "speech", interrupt: true },
        );
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
          try { audio.pause(); } catch { /* noop */ }
          teardownAudio();
          emitAudioPlaybackEvent("audio_interrupted", { source: "poem_player" });
          return;
        }
        setIsPlaying(true);
        setIsLoading(false);
        beginFadeIn();
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
    amyVoiceController.pause();
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
