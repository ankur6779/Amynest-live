// audit-block-ignore-start -- immersive Speech Coach uses intentional neon dark UI accents.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Loader2, Mic, PhoneOff, Sparkles, Star, Trophy, Volume2 } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { AmyIcon } from "@/components/amy-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { usePrimeIosMicrophone } from "@/hooks/use-prime-ios-microphone";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import { useListChildren, useGetSpeechProgress } from "@workspace/api-client-react";
import {
  buildCoachSessionMemory,
  daysSinceLastSession,
  isSpeechCoachEligibleAgeMonths,
  type CoachSessionMemory,
  type PronouncePromptKind,
  type SessionAttemptInput,
} from "@workspace/speech-coach";
import { getApiUrl } from "@/lib/api";
import { resolveAiApiData, type AuthFetchFn } from "@/lib/poll-result";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import { openAndroidMicrophoneSettings } from "@/lib/microphone-permission";
import {
  getSpeechCoachMicStatusMessage,
  loadCoachLocalSnapshot,
  saveCoachJourneySnapshot,
} from "./speech-coach-utils";

type AnyChild = { id: number; name: string; age: number; ageMonths?: number | null };

type UiPhase = "idle" | "amy_speaking" | "listening" | "thinking" | "ended";
type ServerPhase = "warmup" | "practice" | "wind_down" | "closing";

type SessionReport = {
  summary: string;
  focusWords: { word: string; score: number }[];
  nextFocus: string;
  clarity: number;
};

type ReplyShape = { say: string; question: string | null; report?: SessionReport | null };

type ConverseResponse = {
  jobId?: string;
  reply?: ReplyShape;
  content?: string | null;
  remainingSeconds?: number;
  limitSeconds?: number;
  resetsAt?: string | null;
};

type MemoryPayload = {
  isReturning: boolean;
  totalSessions?: number;
  lastSummary?: string | null;
  lastNextFocus?: string | null;
  targetSounds?: string[];
  masteredSounds?: string[];
  tone?: "supportive" | "balanced" | "challenging";
  daysSinceLast?: number | null;
};

const TOTAL_BUDGET_SECONDS = 300;
const MAX_LISTEN_MS = 9000;
/** Below this remaining time, Amy starts wrapping up. */
const WIND_DOWN_AT = 80;
/** Below this remaining time, Amy gives the closing goodbye + report. */
const CLOSING_AT = 30;

const CONVO_MEMORY_KEY = "speech_convo_memory_v1";

type ConvoMemory = { childId: number; lastSummary: string | null; lastNextFocus: string | null };

function loadConvoMemory(childId: number): ConvoMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONVO_MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConvoMemory;
    return parsed?.childId === childId ? parsed : null;
  } catch {
    return null;
  }
}

function saveConvoMemory(mem: ConvoMemory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONVO_MEMORY_KEY, JSON.stringify(mem));
  } catch {
    /* ignore quota / private mode */
  }
}

function totalMonths(c: AnyChild): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function slug(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || "word";
}

