// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition — Web Speech API wrapper with MediaRecorder fallback
//
// Primary:  window.SpeechRecognition / webkitSpeechRecognition (Chrome, Edge,
//           Safari 14.1+) — fully client-side, no server round-trip.
// Fallback: MediaRecorder → base64 → POST /api/speech/transcribe (Whisper)
//           used when the native API is unavailable (e.g. Firefox).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";

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

export function useSpeechRecognition(lang = "en-US"): SpeechRecognitionState {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
  const startNative = useCallback(() => {
    if (!Cls) return;
    setTranscript("");
    setInterimTranscript("");
    setError(null);

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
      const code = e.error;
      if (code !== "aborted") setError(code);
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
    } catch {
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
        const r = await fetch("/api/speech/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ audioBase64: base64 }),
        });
        if (!r.ok) throw new Error(`${r.status}`);
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
    if (mode === "native") startNative();
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
