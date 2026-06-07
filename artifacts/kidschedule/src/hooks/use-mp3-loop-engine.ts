/**
 * Looping MP3 playback for bundled white-noise clips (offline, no TTS).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio-manager";
import { recordTtsUserGesture, isAudioUnlocked } from "@/lib/tts-guard";

const FADE_SECONDS = 0.6;

export type Mp3LoopEngine = {
  activeId: string | null;
  isPlaying: boolean;
  volume: number;
  timerMs: number | null;
  remainingMs: number | null;
  play: (id: string, url: string) => Promise<void>;
  stop: (id?: string) => void;
  stopAll: () => void;
  toggle: (id: string, url: string) => void;
  setVolume: (v: number) => void;
  setTimer: (ms: number | null) => void;
};

export function useMp3LoopEngine(): Mp3LoopEngine {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const volumeRef = useRef(0.65);
  const timerStartRef = useRef<number | null>(null);
  const timerTotalRef = useRef<number | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.65);
  const [timerMs, setTimerMsState] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const teardown = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      try { a.pause(); } catch { /* noop */ }
      try { a.removeAttribute("src"); } catch { /* noop */ }
      try { a.load(); } catch { /* noop */ }
    }
    audioRef.current = null;
    activeIdRef.current = null;
    setActiveId(null);
    setIsPlaying(false);
  }, []);

  const stopAll = useCallback(() => {
    teardown();
  }, [teardown]);

  const stop = useCallback(
    (id?: string) => {
      if (id && activeIdRef.current !== id) return;
      teardown();
    },
    [teardown],
  );

  const play = useCallback(
    async (id: string, url: string) => {
      const trimmed = (url ?? "").trim();
      if (!trimmed) return;
      recordTtsUserGesture();
      if (!isAudioUnlocked()) return;

      if (activeIdRef.current === id && audioRef.current && !audioRef.current.paused) {
        stop(id);
        return;
      }

      teardown();
      const audio = audioManager.create(trimmed);
      audio.loop = true;
      audio.volume = 0;
      audio.onerror = () => {
        teardown();
      };
      audioRef.current = audio;
      activeIdRef.current = id;
      setActiveId(id);

      const played = await audioManager.play(
        audio,
        { proxyUrl: trimmed, source: "infant_sleep_mp3", channel: "ambient", interrupt: true },
        { channel: "ambient", interrupt: true },
      );
      if (!played) {
        teardown();
        return;
      }

      const target = volumeRef.current;
      audio.volume = target;
      setIsPlaying(true);

      const fadeStart = performance.now();
      const fade = () => {
        const a = audioRef.current;
        if (!a) return;
        const t = Math.min(1, (performance.now() - fadeStart) / (FADE_SECONDS * 1000));
        a.volume = target * t;
        if (t < 1) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
    },
    [stop, teardown],
  );

  const toggle = useCallback(
    (id: string, url: string) => {
      if (activeIdRef.current === id && isPlaying) {
        stop(id);
      } else {
        void play(id, url);
      }
    },
    [isPlaying, play, stop],
  );

  const setVolume = useCallback((v: number) => {
    const next = Math.max(0, Math.min(1, v));
    volumeRef.current = next;
    setVolumeState(next);
    if (audioRef.current) audioRef.current.volume = next;
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
      const remaining = Math.max(0, timerTotalRef.current - (Date.now() - timerStartRef.current));
      setRemainingMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        stopAll();
        setTimerMsState(null);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerMs, stopAll]);

  useEffect(() => () => teardown(), [teardown]);

  return {
    activeId,
    isPlaying,
    volume,
    timerMs,
    remainingMs,
    play,
    stop,
    stopAll,
    toggle,
    setVolume,
    setTimer,
  };
}