function parseReply(content: string | null | undefined): ReplyShape | null {
  if (!content) return null;
  try {
    const j = JSON.parse(content) as { say?: unknown; question?: unknown; report?: unknown };
    if (typeof j.say === "string" && j.say.trim()) {
      return {
        say: j.say.trim(),
        question: typeof j.question === "string" ? j.question : null,
        report: (j.report as SessionReport | null) ?? null,
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

function buildMemoryPayload(mem: CoachSessionMemory | undefined, convo: ConvoMemory | null): MemoryPayload {
  if (!mem) return { isReturning: false };
  const targets = [
    ...mem.journey.strugglingSounds.map((s) => s.promptText),
    ...mem.weakSounds.map((w) => w.promptText),
  ];
  return {
    isReturning: mem.isReturning,
    totalSessions: mem.totalSessions,
    lastSummary: convo?.lastSummary ?? null,
    lastNextFocus: convo?.lastNextFocus ?? null,
    targetSounds: Array.from(new Set(targets)).filter(Boolean).slice(0, 6),
    masteredSounds: mem.journey.masteredSounds.map((s) => s.promptText).filter(Boolean).slice(0, 6),
    tone: mem.tone,
    daysSinceLast: daysSinceLastSession(mem.lastSessionDate),
  };
}

const PHASE_LABEL: Record<ServerPhase, string> = {
  warmup: "Warming up",
  practice: "Practicing",
  wind_down: "Wrapping up",
  closing: "All done!",
};

function ConversationCoach({ child }: { child: AnyChild }) {
  const [, setLocation] = useLocation();
  const authFetch = useAuthFetch();
  const { recordActivity } = useRecordLearningActivity(child.id);
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });

  const localSnapshot = useMemo(() => loadCoachLocalSnapshot(child.id), [child.id]);
  const convoMemory = useMemo(() => loadConvoMemory(child.id), [child.id]);
  const coachMemory = useMemo<CoachSessionMemory | undefined>(() => {
    const p = progress.data;
    if (!p) return undefined;
    return buildCoachSessionMemory(
      {
        promptsAttempted: p.promptsAttempted,
        promptsClear: p.promptsClear,
        pronunciationPct: p.pronunciationPct,
        streakDays: p.streakDays,
        daysActive: p.daysActive,
        dailyTrend: p.dailyTrend,
        weakSounds: p.weakSounds,
      },
      localSnapshot,
    );
  }, [progress.data, localSnapshot]);

  const memoryPayload = useMemo(() => buildMemoryPayload(coachMemory, convoMemory), [coachMemory, convoMemory]);
  const memoryRef = useRef(memoryPayload);
  memoryRef.current = memoryPayload;

  const [serverMem, setServerMem] = useState<MemoryPayload | null>(null);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [serverPhase, setServerPhase] = useState<ServerPhase>("warmup");
  const [status, setStatus] = useState("Tap Start and Amy will say hello!");
  const [messages, setMessages] = useState<{ role: "child" | "amy"; text: string }[]>([]);
  const [remaining, setRemaining] = useState<number>(TOTAL_BUDGET_SECONDS);
  const [resetsAt, setResetsAt] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<"completed" | "budget" | "user" | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [startingMic, setStartingMic] = useState(false);
  const [micSettingsOpen, setMicSettingsOpen] = useState(false);

  const phaseRef = useRef<UiPhase>("idle");
  const lastTurnTsRef = useRef<number>(Date.now());
  const messagesRef = useRef<{ role: "child" | "amy"; text: string }[]>([]);
  const remainingRef = useRef<number>(TOTAL_BUDGET_SECONDS);
  const lastServerPhaseRef = useRef<ServerPhase>("warmup");
  const listenStartedRef = useRef(false);
  const startingMicRef = useRef(false);
  const sessionActiveRef = useRef(false);

  const getAuthToken = useCallback(async () => {
    try {
      const { getAuth } = await import("firebase/auth");
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const stt = useSpeechRecognition("en-US", { getAuthToken });
  const voice = useAmyVoice();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  useEffect(() => {
    warmSpeechCoach([`Hi ${child.name}! I'm so happy to talk with you today.`, "What did you do today?"]);
  }, [child.name]);

  const apiFetch: AuthFetchFn = useCallback(
    (input, init, timeoutMs) => {
      const url = typeof input === "string" ? getApiUrl(input) : input;
      return authFetch(url, init, timeoutMs);
    },
    [authFetch],
  );

  // Cross-device memory: load this child's talk-bot history from the server.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(
          getApiUrl(`/api/speech/converse/memory?childId=${child.id}`),
          { method: "GET" },
          15_000,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { memory?: MemoryPayload };
        if (!cancelled && data.memory) setServerMem(data.memory);
      } catch {
        /* welcome-back is best-effort; local memory still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, child.id]);

  const speakLines = useCallback(
    async (lines: (string | null)[]) => {
      for (const line of lines) {
        const text = (line ?? "").trim();
        if (!text) continue;
        // Freeform conversational text has no coach audioIdentity, so use the
        // default speak path (coach:true would fail with coach_identity_missing).
        const result = await voice.speak(text, { mode: "default" });
        if (!result.success) break;
      }
    },
    [voice],
  );

  const persistSession = useCallback(
    (rep: SessionReport | null) => {
      const attempts: SessionAttemptInput[] = (rep?.focusWords ?? [])
        .filter((f) => f.word && f.word.trim())
        .slice(0, 6)
        .map((f) => ({
          promptId: `convo_${slug(f.word)}`,
          promptText: f.word.trim(),
          kind: (f.word.trim().includes(" ") ? "sentence" : "word") as PronouncePromptKind,
          score: Math.max(0, Math.min(100, Math.round(f.score))),
        }));
      const scores = attempts.map((a) => a.score);
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : Math.round(rep?.clarity ?? 70);
      try {
        saveCoachJourneySnapshot(
          {
            childId: child.id,
            score: avg,
            bestStreak: 0,
            itemsCompleted: attempts.length,
            attempts,
            activity: "live",
            perfectSession: attempts.length > 0 && attempts.every((a) => a.score >= 80),
          },
          localSnapshot,
        );
      } catch {
        /* memory persistence is best-effort */
      }
      saveConvoMemory({
        childId: child.id,
        lastSummary: rep?.summary?.trim() || null,
        lastNextFocus: rep?.nextFocus?.trim() || null,
      });
      // Cross-device: persist the session report to server memory.
      void authFetch(
        getApiUrl("/api/speech/converse/complete"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId: child.id, report: rep ?? {} }),
        },
        15_000,
      )
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json().catch(() => null)) as { memory?: MemoryPayload } | null;
          if (data?.memory) setServerMem(data.memory);
        })
        .catch(() => undefined);
      void recordActivity({
        activityId: `speech_convo_${Date.now()}`,
        section: "speech",
        correct: avg > 0,
        analyticsEvent: "speech_improved",
        metadata: { clarity: Math.round(rep?.clarity ?? avg), words: attempts.length, activity: "conversation" },
      }).catch(() => undefined);
    },
    [child.id, localSnapshot, recordActivity, authFetch],
  );

  const endConversation = useCallback(
    (reason: "completed" | "budget" | "user", rep?: SessionReport | null) => {
      sessionActiveRef.current = false;
      listenStartedRef.current = false;
      stt.stop();
      if (rep) {
        setReport(rep);
        persistSession(rep);
      }
      setEndedReason(reason);
      setServerPhase("closing");
      setPhase("ended");
      setStatus(
        reason === "budget"
          ? "That's all our talking time for today. Great job!"
          : reason === "completed"
            ? "Great session! Amy is proud of you."
            : "Chat ended. Come back soon!",
      );
    },
    [persistSession, stt],
  );

  const startListening = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    if (startingMicRef.current) return;
    startingMicRef.current = true;
    setStartingMic(true);
    stt.reset();
    voice.pause();
    setStatus("Listening... your turn to talk!");
    const ok = await stt.start();
    startingMicRef.current = false;
    setStartingMic(false);
    if (!ok) {
      listenStartedRef.current = false;
      setPhase("amy_speaking");
      setStatus(
        stt.error
          ? getSpeechCoachMicStatusMessage({ error: stt.error, sessionStatus: stt.status, fallbackStatus: "Tap the mic to talk." })
          : "Tap the mic to talk.",
      );
      return;
    }
    listenStartedRef.current = true;
    setPhase("listening");
  }, [stt, voice]);

  const pickPhase = useCallback((kickoff: boolean): ServerPhase => {
    if (kickoff) return "warmup";
    const r = remainingRef.current;
    if (r <= CLOSING_AT || lastServerPhaseRef.current === "wind_down") return "closing";
    if (r <= WIND_DOWN_AT) return "wind_down";
    return "practice";
  }, []);

  const sendTurn = useCallback(
    async (message: string, kickoff: boolean) => {
      if (!sessionActiveRef.current && !kickoff) return;
      const turnPhase = pickPhase(kickoff);
      lastServerPhaseRef.current = turnPhase;
      setServerPhase(turnPhase);
      setPhase("thinking");
      setStatus("Amy is thinking...");

      const now = Date.now();
      const elapsedSeconds = kickoff ? 0 : Math.max(0, (now - lastTurnTsRef.current) / 1000);
      lastTurnTsRef.current = now;

      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ role: m.role === "amy" ? "amy" : "child", text: m.text }));

      try {
        const res = await authFetch(
          getApiUrl("/api/speech/converse"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              childId: child.id,
              kickoff,
              phase: turnPhase,
              message: kickoff ? undefined : message,
              elapsedSeconds: Math.round(elapsedSeconds),
              memory: memoryRef.current,
              history,
            }),
          },
          30_000,
        );

        if (res.status === 402) {
          const body = (await res.json().catch(() => ({}))) as ConverseResponse;
          setRemaining(0);
          setResetsAt(body.resetsAt ?? null);
          // If we already had a real chat, treat as a completed session.
          endConversation(messagesRef.current.length > 1 ? "completed" : "budget");
          return;
        }
        if (!res.ok) {
          setStatus("Amy had trouble hearing. Tap the mic to try again.");
          setPhase("amy_speaking");
          return;
        }

        const initial = (await res.json()) as ConverseResponse;
        const remainingSeconds = initial.remainingSeconds ?? remainingRef.current;
        if (typeof initial.resetsAt === "string") setResetsAt(initial.resetsAt);

        const resolved = await resolveAiApiData<ConverseResponse>(initial, apiFetch, {
          poll: { maxAttempts: 16, intervalMs: 1500, requestTimeoutMs: 15_000 },
        });
        const reply = resolved.reply ?? parseReply(resolved.content);

        if (!reply) {
          setStatus("Amy got shy! Tap the mic and say hello again.");
          setPhase("amy_speaking");
          return;
        }

        setRemaining(remainingSeconds);
        const amyText = [reply.say, reply.question].filter(Boolean).join(" ");
        setMessages((prev) => [...prev, { role: "amy", text: amyText }]);

        setPhase("amy_speaking");
        setStatus(reply.say);
        await speakLines([reply.say, reply.question]);

        if (turnPhase === "closing") {
          endConversation("completed", reply.report ?? null);
          return;
        }
        if (remainingSeconds <= 0) {
          endConversation("completed", reply.report ?? null);
          return;
        }
        if (sessionActiveRef.current) {
          void startListening();
        }
      } catch {
        setStatus("Something went wrong. Tap the mic to try again.");
        setPhase("amy_speaking");
      }
    },
    [apiFetch, authFetch, child.id, endConversation, pickPhase, speakLines, startListening],
  );

  // When the child stops talking, send their transcript as the next turn.
  useEffect(() => {
    if (phase !== "listening") return;
    if (!listenStartedRef.current) return;
    if (stt.listening || stt.transcribing) return;
    const transcript = stt.transcript.trim();
    listenStartedRef.current = false;
    if (!transcript) {
      if (sessionActiveRef.current) {
        setStatus("I didn't hear you — try again!");
        void startListening();
      }
      return;
    }
    setMessages((prev) => [...prev, { role: "child", text: transcript }]);
    void sendTurn(transcript, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stt.listening, stt.transcribing, stt.transcript]);

  // Auto stop listening after a pause so the turn advances.
  useEffect(() => {
    if (phase !== "listening") return;
    const id = window.setTimeout(() => {
      if (phaseRef.current === "listening") stt.stop();
    }, MAX_LISTEN_MS);
    return () => window.clearTimeout(id);
  }, [phase, stt]);

  useEffect(() => {
    if (stt.error === "microphone_blocked") {
      setMicSettingsOpen(true);
      setStatus("Microphone access is required to talk with Amy.");
      setPhase("amy_speaking");
    }
  }, [stt.error]);

  const start = useCallback(() => {
    recordTtsUserGesture();
    sessionActiveRef.current = true;
    lastTurnTsRef.current = Date.now();
    lastServerPhaseRef.current = "warmup";
    setMessages([]);
    setReport(null);
    setEndedReason(null);
    setPhase("thinking");
    void sendTurn("", true);
  }, [sendTurn]);

  const lastAmy = [...messages].reverse().find((m) => m.role === "amy");
  const lastChild = [...messages].reverse().find((m) => m.role === "child");
  const listening = phase === "listening";
  const speaking = phase === "amy_speaking";
  const thinking = phase === "thinking";
  const active = phase === "amy_speaking" || phase === "listening" || phase === "thinking";
  // Server memory wins for welcome-back (cross-device); local is the fallback.
  const displayMem = serverMem ?? memoryPayload;
  const welcomeBack = displayMem.isReturning && (displayMem.totalSessions ?? 0) > 0;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070812] text-white" data-testid="conversation-coach-page">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <AppLink href="/speech-coach" replace source="conversation-coach-back">
            <Button variant="ghost" size="icon" className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </AppLink>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Live Talk with Amy</p>
            <h1 className="truncate font-quicksand text-xl font-black">{child.name}'s chat</h1>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black tabular-nums">
            {fmtClock(remaining)} left
          </div>
        </header>

        {active || phase === "ended" ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/55">
              <span>{PHASE_LABEL[serverPhase]}</span>
              <span>Session {Math.min(100, Math.round(((TOTAL_BUDGET_SECONDS - remaining) / TOTAL_BUDGET_SECONDS) * 100))}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-yellow-300 transition-all duration-500"
                style={{ width: `${((TOTAL_BUDGET_SECONDS - remaining) / TOTAL_BUDGET_SECONDS) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <section className="mt-4 flex flex-1 flex-col rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_-30px_rgba(168,85,247,0.75)] backdrop-blur-xl">
          <div className="relative flex min-h-[200px] flex-1 items-center justify-center">
            <div
              className={[
                "absolute h-56 w-56 rounded-full blur-3xl transition-all duration-500",
                listening ? "bg-cyan-400/30" : speaking ? "bg-fuchsia-500/35" : "bg-violet-500/20",
              ].join(" ")}
            />
            {listening && <div className="absolute h-44 w-44 animate-ping rounded-full border border-cyan-300/50" />}
            <div
              className={[
                "relative grid h-40 w-40 place-items-center rounded-full border bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-500",
                speaking ? "scale-105 border-fuchsia-300/70" : "",
                listening ? "scale-110 border-cyan-300/80" : "",
                thinking ? "border-amber-300/80" : "",
              ].join(" ")}
            >
              {thinking && <Loader2 className="absolute h-44 w-44 animate-spin text-amber-200/50" />}
              <AmyIcon size={104} ring bounce={speaking} />
            </div>
          </div>

          {phase === "idle" && (
            <div className="space-y-2 text-center">
              <p className="font-quicksand text-2xl font-black">
                {welcomeBack ? `Welcome back, ${child.name}!` : `Hi ${child.name}!`}
              </p>
              <p className="text-sm text-white/70">
                {welcomeBack && displayMem.lastNextFocus
                  ? `Last time we said we'd work on ${displayMem.lastNextFocus}. Ready for a 5-minute chat?`
                  : "Let's have a fun 5-minute talk. Amy will chat and help you say words clearly!"}
              </p>
            </div>
          )}

          {(lastAmy || lastChild) && active && (
            <div className="space-y-2 text-center">
              {lastAmy && (
                <p className="font-quicksand text-lg font-black leading-snug text-white drop-shadow">{lastAmy.text}</p>
              )}
              {lastChild && <p className="text-sm text-cyan-100/70">You said: "{lastChild.text}"</p>}
            </div>
          )}

          {phase === "ended" && (
            <div className="space-y-3 text-center">
              {endedReason === "budget" ? <Star className="mx-auto h-10 w-10 fill-yellow-300 text-yellow-300" /> : <Trophy className="mx-auto h-10 w-10 fill-yellow-300 text-yellow-300" />}
              <p className="font-quicksand text-2xl font-black">
                {endedReason === "budget" ? "Time's up for today!" : "Great session!"}
              </p>
              {report?.summary && <p className="text-sm text-white/75">{report.summary}</p>}
              {report?.focusWords?.length ? (
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {report.focusWords.slice(0, 6).map((f) => (
                    <span
                      key={f.word}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        f.score >= 80 ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200",
                      ].join(" ")}
                    >
                      {f.word} · {Math.round(f.score)}%
                    </span>
                  ))}
                </div>
              ) : null}
              {report?.nextFocus && (
                <p className="pt-1 text-sm text-cyan-100/80">
                  <span className="font-black">Next time:</span> {report.nextFocus}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-4 space-y-4 pb-4">
          <p className="min-h-6 text-center text-sm font-bold text-white/75" aria-live="polite">
            {getSpeechCoachMicStatusMessage({ error: stt.error, sessionStatus: stt.status, fallbackStatus: status })}
          </p>

          {phase === "idle" && (
            <div className="flex justify-center">
              <Button
                type="button"
                size="lg"
                className="h-16 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-10 text-base font-black text-white shadow-[0_0_40px_rgba(34,211,238,0.35)]"
                onClick={start}
              >
                <Sparkles className="h-5 w-5" />
                Start Talking
              </Button>
            </div>
          )}

          {active && (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={startingMic || thinking || listening}
                onClick={() => void startListening()}
                className={[
                  "grid h-20 w-20 place-items-center rounded-full border text-white transition-all",
                  listening
                    ? "animate-pulse border-cyan-200 bg-cyan-400/30 shadow-[0_0_45px_rgba(34,211,238,0.65)]"
                    : "border-fuchsia-200/70 bg-fuchsia-500/30 shadow-[0_0_40px_rgba(217,70,239,0.45)]",
                  startingMic || thinking || listening ? "opacity-60" : "active:scale-95",
                ].join(" ")}
                aria-label="Talk to Amy"
              >
                {thinking || startingMic ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-9 w-9" />}
              </button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
                onClick={() => endConversation("user")}
              >
                <PhoneOff className="h-4 w-4" />
                End
              </Button>
            </div>
          )}

          {phase === "ended" && (
            <div className="flex justify-center gap-3">
              {endedReason !== "budget" && remaining > CLOSING_AT ? (
                <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={start}>
                  <Volume2 className="h-4 w-4" />
                  Talk Again
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setLocation("/speech-coach")}
              >
                Back to Speech Coach
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </div>

      <Dialog open={micSettingsOpen} onOpenChange={setMicSettingsOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Microphone access is required to talk with Amy.</DialogTitle>
            <DialogDescription>
              Open app settings and allow Microphone, then return here and tap the mic again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" className="rounded-full" onClick={() => openAndroidMicrophoneSettings()}>
              Open Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function ConversationCoachPage() {
  usePrimeIosMicrophone();
  const childrenQuery = useListChildren();
  const childList = (childrenQuery.data ?? []) as AnyChild[];
  const eligible = childList.filter((c) => isSpeechCoachEligibleAgeMonths(totalMonths(c)));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const child = eligible.find((c) => c.id === selectedId) ?? eligible[0] ?? null;

  if (childrenQuery.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070812] text-white">
        <div className="text-white/70">Loading Amy...</div>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070812] p-4 text-white">
        <Card className="max-w-sm rounded-3xl border-white/10 bg-white/[0.06] text-white">
          <CardContent className="space-y-4 p-6 text-center">
            <AmyIcon size={56} ring bounce />
            <h1 className="font-quicksand text-xl font-black">Live Talk with Amy</h1>
            <p className="text-sm text-white/65">Add a child profile to start talking with Amy.</p>
            <AppLink href="/children/new" replace source="conversation-coach-no-child">
              <Button className="rounded-full">Add Child Profile</Button>
            </AppLink>
            <AppLink href="/speech-coach" replace source="conversation-coach-back-home">
              <Button variant="ghost" className="rounded-full text-white/70">Back to Speech Coach</Button>
            </AppLink>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      {eligible.length > 1 ? (
        <div className="fixed left-1/2 top-16 z-30 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
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
      ) : null}
      <ConversationCoach key={child.id} child={child} />
    </>
  );
}
