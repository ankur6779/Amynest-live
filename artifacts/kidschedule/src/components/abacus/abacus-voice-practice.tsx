import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Optional voice answer — degrades gracefully when SpeechRecognition is unavailable. */
export function AbacusVoicePractice({
  expectedAnswer,
  language = "en",
  onResult,
  disabled,
}: {
  expectedAnswer: number;
  language?: string;
  onResult: (meta: {
    heard: string;
    correct: boolean;
    confidence: "high" | "medium" | "low";
    responseMs: number;
  }) => void;
  disabled?: boolean;
}) {
  const Ctor = getSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => Boolean(Ctor));
  const [lastHeard, setLastHeard] = useState("");
  const startedAt = useRef(0);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const toggle = useCallback(() => {
    if (!Ctor || disabled) return;
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = language.startsWith("hi") ? "hi-IN" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    startedAt.current = Date.now();
    rec.onresult = (ev) => {
      const transcript = String(ev.results?.[0]?.[0]?.transcript ?? "").trim();
      setLastHeard(transcript);
      const digits = transcript.replace(/[^\d-]/g, "");
      const parsed = Number.parseInt(digits, 10);
      const correct = Number.isFinite(parsed) && parsed === expectedAnswer;
      const responseMs = Date.now() - startedAt.current;
      const confidence: "high" | "medium" | "low" =
        responseMs < 2500 ? "high" : responseMs < 5000 ? "medium" : "low";
      onResult({ heard: transcript, correct, confidence, responseMs });
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Ctor, disabled, expectedAnswer, language, listening, onResult]);

  if (!supported) {
    return (
      <p className="text-[10px] text-muted-foreground text-center" data-testid="abacus-voice-unsupported">
        Voice answers need a browser with speech recognition — tap Check instead.
      </p>
    );
  }

  return (
    <div className="space-y-1" data-testid="abacus-voice-practice">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold min-h-[44px]",
          listening
            ? "border-rose-400 bg-rose-500/15 text-rose-700"
            : "border-teal-400/40 bg-teal-500/10 text-teal-800 dark:text-teal-200",
        )}
        aria-pressed={listening}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? "Listening… say the answer" : "Answer with voice"}
      </button>
      {lastHeard && (
        <p className="text-[10px] text-center text-muted-foreground">Heard: “{lastHeard}”</p>
      )}
    </div>
  );
}
