// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition — Web Speech API wrapper with MediaRecorder fallback
//
// Primary:  window.SpeechRecognition / webkitSpeechRecognition (Chrome, Edge,
//           Safari 14.1+) — fully client-side, no server round-trip.
// Fallback: MediaRecorder → base64 → POST /api/speech/transcribe (Whisper)
//           used when the native API is unavailable (e.g. Firefox).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { getApiUrl } from "@/lib/api";
import { MicPermissionCapacitor } from "@/lib/mic-permission-capacitor";

// ── Web Speech API ambient declarations ─────────────────────────────────────
// These types are part of the WICG Speech API spec but are not yet included
// in TypeScript's bundled lib.dom.d.ts. We declare only the surface we use.
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative | undefined;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult | undefined;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
    webkitSpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
  }
}

function getNativeSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type RecognitionMode = "native" | "whisper" | "unsupported";

export interface SpeechRecognitionState {
  transcript: string;
  interimTranscript: string;
  listening: boolean;
  transcribing: boolean;
  mode: RecognitionMode;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// ── Android PWA mic-permission helper ────────────────────────────────────────
// On Android Chrome / PWA, SpeechRecognition.start() does NOT trigger the OS
// permission dialog on its own — it just fires onerror:"not-allowed" silently.
// We must call getUserMedia({audio:true}) first so the system dialog appears.
// Once the user grants access the browser caches it; subsequent calls return
// instantly without showing the dialog again.
//
// We also cache the result in a module-level ref so the prompt only ever shows
// once per page load (not on every tap-to-record). iOS Capacitor WKWebView can
// keep a stale "denied" across Settings → Allow → return without reloading JS;
// we reset that case (see ensureMicPermission + visibility listener below).
const _micPermCache: { state: "unknown" | "granted" | "denied" } = {
  state: "unknown",
};

let _micPermInFlight: Promise<"granted" | "denied"> | null = null;
let _iosMicVisibilityWired = false;

/**
 * Returns true when running inside the AmyNest Android WebView wrapper
 * (kidschedule-android APK). Detected via the custom UA token injected by
 * MainActivity: s.userAgentString += " AmyNestAndroid/<version>".
 *
 * We deliberately do NOT import isAmyNestWrapper() from native-push-bridge
 * here to avoid a circular-dependency risk in this low-level hook.
 */
function isAndroidWebViewWrapper(): boolean {
  try {
    return /AmyNestAndroid/.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/** Capacitor native iOS shell — same idea as native-push-bridge but kept local to avoid import cycles. */
function isCapacitorIOS(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      }
    ).Capacitor;
    return !!(cap?.isNativePlatform?.() === true && cap.getPlatform?.() === "ios");
  } catch {
    return false;
  }
}

/** After returning from iOS Settings (or task switcher), re-probe mic instead of trusting stale cache. */
function wireIosCapacitorMicCacheResetOnce(): void {
  if (_iosMicVisibilityWired || typeof document === "undefined" || typeof window === "undefined") return;
  if (!isCapacitorIOS()) return;
  _iosMicVisibilityWired = true;

  const onForeground = () => {
    try {
      if (document.visibilityState === "visible") _micPermCache.state = "unknown";
    } catch {
      /* ignore */
    }
  };
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("pageshow", onForeground);
}

