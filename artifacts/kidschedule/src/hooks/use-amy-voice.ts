import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { logTtsClient, logTtsClientError, resolveTtsAudioUrl, synthesizeTts } from "@/lib/tts-playback";

// ─── Global single-flight guard ───────────────────────────────────────────────
// At most one ElevenLabs network round-trip at a time, across all hook
// instances on the page (e.g. multiple AudioPlayButton tiles). A new speak()
// call while one is already in-flight is skipped with a warning instead of
// stacking concurrent requests, which causes ai_queue_busy errors.
let _ttsBusy = false;
const TTS_TIMEOUT_MS = 8_000;

export interface UseAmyVoiceOptions {
  /** Optional override for the voice persona (ElevenLabs voice id). */
  voiceId?: string;
  /** Optional override for the model id (defaults to Turbo v2.5 server-side). */
  modelId?: string;
  /** Multiplier on HTMLAudioElement.playbackRate. Defaults to 1. Live-applied. */
  playbackRate?: number;
  /**
   * Fired when the audio reaches its natural end (not on stop/abort/error).
   * Used by the audio-lessons player to auto-advance to the next paragraph.
   */
  onFinished?: () => void;
}

export interface SpeakOptions {
  /**
   * `phonics` swaps to crisp ElevenLabs voice settings tuned for teaching
   * phoneme sounds. Used by the Phonics learning UI on letter tiles so
   * "buh" is pronounced as the actual sound, not the spoken word "buh".
   */
  mode?: "default" | "phonics";
}

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Synthesises and plays the given text. Calling again while a previous
   * synth/playback is in-flight cancels it and starts fresh — consumers that
   * want toggle (tap-to-stop) UX should check `speaking || loading` first
   * and call `stop()` themselves.
   *
   * Pass `{ mode: "phonics" }` for letter-sound playback (different ElevenLabs
   * voice settings, separate cache namespace).
   */
  speak: (text: string, opts?: SpeakOptions) => Promise<void>;
  stop: () => void;
}

interface SynthesizeResponse {
  ok: true;
  cacheKey: string;
  audioUrl: string;
  cached: boolean;
  charCount: number;
  contentType: string;
}

/**
 * High-quality Amy TTS via ElevenLabs, with the server doing the actual
 * caching. The client's only job is to swap an <audio> source and tear it
 * down on unmount. We keep at most one audio element alive per consumer.
 */
