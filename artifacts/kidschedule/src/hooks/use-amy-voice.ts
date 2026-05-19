import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { logTtsClient, logTtsClientError, resolveTtsAudioUrl, synthesizeTts } from "@/lib/tts-playback";

// ─── Global single-flight guard ───────────────────────────────────────────────
// At most one ElevenLabs network round-trip at a time, across all hook
// instances on the page. Protected by `busyRef` (instance-level) so that:
//   • A DIFFERENT instance calling speak() while one is in-flight is skipped.
//   • The SAME instance calling speak() again cancels its own previous call
//     (original cancel-and-restart behaviour preserved).
//   • stop() and unmount cleanly release the lock immediately.
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

/**
 * Structured return value from speak(). Callers that drive downstream logic
 * (play tracking, auto-advance) MUST check `success` before proceeding.
 * Never throws — all failure modes are represented as { success: false }.
 */
export type SpeakResult =
  | { success: true }
  | { success: false; error: string };

export interface UseAmyVoiceState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Synthesises and plays the given text. Always resolves — never throws.
   * Returns `{ success: true }` when audio starts playing, or
   * `{ success: false, error }` for any failure (timeout, network, abort,
   * busy-locked, empty text). Callers that auto-advance or record progress
   * MUST check `success` before running downstream logic.
   *
   * Pass `{ mode: "phonics" }` for letter-sound playback (different ElevenLabs
   * voice settings, separate cache namespace).
   */
  speak: (text: string, opts?: SpeakOptions) => Promise<SpeakResult>;
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
  // AbortController for the currently-in-flight synth + audio fetches.
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic request id: every call to speak() bumps this. Stale resolves
  // check the id before mutating state or starting playback.
  const reqIdRef = useRef(0);
  // Tracks whether THIS instance currently holds the global _ttsBusy lock.
  // Prevents the instance's own finally block from releasing a lock that was
  // already claimed by a newer speak() call or cleared by stop().
  const busyRef = useRef(false);

  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { voiceId, modelId, playbackRate, onFinished } = options;

  const playbackRateRef = useRef(playbackRate ?? 1);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    playbackRateRef.current = playbackRate ?? 1;
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

  // Release the global busy lock if this instance holds it.
  const releaseBusy = useCallback(() => {
    if (busyRef.current) {
      _ttsBusy = false;
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      reqIdRef.current += 1;
      abortInFlight();
      cleanup();
      releaseBusy();
      setSpeaking(false);
    };
  }, [abortInFlight, cleanup, releaseBusy]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    abortInFlight();
    cleanup();
    releaseBusy(); // release immediately — don't wait for async finally
    setSpeaking(false);
    setLoading(false);
  }, [abortInFlight, cleanup, releaseBusy]);

  const speak = useCallback(
    async (rawText: string, opts?: SpeakOptions): Promise<SpeakResult> => {
      const text = (rawText ?? "").trim();
      if (!text) return { success: false, error: "tts_empty_text" };
      const mode = opts?.mode;

      // Cross-instance guard: if a DIFFERENT instance is fetching, skip.
      // busyRef.current being true means THIS instance set the lock, so we
      // allow it to cancel its own previous call (cancel-and-restart UX).
      if (_ttsBusy && !busyRef.current) {
        console.warn("[TTS] skipped — another TTS instance is already in flight");
        return { success: false, error: "tts_skipped" };
      }

      // Cancel any in-flight fetch + playing audio on this instance.
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
      busyRef.current = true;

      try {
        logTtsClient("Request start", { chars: text.length, mode });
        const data = await synthesizeTts(
          authFetch,
          { text, voiceId, modelId, mode },
          { signal: controller.signal },
        );
        if (myId !== reqIdRef.current) return { success: false, error: "tts_cancelled" };
        logTtsClient("Synthesize OK", { cacheKey: data.cacheKey, cached: data.cached });

        const playbackUrl = resolveTtsAudioUrl(data.audioUrl);
        if (!playbackUrl) {
          console.warn("No audio URL");
          throw new Error("tts_missing_audio_url");
        }
        const audioRes = await authFetch(playbackUrl, { signal: controller.signal });
        if (myId !== reqIdRef.current) return { success: false, error: "tts_cancelled" };
        if (!audioRes.ok) {
          const errText = await audioRes.text().catch(() => "");
          throw new Error(`audio_fetch_failed_${audioRes.status}${errText ? `:${errText.slice(0, 80)}` : ""}`);
        }
        const blob = await audioRes.blob();
        if (myId !== reqIdRef.current) return { success: false, error: "tts_cancelled" };
        if (blob.size === 0) throw new Error("audio_empty_blob");
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
          const errCode = name === "NotAllowedError" ? "playback_blocked_tap_again" : `play_failed_${name}`;
          setError(errCode);
          cleanup();
          setSpeaking(false);
          return { success: false, error: errCode };
        }
        if (myId !== reqIdRef.current) {
          audio.pause();
          cleanup();
          return { success: false, error: "tts_cancelled" };
        }
        logTtsClient("Playback started");
        setSpeaking(true);
        return { success: true };

      } catch (err) {
        const errName = (err as { name?: string })?.name;
        if (errName === "AbortError") {
          if (myId === reqIdRef.current) {
            // Timeout abort (not superseded by a newer call or stop()).
            console.error("[TTS] timed out — request aborted after", TTS_TIMEOUT_MS, "ms");
            setError("tts_timeout");
            setSpeaking(false);
            return { success: false, error: "tts_timeout" };
          }
          return { success: false, error: "tts_cancelled" };
        }
        if (myId !== reqIdRef.current) return { success: false, error: "tts_cancelled" };
        logTtsClientError("speak failed", err);
        const errMsg = err instanceof Error ? err.message : "tts_failed";
        setError(errMsg);
        cleanup();
        setSpeaking(false);
        return { success: false, error: errMsg };

      } finally {
        clearTimeout(timeoutId);
        // Only release the global lock if this call still owns it
        // (i.e. it hasn't already been released by stop() or a newer call).
        if (myId === reqIdRef.current) {
          releaseBusy();
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [authFetch, cleanup, abortInFlight, releaseBusy, modelId, voiceId],
  );

  return { speaking, loading, error, speak, stop };
}
