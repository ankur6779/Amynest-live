// audit-block-ignore-start -- immersive Speech Coach uses intentional neon dark UI accents.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { useListChildren, useLogSpeechPracticeAttempt } from "@workspace/api-client-react";
import {
  compareTranscript,
  getPromptsPool,
  type PronouncePrompt,
  type PronouncePromptDifficulty,
  type PronouncePromptKind,
} from "@workspace/speech-coach";
import { AmyIcon } from "@/components/amy-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { recordTtsUserGesture } from "@/lib/tts-guard";

type AnyChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

type CoachState =
  | "idle"
  | "ai_speaking"
  | "listening"
  | "processing"
  | "feedback"
  | "next_task"
  | "complete";

type AgeMode = {
  label: string;
  intro: string;
  kind: PronouncePromptKind;
  difficulty: PronouncePromptDifficulty;
  sessionSize: number;
};

type Result = {
  correct: boolean;
  confidence: number;
  feedback: string;
  improvement: string | null;
  transcript: string;
  points: number;
};

const DEFAULT_TASKS: PronouncePrompt[] = [
  { id: "live_cat", kind: "word", text: "cat", ageBands: ["3y"], i18nKeyHint: "", difficulty: "easy" },
  { id: "live_ball", kind: "word", text: "ball", ageBands: ["3y"], i18nKeyHint: "", difficulty: "easy" },
  { id: "live_star", kind: "word", text: "star", ageBands: ["3y"], i18nKeyHint: "", difficulty: "medium" },
  { id: "live_happy", kind: "word", text: "happy", ageBands: ["3y"], i18nKeyHint: "", difficulty: "medium" },
  { id: "live_fun", kind: "sentence", text: "This is fun.", ageBands: ["4y_plus"], i18nKeyHint: "", difficulty: "medium" },
];

function totalMonths(c: AnyChild): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let s = seed || 1;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function getAgeMode(months: number): AgeMode {
  if (months < 72) {
    return {
      label: "Ages 3-5",
      intro: "Fun word practice with lots of encouragement.",
      kind: "word",
      difficulty: "easy",
      sessionSize: 6,
    };
  }
  if (months < 108) {
    return {
      label: "Ages 6-8",
      intro: "Words and short phrases with simple corrections.",
      kind: "word",
      difficulty: "medium",
      sessionSize: 8,
    };
  }
  return {
    label: "Ages 9-10",
    intro: "Sentence practice focused on fluency and clarity.",
    kind: "sentence",
    difficulty: "advanced",
    sessionSize: 8,
  };
}

function buildTasks(months: number): PronouncePrompt[] {
  const mode = getAgeMode(months);
  const primary = [...getPromptsPool(months, mode.kind, mode.difficulty)];
  const secondary =
    mode.kind === "sentence"
      ? [...getPromptsPool(months, "word", "advanced")]
      : [...getPromptsPool(months, "sentence", mode.difficulty)];
  const pool = [...primary, ...secondary, ...DEFAULT_TASKS];
  const unique = Array.from(new Map(pool.map((p) => [p.id, p])).values());
  return seededShuffle(unique, Date.now()).slice(0, Math.min(mode.sessionSize, unique.length));
}

function speakPromptText(task: PronouncePrompt, mode: AgeMode): string {
  if (mode.kind === "sentence") return `Listen carefully. Can you say: ${task.text}`;
  return `Can you say: ${task.text.toUpperCase()}?`;
}

function correctionFor(task: PronouncePrompt, mode: AgeMode): string {
  if (mode.kind === "sentence") return `Good try. Slow down and say: ${task.text}`;
  return `Good try. Say it like this: ${task.text.split("").join("-")}.`;
}

function playCue(type: "success" | "retry") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "success" ? 740 : 260;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    /* sound effects are best-effort */
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function evaluate(task: PronouncePrompt, transcript: string, mode: AgeMode): Result {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      correct: false,
      confidence: 0,
      feedback: "I did not hear you. Try again.",
      improvement: "Come closer to the microphone and say it one more time.",
      transcript: "",
      points: 0,
    };
  }

  const result = compareTranscript(task.text, trimmed);
  const correct = result.score >= 80;
  const close = result.score >= 50;
  const confidence = Math.round(result.score) / 100;

  if (correct) {
    return {
      correct: true,
      confidence,
      feedback: mode.kind === "sentence" ? "Awesome! That was clear and fluent." : "Awesome! That sounded great!",
      improvement: null,
      transcript: trimmed,
      points: 10,
    };
  }

  return {
    correct: false,
    confidence,
    feedback: close ? "So close. Let's make it clearer." : "Let's try that one more time.",
    improvement: correctionFor(task, mode),
    transcript: trimmed,
    points: close ? 4 : 0,
  };
}

function StarsBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="absolute h-5 w-5 animate-ping fill-yellow-300 text-yellow-300"
          style={{
            left: `${18 + i * 13}%`,
            top: `${18 + (i % 3) * 18}%`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function AmyHero({ state, success }: { state: CoachState; success: boolean }) {
  const listening = state === "listening";
  const speaking = state === "ai_speaking" || state === "feedback" || state === "next_task";
  const thinking = state === "processing";
  return (
    <div className="relative flex min-h-[320px] items-center justify-center">
      <StarsBurst show={success} />
      <div
        className={[
          "absolute h-72 w-72 rounded-full blur-3xl transition-all duration-500",
          listening ? "bg-cyan-400/30" : speaking ? "bg-fuchsia-500/35" : "bg-violet-500/20",
        ].join(" ")}
      />
      {listening && <div className="absolute h-56 w-56 animate-ping rounded-full border border-cyan-300/50" />}
      <div
        className={[
          "relative grid h-52 w-52 place-items-center rounded-full border bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-500",
          speaking ? "scale-105 border-fuchsia-300/70 shadow-fuchsia-500/40" : "",
          listening ? "scale-110 border-cyan-300/80 shadow-cyan-500/40" : "",
          thinking ? "border-amber-300/80 shadow-amber-500/40" : "",
        ].join(" ")}
      >
        {thinking && <Loader2 className="absolute h-56 w-56 animate-spin text-amber-200/50" />}
        <AmyIcon size={132} ring bounce={success || speaking} />
      </div>
    </div>
  );
}

function LiveSpeechCoach({ child }: { child: AnyChild }) {
  const ageMonths = totalMonths(child);
  const mode = useMemo(() => getAgeMode(ageMonths), [ageMonths]);
  const [tasks, setTasks] = useState<PronouncePrompt[]>(() => buildTasks(ageMonths));
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<CoachState>("idle");
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState("Tap Start and Amy will begin.");
  const [hasStarted, setHasStarted] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const stateRef = useRef<CoachState>("idle");
  const ttsPurposeRef = useRef<"prompt" | "feedback" | "complete" | null>(null);
  const listenStartedRef = useRef(false);
  const logAttempt = useLogSpeechPracticeAttempt();

  const getAuthToken = useCallback(async () => {
    try {
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);
  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const voice = useAmyVoice({
    onFinished: () => {
      if (ttsPurposeRef.current === "prompt") {
        setState("idle");
        setStatus("Tap the mic and say it back.");
      }
      if (ttsPurposeRef.current === "feedback") {
        setState("next_task");
      }
      ttsPurposeRef.current = null;
    },
  });

  const current = tasks[idx] ?? null;
  const progressPct = tasks.length > 0 ? ((idx + (state === "complete" ? 1 : 0)) / tasks.length) * 100 : 0;
  const canRecord = hasStarted && current && (state === "idle" || state === "listening");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setTasks(buildTasks(ageMonths));
    setIdx(0);
    setState("idle");
    setLastResult(null);
    setScore(0);
    setStreak(0);
    setStatus("Tap Start and Amy will begin.");
    setHasStarted(false);
    stt.reset();
    voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, ageMonths]);

  useEffect(() => {
    if (state !== "listening") return;
    if (!listenStartedRef.current) return;
    if (stt.listening || stt.transcribing) return;
    const transcript = stt.transcript.trim();
    if (!transcript && !stt.error) return;
    void processResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stt.listening, stt.transcribing, stt.transcript, stt.error]);

  const speak = useCallback(
    async (text: string, purpose: "prompt" | "feedback" | "complete") => {
      ttsPurposeRef.current = purpose;
      setState(purpose === "prompt" ? "ai_speaking" : purpose === "complete" ? "complete" : "feedback");
      setStatus(purpose === "prompt" ? "Amy is speaking..." : text);
      const result = await voice.speak(text);
      if (!result.success) {
        if (purpose === "prompt") {
          setState("idle");
          setStatus("Tap the mic and say it back.");
        } else if (purpose === "feedback") {
          setState("next_task");
        }
        ttsPurposeRef.current = null;
      }
    },
    [voice],
  );

  const startSession = useCallback(() => {
    recordTtsUserGesture();
    setHasStarted(true);
    setLastResult(null);
    if (!current) return;
    void speak(speakPromptText(current, mode), "prompt");
  }, [current, mode, speak]);

  const startListening = useCallback(() => {
    if (!canRecord || state !== "idle") {
      if (state === "listening") stt.stop();
      return;
    }
    listenStartedRef.current = true;
    stt.reset();
    voice.stop();
    setLastResult(null);
    setState("listening");
    setStatus("Listening...");
    stt.start();
  }, [canRecord, state, stt, voice]);

  const processResponse = useCallback(async () => {
    if (!current) return;
    listenStartedRef.current = false;
    setState("processing");
    setStatus("Checking your voice...");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const result = evaluate(current, stt.transcript, mode);
    setLastResult(result);
    setScore((n) => n + result.points);
    setStreak((n) => (result.correct ? n + 1 : 0));
    playCue(result.correct ? "success" : "retry");
    setSuccessFlash(result.correct);
    window.setTimeout(() => setSuccessFlash(false), 900);
    logAttempt.mutate({ data: { childId: child.id, promptId: current.id } });

    const feedbackText = result.correct
      ? result.feedback
      : `${result.feedback} ${result.improvement ?? ""}`;
    await speak(feedbackText, "feedback");
  }, [child.id, current, logAttempt, mode, speak, stt.transcript]);

  useEffect(() => {
    if (state !== "listening") return;
    const id = window.setTimeout(() => {
      if (stateRef.current !== "listening") return;
      stt.stop();
      window.setTimeout(() => {
        if (stateRef.current === "listening") void processResponse();
      }, 350);
    }, 8000);
    return () => window.clearTimeout(id);
  }, [processResponse, state, stt]);

  const nextTask = useCallback(() => {
    stt.reset();
    setLastResult(null);
    if (idx >= tasks.length - 1) {
      const message = `You did amazing! You scored ${score} points with a streak of ${streak}.`;
      void speak(message, "complete");
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    const next = tasks[nextIdx];
    if (next) void speak(speakPromptText(next, mode), "prompt");
  }, [idx, mode, score, speak, streak, stt, tasks]);

  const retryTask = useCallback(() => {
    stt.reset();
    setLastResult(null);
    if (current) void speak(speakPromptText(current, mode), "prompt");
  }, [current, mode, speak, stt]);

  const restart = useCallback(() => {
    const fresh = buildTasks(ageMonths);
    setTasks(fresh);
    setIdx(0);
    setScore(0);
    setStreak(0);
    setLastResult(null);
    setState("idle");
    setStatus("Tap Start and Amy will begin.");
    setHasStarted(false);
    stt.reset();
    voice.stop();
  }, [ageMonths, stt, voice]);

  if (!current && state !== "complete") {
    return (
      <EmptyFullScreen title="No speech tasks ready" body="Please try again after adding practice prompts." />
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070812] text-white" data-testid="live-speech-coach-page">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <Link href="/speech-coach">
            <Button variant="ghost" size="icon" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Live AI Speech Coach</p>
            <h1 className="truncate font-quicksand text-xl font-black">{child.name}'s voice session</h1>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
            Step {Math.min(idx + 1, tasks.length)}/{tasks.length}
          </div>
        </header>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-yellow-300 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_-30px_rgba(168,85,247,0.75)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 text-xs text-white/70">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-bold text-cyan-100">{mode.label}</span>
            <span>{mode.intro}</span>
          </div>
          <AmyHero state={state} success={successFlash} />
          <div className="space-y-3 text-center">
            {state !== "complete" && current && (
              <>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">Say this</p>
                <p className="font-quicksand text-4xl font-black tracking-wide text-white drop-shadow">
                  {current.text}
                </p>
              </>
            )}
            {state === "complete" && (
              <div className="space-y-2">
                <Trophy className="mx-auto h-12 w-12 fill-yellow-300 text-yellow-300" />
                <p className="font-quicksand text-3xl font-black">You did amazing!</p>
                <p className="text-white/70">Score: {score} points</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-auto space-y-4 pb-4 pt-5">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Points" value={score} />
            <Stat label="Streak" value={streak} />
            <Stat label="Mode" value={stt.mode === "native" ? "STT" : stt.mode} />
          </div>

          {lastResult && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-2 ${lastResult.correct ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{lastResult.feedback}</p>
                  {lastResult.improvement && <p className="mt-1 text-sm text-white/65">{lastResult.improvement}</p>}
                  <p className="mt-2 text-xs text-white/45">
                    Accuracy {Math.round(lastResult.confidence * 100)}%
                    {lastResult.transcript ? ` - Heard: "${lastResult.transcript}"` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="min-h-6 text-center text-sm font-bold text-white/75" aria-live="polite">
            {stt.error ? "I could not access the microphone. Please try again." : status}
          </p>

          {state !== "complete" ? (
            <div className="flex items-center justify-center gap-3">
              {hasStarted && (
                <Button type="button" variant="ghost" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={retryTask}>
                  <Volume2 className="h-4 w-4" />
                  Hear again
                </Button>
              )}
              {!hasStarted ? (
                <Button type="button" size="lg" className="h-16 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-10 text-base font-black text-white shadow-[0_0_40px_rgba(34,211,238,0.35)]" onClick={startSession}>
                  <Sparkles className="h-5 w-5" />
                  Start Live Session
                </Button>
              ) : (
                <button
                  type="button"
                  disabled={!canRecord && state !== "listening"}
                  onClick={startListening}
                  className={[
                    "grid h-20 w-20 place-items-center rounded-full border text-white transition-all",
                    state === "listening"
                      ? "animate-pulse border-cyan-200 bg-cyan-400/30 shadow-[0_0_45px_rgba(34,211,238,0.65)]"
                      : "border-fuchsia-200/70 bg-fuchsia-500/30 shadow-[0_0_40px_rgba(217,70,239,0.45)]",
                    !canRecord && state !== "listening" ? "opacity-50" : "active:scale-95",
                  ].join(" ")}
                  aria-label={state === "listening" ? "Stop listening" : "Start listening"}
                >
                  {state === "processing" ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-9 w-9" />}
                </button>
              )}
              {state === "next_task" && (
                <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={nextTask}>
                  Next
                </Button>
              )}
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                New Session
              </Button>
              <Link href="/speech-coach">
                <Button type="button" variant="ghost" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
                  Back to Speech Coach
                </Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 font-quicksand text-lg font-black text-white">{value}</p>
    </div>
  );
}

function EmptyFullScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#070812] p-4 text-white">
      <Card className="max-w-sm rounded-3xl border-white/10 bg-white/[0.06] text-white">
        <CardContent className="space-y-3 p-6 text-center">
          <AmyIcon size={56} ring bounce />
          <h1 className="font-quicksand text-xl font-black">{title}</h1>
          <p className="text-sm text-white/65">{body}</p>
          <Link href="/parenting-hub">
            <Button className="rounded-full">Back to Parent Hub</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LiveSpeechCoachPage() {
  const childrenQuery = useListChildren();
  const childList = (childrenQuery.data ?? []) as AnyChild[];
  const eligible = childList.filter((c) => {
    const months = totalMonths(c);
    return months >= 36 && months < 132;
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const child = eligible.find((c) => c.id === selectedId) ?? eligible[0] ?? null;

  if (childrenQuery.isLoading) {
    return <EmptyFullScreen title="Loading Speech Coach" body="Getting Amy ready for a live voice session." />;
  }

  if (!child) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070812] p-4 text-white">
        <Card className="max-w-sm rounded-3xl border-white/10 bg-white/[0.06] text-white">
          <CardContent className="space-y-4 p-6 text-center">
            <AmyIcon size={64} ring bounce />
            <div>
              <h1 className="font-quicksand text-xl font-black">Speech Coach is for ages 3-10</h1>
              <p className="mt-2 text-sm text-white/65">Add or select a child between 3 and 10 years old to start a live session.</p>
            </div>
            <div className="flex justify-center gap-2">
              <Link href="/children/new">
                <Button className="rounded-full">Add Child</Button>
              </Link>
              <Link href="/speech-coach">
                <Button variant="ghost" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">Back</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      {eligible.length > 1 && (
        <div className="fixed left-1/2 top-16 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
          {eligible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={[
                "rounded-full px-3 py-1 text-xs font-black transition-colors",
                child.id === c.id ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <LiveSpeechCoach child={child} />
    </>
  );
}