async function ensureMicPermission(): Promise<"granted" | "denied"> {
  wireIosCapacitorMicCacheResetOnce();

  // iOS Capacitor: user may fix mic in Settings while our JS bundle stays warm — clear stale "denied".
  if (_micPermCache.state === "denied" && isCapacitorIOS()) {
    _micPermCache.state = "unknown";
  }

  if (_micPermCache.state !== "unknown") return _micPermCache.state;

  if (_micPermInFlight) return _micPermInFlight;

  const run = async (): Promise<"granted" | "denied"> => {
    try {
      // iOS Capacitor: AVAudioSession matches Settings; WKWebView Permissions API and
      // even getUserMedia can disagree or re-prompt. If native says granted, trust it.
      if (isCapacitorIOS()) {
        try {
          const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
          if (status === "granted") {
            _micPermCache.state = "granted";
            return "granted";
          }
          if (status === "denied") {
            _micPermCache.state = "denied";
            return "denied";
          }
        } catch {
          /* older builds without MicPermission — fall through */
        }
      }

      // ⚠️ Android WebView wrapper + iOS Capacitor WKWebView:
      // navigator.permissions.query({ name: "microphone" }) can disagree with the
      // real OS / embedder permission state. Skip it and use getUserMedia, which
      // is the source of truth for capture.
      const inWrapper = isAndroidWebViewWrapper();
      const skipPermissionsQuery = inWrapper || isCapacitorIOS();

      if (!skipPermissionsQuery && typeof navigator !== "undefined" && navigator.permissions) {
        try {
          const status = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          if (status.state === "granted") {
            _micPermCache.state = "granted";
            return "granted";
          }
          if (status.state === "denied") {
            _micPermCache.state = "denied";
            return "denied";
          }
          // state === "prompt" — fall through to getUserMedia below
        } catch {
          // Permissions API not supported — fall through
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // release immediately
        _micPermCache.state = "granted";
        return "granted";
      } catch {
        if (isCapacitorIOS()) {
          try {
            const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
            if (status === "granted") {
              _micPermCache.state = "granted";
              return "granted";
            }
          } catch {
            /* ignore */
          }
        }
        _micPermCache.state = "denied";
        return "denied";
      }
    } finally {
      _micPermInFlight = null;
    }
  };

  _micPermInFlight = run();
  return _micPermInFlight;
}

// Normalise SpeechRecognition error codes → our own error keys
function normaliseSpeechError(code: string): string {
  if (code === "not-allowed" || code === "permission-denied")
    return "microphone_denied";
  if (code === "service-not-allowed") return "microphone_denied";
  if (code === "audio-capture") return "recognition_start_failed";
  return code;
}

export interface UseSpeechRecognitionOptions {
  /** For Capacitor iOS (and other cookie-less shells): Bearer token for `/api/speech/transcribe`. */
  getAuthToken?: () => Promise<string | null>;
}

export function useSpeechRecognition(
  lang = "en-US",
  options?: UseSpeechRecognitionOptions,
): SpeechRecognitionState {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const getAuthTokenRef = useRef(options?.getAuthToken);
  getAuthTokenRef.current = options?.getAuthToken;

  const Cls = getNativeSpeechRecognition();
  const mode: RecognitionMode =
    Cls !== null
      ? "native"
      : typeof navigator !== "undefined" && navigator.mediaDevices !== undefined
        ? "whisper"
        : "unsupported";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recRef.current?.abort();
      mediaRecRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const reset = useCallback(() => {
    recRef.current?.abort();
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setTranscript("");
    setInterimTranscript("");
    setListening(false);
    setTranscribing(false);
    setError(null);
  }, []);

  // ── Native Web Speech API path ──────────────────────────────────────────────
  const startNative = useCallback(async () => {
    if (!Cls) return;
    setTranscript("");
    setInterimTranscript("");
    setError(null);

    // ⚠️ Android PWA fix: request mic permission explicitly before starting
    // recognition, so the OS dialog appears instead of silently failing.
    const perm = await ensureMicPermission();
    if (perm === "denied") {
      setError("microphone_denied");
      return;
    }

    const rec = new Cls();
    recRef.current = rec;
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      const code = normaliseSpeechError(e.error);
      if (code !== "aborted") setError(code);
      // Reset cached permission if user revoked it mid-session
      if (code === "microphone_denied") _micPermCache.state = "unknown";
      setListening(false);
    };
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) final += text;
        else interim += text;
      }
      if (final) setTranscript((prev) => (prev + " " + final).trim());
      setInterimTranscript(interim);
    };

    try {
      rec.start();
    } catch {
      setError("recognition_start_failed");
    }
  }, [Cls, lang]);

  const stopNative = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  // ── Whisper fallback path (MediaRecorder → /api/speech/transcribe) ──────────
  const startWhisper = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _micPermCache.state = "granted";
    } catch {
      _micPermCache.state = "denied";
      setError("microphone_denied");
      return;
    }
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    const rec = new MediaRecorder(stream, { mimeType });
    mediaRecRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setListening(false);
      if (chunksRef.current.length === 0) return;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer)),
      );

      setTranscribing(true);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        try {
          const tok = await getAuthTokenRef.current?.();
          if (tok) headers.Authorization = `Bearer ${tok}`;
        } catch {
          /* ignore — Whisper may still work with cookies on web */
        }
        const r = await fetch(getApiUrl("/api/speech/transcribe"), {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ audioBase64: base64 }),
        });
        if (!r.ok) {
          if (r.status === 401) setError("transcription_auth_failed");
          else setError("transcription_failed");
          return;
        }
        const j = (await r.json()) as { transcript: string };
        setTranscript(j.transcript ?? "");
      } catch {
        setError("transcription_failed");
      } finally {
        setTranscribing(false);
      }
    };

    rec.start();
    setListening(true);
  }, []);

  const stopWhisper = useCallback(() => {
    mediaRecRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (mode === "native") void startNative();
    else if (mode === "whisper") void startWhisper();
    else setError("unsupported");
  }, [mode, startNative, startWhisper]);

  const stop = useCallback(() => {
    if (mode === "native") stopNative();
    else stopWhisper();
  }, [mode, stopNative, stopWhisper]);

  return {
    transcript,
    interimTranscript,
    listening,
    transcribing,
    mode,
    error,
    start,
    stop,
    reset,
  };
}