export function useAmyVoice(options: UseAmyVoiceOptions = {}): UseAmyVoiceState {
  const authFetch = useAuthFetch();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // AbortController for the currently-in-flight synth + audio fetches. We
  // keep it in a ref so `stop()` can cancel network work that hasn't yet
  // produced a response — without this, tapping Stop during loading still
  // results in a delayed `audio.play()` once the response arrives.
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic request id: every call to `speak()` bumps this. Stale resolves
  // (older request still resolving after the user moved on) check the id
  // before mutating state or starting playback.
  const reqIdRef = useRef(0);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { voiceId, modelId, playbackRate, onFinished } = options;

  // Refs so live changes to rate / onFinished don't bust speak's identity
  // (and don't accidentally re-trigger consumer effects that depend on it).
  const playbackRateRef = useRef(playbackRate ?? 1);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    playbackRateRef.current = playbackRate ?? 1;
    // Apply rate change live to currently-playing audio.
    if (audioRef.current) audioRef.current.playbackRate = playbackRateRef.current;
  }, [playbackRate]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const cleanup = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // Bump the id so any still-resolving promise is treated as stale.
      reqIdRef.current += 1;
      abortInFlight();
      cleanup();
      setSpeaking(false);
    };
  }, [abortInFlight, cleanup]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    cleanup();
    setSpeaking(false);
    setLoading(false);
  }, [abortInFlight, cleanup]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions) => {
      const text = (rawText ?? "").trim();
      if (!text) return;
      const mode = opts?.mode;

      // Single-flight guard: skip if any other instance is already fetching.
      // This prevents ai_queue_busy errors from concurrent phonics/puzzle tiles.
      if (_ttsBusy) {
        console.warn("[TTS] skipped — another TTS request is already in flight");
        return;
      }

      // Cancel any in-flight fetch + playing audio on this instance, then
      // start fresh. Consumers wanting toggle UX gate the call on
      // `speaking || loading` themselves and call `stop()` first.
      const myId = ++reqIdRef.current;
      abortInFlight();
      cleanup();
      setSpeaking(false);

      const controller = new AbortController();
      abortRef.current = controller;

      // Hard 8-second timeout — aborts the controller if ElevenLabs stalls.
      const timeoutId = setTimeout(() => {
        if (abortRef.current === controller) {
          console.error("[TTS] request timed out after", TTS_TIMEOUT_MS, "ms — aborting");
          controller.abort();
        }
      }, TTS_TIMEOUT_MS);

      setError(null);
      setLoading(true);
      _ttsBusy = true;

      try {
        logTtsClient("Request start", { chars: text.length, mode });
        const data = await synthesizeTts(
          authFetch,
          { text, voiceId, modelId, mode },
          { signal: controller.signal },
        );
        if (myId !== reqIdRef.current) return; // superseded by a newer call
        logTtsClient("Synthesize OK", { cacheKey: data.cacheKey, cached: data.cached });

        const playbackUrl = resolveTtsAudioUrl(data.audioUrl);
        if (!playbackUrl) {
          console.warn("No audio URL");
          throw new Error("tts_missing_audio_url");
        }
        const audioRes = await authFetch(playbackUrl, { signal: controller.signal });
        if (myId !== reqIdRef.current) return;
        if (!audioRes.ok) {
          const errText = await audioRes.text().catch(() => "");
          throw new Error(`audio_fetch_failed_${audioRes.status}${errText ? `:${errText.slice(0, 80)}` : ""}`);
        }
        const blob = await audioRes.blob();
        if (myId !== reqIdRef.current) return;
        if (blob.size === 0) {
          throw new Error("audio_empty_blob");
        }
        logTtsClient("Audio blob ready", { bytes: blob.size, type: blob.type });

        cleanup();
        const url = URL.createObjectURL(blob);
        if (!url) {
          console.warn("No audio URL");
          throw new Error("tts_missing_audio_url");
        }
        console.log("[VOICE URL]", url);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = playbackRateRef.current;
        audio.onended = () => {
          if (myId !== reqIdRef.current) return;
          setSpeaking(false);
          cleanup();
          onFinishedRef.current?.();
        };
        audio.onerror = () => {
          if (myId !== reqIdRef.current) return;
          const mediaErr = audio.error;
          const code = mediaErr?.code ?? "unknown";
          logTtsClientError("HTMLAudioElement error", new Error(`media_error_${code}`));
          setError(`playback_failed_${code}`);
          setSpeaking(false);
          cleanup();
        };
        audioRef.current = audio;

        try {
          await audio.play();
        } catch (playErr) {
          console.error("Audio failed:", playErr);
          logTtsClientError("audio.play() rejected", playErr);
          const name = (playErr as { name?: string })?.name ?? "play_failed";
          setError(name === "NotAllowedError" ? "playback_blocked_tap_again" : `play_failed_${name}`);
          cleanup();
          setSpeaking(false);
          return;
        }
        if (myId !== reqIdRef.current) {
          audio.pause();
          cleanup();
          return;
        }
        logTtsClient("Playback started");
        setSpeaking(true);
      } catch (err) {
        const errName = (err as { name?: string })?.name;
        if (errName === "AbortError") {
          // If myId is still current the abort came from the timeout (not from
          // stop() or a newer speak() call — those bump reqIdRef first).
          if (myId === reqIdRef.current) {
            console.error("[TTS] timed out — request aborted after", TTS_TIMEOUT_MS, "ms");
            setError("tts_timeout");
            setSpeaking(false);
          }
          return;
        }
        if (myId !== reqIdRef.current) return;
        logTtsClientError("speak failed", err);
        setError(err instanceof Error ? err.message : "tts_failed");
        cleanup();
        setSpeaking(false);
      } finally {
        clearTimeout(timeoutId);
        _ttsBusy = false; // always release the global lock
        if (myId === reqIdRef.current) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [authFetch, cleanup, abortInFlight, modelId, voiceId],
  );

  return { speaking, loading, error, speak, stop };
}
