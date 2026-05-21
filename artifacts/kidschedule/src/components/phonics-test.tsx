import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { useMountedRef } from "@/hooks/use-safe-async";
import {
  GraduationCap, Volume2, Loader2, CheckCircle2,
  Clock, Trophy, RotateCcw, Sparkles, Ear, PencilLine, Blocks, Zap, ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { cn } from "@/lib/utils";

// ─── API shapes ──────────────────────────────────────────────────────────────

type TestType = "daily" | "weekly";
type GameMode = "hear_tap" | "missing_letter" | "build_word" | "speed_challenge" | "mixed";

const RESUME_STORAGE_PREFIX = "amynest:phonics-test-resume:";

interface TestConfigState {
  ok: boolean;
  eligible: boolean;
  hasContent: boolean;
  daily: { questionCount: number; available: boolean; nextAvailableAt: string | null };
  weekly: { questionCount: number; available: boolean; nextAvailableAt: string | null };
}

interface SavedTestSession {
  testType: TestType;
  gameMode: GameMode;
  data: StartResponse;
  index: number;
  answers: { questionId: string; selectedIndex: number }[];
  savedAt: number;
  expiresAt: string;
}

/** Short tap feedback — Web Audio, no network. */
function playTapSound(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.18));
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore — optional UX polish */
  }
}

const ttsUrlCache = new Map<string, string>();

async function preloadTtsPhrase(
  authFetch: ReturnType<typeof useAuthFetch>,
  text: string,
  mode: "default" | "phonics" = "phonics",
) {
  const key = `${mode}:${text}`;
  if (ttsUrlCache.has(key)) return ttsUrlCache.get(key);
  try {
    const res = await authFetch("/api/tts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode, category: "phonics", voice: "alloy", speed: 0.9 }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string; audioUrl?: string };
    const url = json.url ?? json.audioUrl;
    if (url) ttsUrlCache.set(key, url);
    return url ?? null;
  } catch {
    return null;
  }
}

interface AvailabilityState {
  ageGroup: string | null;
  eligible: boolean;
  daily: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
  weekly: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
}

type QuestionType =
  | "letter_to_sound" | "sound_to_letter" | "word_pic"
  | "animal_sound" | "blending" | "listening"
  | "missing_letter" | "build_word" | "identify";

// audit-block-ignore-start — phonics mini-games use intentional festive
// gradient/accent palettes (violet, fuchsia, sky, emerald, amber, rose…) for
// the Hear&Tap / Missing Letter / Build Word / Speed Round modes. These are
// kid-facing UI colors, not theme tokens, so they're suppressed here.
interface ClientQuestion {
  id: string;
  type: QuestionType;
  prompt: {
    instruction: string;
    text?: string;
    symbol?: string;
    emoji?: string;
    ttsText?: string;
    meta?: { targetWord?: string; letterPool?: string[]; timeLimitSec?: number };
  };
  options: { label: string; emoji?: string }[];
  /** Local-only correctness signal for instant tap feedback (UX-only; server is authoritative). */
  _localCheck: number;
}

interface StartResponse {
  sessionToken: string;
  testType: TestType;
  gameMode?: GameMode;
  ageGroup: string;
  ageGroupLabel: string;
  questions: ClientQuestion[];
  expiresAt: string;
}

interface SubmitResponse {
  result: { id: number; score: number; total: number; accuracyPct: number; performanceLabel: string };
  breakdown: { correct: number; total: number; accuracyPct: number; perType: Record<string, { correct: number; total: number }>; weakConceptIds: number[] };
  weakConcepts: { id: number; symbol: string; emoji: string | null; example: string | null }[];
  insight: { performanceLabel: string; text: string; suggestion: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(target: string | null): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${totalMin}m`;
}

// Map known server error codes from POST /api/phonics/tests/start to
// friendly copy. Anything we don't recognise (HTTP 5xx, network errors,
// etc.) falls back to a generic message so the user never sees a raw token
// like "not_enough_content".
const START_ERROR_COPY: Record<string, string> = {
  not_enough_content:
    "We're still adding questions for this game. Try a different game mode for now.",
  no_content_for_age_group:
    "No phonics content is set up for this age group yet. Please check back soon.",
  cooldown_active:
    "This test isn't available yet. Try again later when the cool-down ends.",
  child_not_found:
    "We couldn't find this child profile. Please refresh and try again.",
  age_not_supported:
    "Phonics tests are for ages 1–6. Please pick a child in that range.",
  session_misconfigured:
    "We could not start the test securely. Please refresh the app and try again.",
  unauthorized: "Please sign in again to start the test.",
  invalid_body: "Something went wrong starting the test. Please try again.",
};

function friendlyStartError(raw: string): string {
  return START_ERROR_COPY[raw] ?? "Something went wrong starting the test. Please try again.";
}

const TYPE_LABEL: Record<QuestionType, string> = {
  letter_to_sound: "Letter → Sound",
  sound_to_letter: "Sound → Letter",
  word_pic: "Word + Picture",
  animal_sound: "Animal Sound",
  blending: "Blend the Sounds",
  listening: "Listen & Choose",
  missing_letter: "Missing Letter",
  build_word: "Build the Word",
  identify: "Which Word?",
};

const GAME_MODES: Array<{
  id: GameMode;
  label: string;
  sub: string;
  Icon: typeof Ear;
  bg: string;
}> = [
  { id: "hear_tap",        label: "Hear & Tap",      sub: "Listen, then tap",      Icon: Ear,        bg: "from-violet-500 to-fuchsia-500" },
  { id: "missing_letter",  label: "Missing Letter",  sub: "Fill the blank",        Icon: PencilLine, bg: "from-sky-500 to-cyan-500" },
  { id: "build_word",      label: "Build Word",      sub: "Tap letters in order",  Icon: Blocks,     bg: "from-emerald-500 to-teal-500" },
  { id: "speed_challenge", label: "Speed Round",     sub: "Beat the clock!",       Icon: Zap,        bg: "from-amber-500 to-orange-500" },
];

// ─── Inline keyframes (fun animations) ───────────────────────────────────────
//
// We inject one <style> tag the first time the component mounts so we don't
// have to depend on tailwind config changes. Names are namespaced with `pt-`
// (phonics-test) to avoid clashing with anything else in the app.

const ANIMATIONS_CSS = `
@keyframes pt-bounce-tap   { 0% { transform: scale(1); } 40% { transform: scale(0.92); } 70% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes pt-shake        { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
@keyframes pt-glow-correct { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); } 100% { box-shadow: 0 0 0 14px rgba(34,197,94,0); } }
@keyframes pt-glow-wrong   { 0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.7); } 100% { box-shadow: 0 0 0 14px rgba(244,63,94,0); } }
@keyframes pt-soundwave    { 0% { transform: scaleY(0.3); opacity: 0.7; } 50% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(0.3); opacity: 0.7; } }
@keyframes pt-confetti     { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--cx), 90px) rotate(540deg); opacity: 0; } }
.pt-anim-bounce  { animation: pt-bounce-tap 280ms ease-out; }
.pt-anim-shake   { animation: pt-shake 360ms ease-in-out; }
.pt-anim-correct { animation: pt-glow-correct 700ms ease-out; }
.pt-anim-wrong   { animation: pt-glow-wrong 700ms ease-out; }
.pt-wave-bar     { display: inline-block; width: 3px; margin: 0 1px; height: 14px; background: currentColor; border-radius: 2px; animation: pt-soundwave 700ms ease-in-out infinite; }
.pt-wave-bar:nth-child(2) { animation-delay: 120ms; }
.pt-wave-bar:nth-child(3) { animation-delay: 240ms; }
.pt-wave-bar:nth-child(4) { animation-delay: 360ms; }
.pt-confetti-piece { position: absolute; top: 0; left: 50%; width: 8px; height: 14px; border-radius: 2px; animation: pt-confetti 900ms ease-out forwards; }
`;

function useAnimationsCss() {
  useEffect(() => {
    const id = "pt-animations-css";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = ANIMATIONS_CSS;
    document.head.appendChild(tag);
  }, []);
}

function Soundwave({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end h-4", className)} aria-hidden>
      <span className="pt-wave-bar" />
      <span className="pt-wave-bar" />
      <span className="pt-wave-bar" />
      <span className="pt-wave-bar" />
    </span>
  );
}

function ConfettiBurst() {
  // 14 colorful pieces flung outward from the center of the parent.
  const colors = ["#a78bfa", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8", "#f43f5e", "#facc15"];
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        cx: `${(Math.random() * 240 - 120).toFixed(0)}px`,
        delay: `${Math.floor(Math.random() * 80)}ms`,
        bg: colors[i % colors.length]!,
      })),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="pt-confetti-piece"
          style={{
            background: p.bg,
            // CSS custom prop drives the keyframe's horizontal travel.
            ["--cx" as never]: p.cx,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Question card (one at a time) ───────────────────────────────────────────

interface QuestionCardProps {
  question: ClientQuestion;
  index: number;
  total: number;
  onAnswer: (selectedIndex: number) => void;
  selectedIndex: number | null;
  feedback: "correct" | "wrong" | null;
  /** Speed-challenge per-question countdown (or null in other modes). */
  secondsLeft: number | null;
}

function QuestionCard({
  question, index, total, onAnswer, selectedIndex, feedback, secondsLeft,
}: QuestionCardProps) {
  const { speaking, loading, speak, stop } = useAmyVoice();

  const ttsText = question.prompt.ttsText ?? question.prompt.text ?? "";

  // Retry counter — reset on each new question, capped at 1 auto-replay on
  // wrong answer to prevent infinite TTS loops.
  const retryCountRef = useRef(0);
  useEffect(() => {
    retryCountRef.current = 0;
  }, [question.id]);

  // REMOVED auto speak on mount — TTS only on user tap (playPrompt).

  const playPrompt = useCallback(() => {
    if (speaking || loading) {
      stop();
      return;
    }
    if (ttsText) void speak(ttsText);
  }, [speaking, loading, stop, speak, ttsText]);

  // REMOVED auto speak on feedback — user taps playPrompt to hear audio again.
  useEffect(() => {
    if (feedback === "correct") {
      stop();
      retryCountRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  // Track which option was just tapped so we can bounce only that tile.
  const [bouncedIdx, setBouncedIdx] = useState<number | null>(null);

  const isMissingLetter = question.type === "missing_letter";

  return (
    <div className="space-y-4 relative" data-testid={`phonics-test-question-${index}`}>
      {/* Progress + speed timer */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="bg-muted text-foreground border-0 text-[11px] font-bold">
          Q {index + 1} / {total}
        </Badge>
        <div className="flex items-center gap-2">
          {secondsLeft != null && (
            <Badge
              variant="outline"
              data-testid="phonics-test-timer"
              className={cn(
                "text-[11px] font-extrabold gap-1",
                secondsLeft <= 3 ? "border-rose-500 text-rose-600 animate-pulse" : "border-amber-500 text-amber-600",
              )}
            >
              <Zap className="h-3 w-3" /> {secondsLeft}s
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] font-medium text-foreground">
            {TYPE_LABEL[question.type]}
          </Badge>
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="h-1.5" />

      {/* Prompt */}
      <div
        className={cn(
          "rounded-3xl bg-card border border-border p-5 sm:p-7 text-center space-y-3 relative",
          feedback === "correct" && "pt-anim-correct border-emerald-400",
          feedback === "wrong" && "pt-anim-wrong border-rose-400",
        )}
      >
        <p className="text-sm font-medium text-foreground">
          {question.prompt.instruction}
        </p>

        {/* For missing_letter the server already renders prompt.text as the
            masked word (e.g. "C _ T"), so we just display it with wider tracking. */}
        {(question.prompt.text || question.prompt.emoji) && (
          <div
            className={cn(
              "text-6xl sm:text-7xl font-black select-none leading-none py-2",
              isMissingLetter && "tracking-widest",
            )}
          >
            {question.prompt.text ?? question.prompt.emoji}
          </div>
        )}

        {ttsText && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={playPrompt}
            data-testid={`phonics-test-play-${index}`}
            className={cn(
              "gap-1.5 rounded-full border-border text-foreground",
              speaking && "ring-2 ring-violet-400",
            )}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : speaking ? (
              <Soundwave className="text-violet-500" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            {speaking ? "Stop" : loading ? "Loading…" : "Play sound"}
          </Button>
        )}

        {feedback === "correct" && <ConfettiBurst />}
      </div>

      {/* Options — build_word renders its own custom UI, others share the grid. */}
      {question.type === "build_word" ? (
        <BuildWordPanel
          key={question.id}
          question={question}
          disabled={selectedIndex != null}
          onResult={(ok) => onAnswer(ok ? 0 : 1)}
          feedback={feedback}
        />
      ) : (
        <div className={cn(
          "grid gap-2.5",
          question.options.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
        )}>
          {(question.options ?? []).map((opt, i) => {
            const isSelected = selectedIndex === i;
            const showCorrect = feedback === "correct" && isSelected;
            const showWrong   = feedback === "wrong"   && isSelected;
            const isBouncing  = bouncedIdx === i && selectedIndex == null;
            return (
              <button
                key={`${question.id}-opt-${i}`}
                type="button"
                disabled={selectedIndex != null}
                onClick={() => {
                  setBouncedIdx(i);
                  // Let the bounce play visually before the answer animations take over.
                  window.setTimeout(() => onAnswer(i), 80);
                }}
                onAnimationEnd={() => setBouncedIdx((b) => (b === i ? null : b))}
                data-testid={`phonics-test-option-${index}-${i}`}
                className={cn(
                  "relative rounded-2xl border-2 p-4 text-center transition-all min-h-[64px] flex items-center justify-center gap-2",
                  "bg-card border-border",
                  "hover:border-primary hover:shadow-md active:scale-[0.98]",
                  "disabled:cursor-not-allowed disabled:hover:shadow-none",
                  isSelected && !feedback && "border-primary bg-muted ring-2 ring-primary",
                  showCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 pt-anim-correct",
                  showWrong && "border-rose-500 bg-rose-50 dark:bg-rose-950/40 pt-anim-shake pt-anim-wrong",
                  isBouncing && "pt-anim-bounce",
                )}
              >
                {opt.emoji && <span className="text-3xl">{opt.emoji}</span>}
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {opt.label}
                </span>
                {showCorrect && (
                  <CheckCircle2 className="absolute -top-2 -right-2 h-6 w-6 text-emerald-500 bg-card rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── Build Word panel ───────────────────────────────────────────────────────
//
// Custom UI: the child taps letters in order to spell the target word. The
// server only knows it's "build_word" and that selectedIndex 0 = correct,
// 1 = wrong — the actual spelling is verified client-side. Acceptable for
// a kid-game; the server still counts the score on a real submitted index.

function BuildWordPanel({
  question, disabled, onResult, feedback,
}: {
  question: ClientQuestion;
  disabled: boolean;
  onResult: (ok: boolean) => void;
  feedback: "correct" | "wrong" | null;
}) {
  const target = (question.prompt.meta?.targetWord ?? "").toLowerCase();
  const pool = question.prompt.meta?.letterPool ?? [];
  const [picked, setPicked] = useState<number[]>([]);
  const [shake, setShake] = useState(false);

  const built = picked.map((i) => pool[i] ?? "").join("");

  // Auto-evaluate when the built word reaches target length.
  useEffect(() => {
    if (disabled || built.length < target.length) return;
    const ok = built.toLowerCase() === target;
    if (!ok) {
      setShake(true);
      window.setTimeout(() => {
        setShake(false);
        setPicked([]);
        onResult(false);
      }, 380);
    } else {
      onResult(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  return (
    <div className="space-y-3">
      {/* Slots */}
      <div className={cn("flex justify-center gap-2", shake && "pt-anim-shake")}>
        {Array.from({ length: target.length }).map((_, i) => {
          const ch = built[i] ?? "";
          return (
            <div
              key={i}
              data-testid={`phonics-build-slot-${i}`}
              className={cn(
                "w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-black uppercase",
                ch ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground",
                feedback === "correct" && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                feedback === "wrong" && "border-rose-500 bg-rose-50 dark:bg-rose-950/40",
              )}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* Letter pool */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {pool.map((letter, i) => {
          const used = picked.includes(i);
          return (
            <button
              key={`${question.id}-pool-${i}`}
              type="button"
              disabled={used || disabled || picked.length >= target.length}
              onClick={() => setPicked((p) => [...p, i])}
              data-testid={`phonics-build-letter-${i}`}
              className={cn(
                "rounded-2xl border-2 py-3 text-xl font-black uppercase transition-all",
                "bg-card border-border hover:border-primary hover:shadow-md active:scale-95 active:pt-anim-bounce",
                used && "opacity-30 cursor-not-allowed",
                disabled && "cursor-not-allowed",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {picked.length > 0 && !disabled && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPicked((p) => p.slice(0, -1))}
            className="text-xs gap-1"
            data-testid="phonics-build-undo"
          >
            <ChevronLeft className="h-3 w-3" /> Undo
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface PhonicsTestProps {
  childId: number | string;
  childName: string;
  totalAgeMonths: number;
  initialTestType?: TestType;
  /** When true, render focused play UI (used on /phonics/test/play). */
  playOnly?: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "mode-pick"; testType: TestType }
  | {
      kind: "running";
      testType: TestType;
      gameMode: GameMode;
      data: StartResponse;
      index: number;
      answers: { questionId: string; selectedIndex: number }[];
      selectedIndex: number | null;
      feedback: "correct" | "wrong" | null;
    }
  | { kind: "submitting" }
  | { kind: "result"; data: SubmitResponse };

export function PhonicsTest(props: PhonicsTestProps) {
  return (
    <AppErrorBoundary label="PhonicsTest">
      <PhonicsTestContent {...props} />
    </AppErrorBoundary>
  );
}

function PhonicsTestContent({
  childId,
  childName,
  totalAgeMonths,
  initialTestType,
  playOnly = false,
}: PhonicsTestProps) {
  useAnimationsCss();
  const authFetch = useAuthFetch();
  const isMounted = useMountedRef();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const numericChildId = typeof childId === "number" ? childId : Number(childId);
  const displayName = childName.trim() || "your child";

  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [testConfig, setTestConfig] = useState<TestConfigState | null>(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [availError, setAvailError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [resumeSession, setResumeSession] = useState<SavedTestSession | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [now, setNow] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Tick the countdown every 30s while there's an active cooldown.
  useEffect(() => {
    if (!availability) return;
    if (!availability.daily.nextAvailableAt && !availability.weekly.nextAvailableAt) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [availability]);

  const refreshAvailability = useCallback(async () => {
    if (!Number.isFinite(numericChildId) || numericChildId <= 0) {
      if (isMounted.current) setAvailLoading(false);
      return;
    }
    const controller = new AbortController();
    try {
      if (isMounted.current) {
        setAvailLoading(true);
        setAvailError(null);
      }
      const res = await authFetch(`/api/phonics/tests/availability/${numericChildId}`, {
        signal: controller.signal,
      });
      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AvailabilityState;
      if (isMounted.current) setAvailability(json ?? null);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[phonics-test] API failed", err);
      if (isMounted.current) {
        setAvailError(err instanceof Error ? err.message : "Failed to load availability");
      }
    } finally {
      if (isMounted.current) setAvailLoading(false);
    }
  }, [authFetch, numericChildId, isMounted]);

  const resumeKey = `${RESUME_STORAGE_PREFIX}${numericChildId}`;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      if (!Number.isFinite(numericChildId) || numericChildId <= 0) {
        if (isMounted.current) setAvailLoading(false);
        return;
      }
      try {
        if (isMounted.current) {
          setAvailLoading(true);
          setAvailError(null);
        }
        const [availRes, configRes] = await Promise.all([
          authFetch(`/api/phonics/tests/availability/${numericChildId}`, {
            signal: controller.signal,
          }),
          authFetch(`/api/phonics/test-config/${numericChildId}`, {
            signal: controller.signal,
          }),
        ]);
        if (!isMounted.current || controller.signal.aborted) return;
        if (!availRes.ok) throw new Error(`HTTP ${availRes.status}`);
        const json = (await availRes.json()) as AvailabilityState;
        if (isMounted.current) setAvailability(json ?? null);
        if (configRes.ok) {
          const cfg = (await configRes.json()) as TestConfigState;
          if (isMounted.current && cfg?.ok) setTestConfig(cfg);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        console.error("[phonics-test] API failed", err);
        if (isMounted.current) {
          setAvailError("Could not load test availability. Pull to refresh or try again.");
        }
      } finally {
        if (isMounted.current) setAvailLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericChildId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(resumeKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedTestSession;
      if (new Date(saved.expiresAt).getTime() <= Date.now()) {
        window.localStorage.removeItem(resumeKey);
        return;
      }
      if (saved.index < saved.data.questions.length) {
        setResumeSession(saved);
      }
    } catch {
      window.localStorage.removeItem(resumeKey);
    }
  }, [resumeKey]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const type = params.get("type") ?? initialTestType;
    if (type === "daily" || type === "weekly") {
      setPhase({ kind: "mode-pick", testType: type });
    }
  }, [search, initialTestType]);

  const eligible = totalAgeMonths >= 12 && (availability?.eligible ?? totalAgeMonths >= 12);

  const persistResume = useCallback(
    (running: Extract<Phase, { kind: "running" }>) => {
      const payload: SavedTestSession = {
        testType: running.testType,
        gameMode: running.gameMode,
        data: running.data,
        index: running.index,
        answers: running.answers,
        savedAt: Date.now(),
        expiresAt: running.data.expiresAt,
      };
      window.localStorage.setItem(resumeKey, JSON.stringify(payload));
    },
    [resumeKey],
  );

  const clearResume = useCallback(() => {
    window.localStorage.removeItem(resumeKey);
    setResumeSession(null);
  }, [resumeKey]);

  const startTest = useCallback(
    (testType: TestType) => {
      setStartError(null);
      const params = new URLSearchParams({
        type: testType,
        childId: String(numericChildId),
      });
      setLocation(`/phonics/test?${params.toString()}`);
      setPhase({ kind: "mode-pick", testType });
    },
    [numericChildId, setLocation],
  );

  const handlePickTest = useCallback(
    (testType: TestType) => {
      startTest(testType);
    },
    [startTest],
  );

  const handleResume = useCallback(() => {
    if (!resumeSession) return;
    setPhase({
      kind: "running",
      testType: resumeSession.testType,
      gameMode: resumeSession.gameMode,
      data: resumeSession.data,
      index: resumeSession.index,
      answers: resumeSession.answers,
      selectedIndex: null,
      feedback: null,
    });
    setLocation(
      `/phonics/test/play?type=${resumeSession.testType}&childId=${numericChildId}`,
    );
  }, [resumeSession, numericChildId, setLocation]);

  // Step 2: actually call the API with the chosen game mode.
  const startInFlightRef = useRef(false);
  const handleStartWithMode = useCallback(async (testType: TestType, gameMode: GameMode) => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setStartError(null);
    try {
      if (isMounted.current) setPhase({ kind: "submitting" });
      const res = await authFetch("/api/phonics/tests/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: numericChildId, testType, gameMode }),
      });
      if (!isMounted.current) return;
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as StartResponse;
      if (!data?.questions || data.questions.length === 0) {
        throw new Error("not_enough_content");
      }
      if (!isMounted.current) return;
      clearResume();
      const running: Extract<Phase, { kind: "running" }> = {
        kind: "running", testType, gameMode, data,
        index: 0, answers: [], selectedIndex: null, feedback: null,
      };
      setPhase(running);
      persistResume(running);
      setLocation(`/phonics/test/play?type=${testType}&childId=${numericChildId}`);

      const first = data.questions[0];
      const next = data.questions[1];
      const tts0 = first?.prompt.ttsText ?? first?.prompt.text;
      const tts1 = next?.prompt.ttsText ?? next?.prompt.text;
      if (tts0) void preloadTtsPhrase(authFetch, tts0, "phonics");
      if (tts1) void preloadTtsPhrase(authFetch, tts1, "phonics");
    } catch (err) {
      if (!isMounted.current) return;
      setPhase({ kind: "mode-pick", testType });
      const raw = err instanceof Error ? err.message : "Failed to start test";
      setStartError(friendlyStartError(raw));
    } finally {
      startInFlightRef.current = false;
    }
  }, [authFetch, numericChildId, isMounted, setLocation, clearResume, persistResume]);

  // Common submit-answer flow used by both timer expiry and tap.
  const submitAnswer = useCallback((selectedIndex: number, currentPhase: Extract<Phase, { kind: "running" }>) => {
    if (currentPhase.selectedIndex != null) return;
    const q = currentPhase.data.questions[currentPhase.index];
    const correctish = isCorrectClientSide(q, selectedIndex);
    const newAnswers = [...currentPhase.answers, { questionId: q.id, selectedIndex }];
    setPhase({ ...currentPhase, answers: newAnswers, selectedIndex, feedback: correctish ? "correct" : "wrong" });
    playTapSound(correctish);
    // Replay prompt audio on wrong so the child hears it again.
    // (No-op if no ttsText.)
    setTimeout(async () => {
      if (!isMounted.current) return;
      const isLast = currentPhase.index + 1 >= currentPhase.data.questions.length;
      if (!isLast) {
        if (isMounted.current) {
          const nextPhase: Extract<Phase, { kind: "running" }> = {
            ...currentPhase,
            answers: newAnswers,
            index: currentPhase.index + 1,
            selectedIndex: null,
            feedback: null,
          };
          setPhase(nextPhase);
          persistResume(nextPhase);
          const nq = currentPhase.data.questions[nextPhase.index + 1];
          const preloadText = nq?.prompt.ttsText ?? nq?.prompt.text;
          if (preloadText) void preloadTtsPhrase(authFetch, preloadText, "phonics");
        }
        return;
      }
      if (isMounted.current) setPhase({ kind: "submitting" });
      try {
        const res = await authFetch("/api/phonics/tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: currentPhase.data.sessionToken, answers: newAnswers }),
        });
        if (!isMounted.current) return;
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `HTTP ${res.status}`);
        }
        const submitData = (await res.json()) as SubmitResponse;
        if (!isMounted.current) return;
        setPhase({ kind: "result", data: submitData });
        clearResume();
        void refreshAvailability();
      } catch (err) {
        if (!isMounted.current) return;
        setPhase({ kind: "idle" });
        setAvailError(err instanceof Error ? err.message : "Failed to submit test");
      }
    }, 900);
  }, [authFetch, refreshAvailability, isMounted, persistResume, clearResume]);

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (phase.kind !== "running") return;
    submitAnswer(selectedIndex, phase);
  }, [phase, submitAnswer]);

  // Drive the per-question countdown for speed_challenge.
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const qLimit = phase.kind === "running"
      ? phase.data.questions[phase.index]?.prompt.meta?.timeLimitSec
      : null;
    const hasTimer =
      phase.kind === "running" &&
      (phase.gameMode === "speed_challenge" || (qLimit != null && qLimit > 0));
    if (!hasTimer) {
      setSecondsLeft(null);
      return;
    }
    if (phase.selectedIndex != null) return; // freeze timer while showing feedback
    const q = phase.data.questions[phase.index];
    const limit = q?.prompt.meta?.timeLimitSec ?? 7;
    setSecondsLeft(limit);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null) return s;
        if (s <= 1) {
          // Time up → submit a guaranteed-wrong index.
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          // Pick an option that isn't the correct one. Since the client
          // doesn't know which is correct, submit `options.length - 1`
          // when correctIndex is likely 0; if that happens to be correct
          // the child got it right by accident (acceptable).
          const lastIdx = (q?.options.length ?? 1) - 1;
          submitAnswer(lastIdx === 0 ? 0 : lastIdx, phase);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind === "running" ? `${phase.index}-${phase.selectedIndex}` : phase.kind]);

  const handleDone = useCallback(() => {
    clearResume();
    setPhase({ kind: "idle" });
    setLocation("/phonics");
  }, [clearResume, setLocation]);

  if (!eligible) {
    return <div className="text-sm text-muted-foreground">Loading phonics...</div>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card
      data-testid="phonics-test-card"
      className={cn(
        "border-border bg-card dark:bg-card shadow-md",
        playOnly && "border-0 shadow-none bg-transparent",
      )}
    >
      <CardContent className={cn("p-5 sm:p-6 space-y-4", playOnly && "p-0")}>
        {!playOnly && (
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-2.5 bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-foreground leading-tight">
              Phonics Test
            </h3>
            <p className="text-xs text-muted-foreground">
              Quick check of {displayName}'s phonics — Daily 5 questions or Weekly 20.
            </p>
          </div>
        </div>
        )}

        {availLoading && (
          <div className="space-y-2 py-2" data-testid="phonics-test-shimmer">
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
          </div>
        )}

        {availError && (
          <p className="text-xs text-rose-600 dark:text-rose-400" data-testid="phonics-test-error">
            {availError}
          </p>
        )}

        {startError && (
          <p className="text-xs text-rose-600 dark:text-rose-400" data-testid="phonics-test-start-error">
            {startError}
          </p>
        )}

        {resumeSession && phase.kind === "idle" && !availLoading && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResume}
            className="w-full rounded-2xl border-primary text-primary"
            data-testid="phonics-test-resume"
          >
            Resume Test (Q {resumeSession.index + 1} / {resumeSession.data.questions.length})
          </Button>
        )}

        {phase.kind === "idle" && availability && !availLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["daily", "weekly"] as const).map((tt) => {
              const info = availability[tt];
              const cd = formatCountdown(info.nextAvailableAt);
              const _now = now; // eslint-disable-line @typescript-eslint/no-unused-vars
              const label = tt === "daily" ? "Daily Test" : "Weekly Test";
              const dailyCount = testConfig?.daily.questionCount ?? 5;
              const weeklyCount = testConfig?.weekly.questionCount ?? 20;
              const sub =
                tt === "daily"
                  ? `${dailyCount} questions • once a day`
                  : `${weeklyCount} questions • once a week`;
              return (
                <Button
                  key={tt}
                  type="button"
                  disabled={!info.available}
                  onClick={() => handlePickTest(tt)}
                  data-testid={`phonics-test-start-${tt}`}
                  className={cn(
                    "h-auto rounded-2xl py-4 px-4 flex flex-col items-start gap-1 text-left whitespace-normal",
                    "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
                    "hover:from-violet-600 hover:to-fuchsia-600",
                    "disabled:opacity-60 disabled:from-muted disabled:to-muted disabled:text-muted-foreground",
                  )}
                >
                  <span className="text-sm font-extrabold">{label}</span>
                  <span className="text-[11px] opacity-90">{sub}</span>
                  {!info.available && cd && (
                    <span className="text-[10px] flex items-center gap-1 opacity-95">
                      <Clock className="h-3 w-3" /> Available in {cd}
                    </span>
                  )}
                  {info.lastScore && (
                    <span className="text-[10px] opacity-95">
                      Last: {info.lastScore.accuracyPct}% • {info.lastScore.label}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {phase.kind === "mode-pick" && (
          <div className="space-y-3" data-testid="phonics-test-mode-pick">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">
                Pick a game for {displayName}'s {phase.testType === "daily" ? "Daily" : "Weekly"} Test
                {phase.testType === "weekly" && (
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    Difficulty increases as you go
                  </span>
                )}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPhase({ kind: "idle" })}
                className="text-xs gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </Button>
            </div>
            {phase.testType === "daily" && (
              <button
                type="button"
                onClick={() => handleStartWithMode("daily", "mixed")}
                data-testid="phonics-test-mode-mixed"
                className={cn(
                  "w-full rounded-2xl p-3 text-left text-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md",
                  "hover:scale-[1.01] active:scale-95 transition-transform",
                )}
              >
                <div className="text-sm font-extrabold">Surprise Mix</div>
                <div className="text-[10px] opacity-90">5 questions • random mini-games</div>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {GAME_MODES.map(({ id, label, sub, Icon, bg }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleStartWithMode(phase.testType, id)}
                  data-testid={`phonics-test-mode-${id}`}
                  className={cn(
                    "rounded-2xl p-3 text-left text-white bg-gradient-to-br shadow-md",
                    "hover:scale-[1.02] active:scale-95 transition-transform",
                    bg,
                  )}
                >
                  <Icon className="h-5 w-5 mb-1.5" />
                  <div className="text-sm font-extrabold leading-tight">{label}</div>
                  <div className="text-[10px] opacity-90 leading-tight">{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase.kind === "submitting" && (
          <div className="space-y-3 py-4" data-testid="phonics-test-submitting">
            <div className="h-24 animate-pulse rounded-3xl bg-muted" />
            <div className="flex items-center justify-center gap-2 text-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Starting test…
            </div>
          </div>
        )}

        {phase.kind === "running" && (
          <QuestionCard
            question={phase.data.questions[phase.index]}
            index={phase.index}
            total={phase.data.questions.length}
            onAnswer={handleAnswer}
            selectedIndex={phase.selectedIndex}
            feedback={phase.feedback}
            secondsLeft={
              phase.gameMode === "speed_challenge" ||
              (phase.data.questions[phase.index]?.prompt.meta?.timeLimitSec ?? 0) > 0
                ? secondsLeft
                : null
            }
          />
        )}

        {phase.kind === "result" && (
          <ResultPanel data={phase.data} childName={displayName} onDone={handleDone} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Best-effort client-side correctness — we don't know the server's
 * `correctIndex`, but for the in-progress feedback animations we assume
 * convention (correctIndex=0 for build_word, otherwise unknown). This is
 * purely cosmetic; the authoritative score is computed server-side.
 *
 * For real questions we use a heuristic: if the option label matches the
 * prompt's text/symbol (case-insensitive), call it correct.
 */
function isCorrectClientSide(q: ClientQuestion, selectedIndex: number): boolean {
  // build_word self-validates: panel sends 0 for correct, 1 for wrong.
  if (q.type === "build_word") return selectedIndex === 0;
  // Authoritative for all other types — server still re-checks at submit.
  return selectedIndex === q._localCheck;
}

// ─── Result panel ────────────────────────────────────────────────────────────

interface ResultPanelProps {
  data: SubmitResponse;
  childName: string;
  onDone: () => void;
}

function ResultPanel({ data, childName, onDone }: ResultPanelProps) {
  const { breakdown, weakConcepts, insight } = data;
  const accuracy = breakdown.accuracyPct;
  const ringColor =
    accuracy >= 80 ? "" :
    accuracy >= 50 ? "" :
                     "";
  return (
    <div className="space-y-4" data-testid="phonics-test-result">
      <div className="text-center space-y-2">
        <div className={cn(
          "inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br text-primary-foreground shadow-lg",
          ringColor,
        )}>
          <div className="text-center">
            <div className="text-2xl font-black leading-none">{accuracy}%</div>
            <div className="text-[10px] opacity-95">{breakdown.correct}/{breakdown.total}</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-4 w-4 text-foreground" />
          <span className="text-sm font-extrabold text-foreground">
            {insight.performanceLabel}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-muted border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Sparkles className="h-3.5 w-3.5" /> {childName}'s phonics insight
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {insight.text}
        </p>
        {insight.suggestion && (
          <p className="text-sm text-foreground leading-relaxed font-medium border-t border-border pt-2 mt-2">
            💡 {insight.suggestion}
          </p>
        )}
      </div>

      {weakConcepts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-foreground">
            Sounds to revisit
          </div>
          <div className="flex flex-wrap gap-2">
            {weakConcepts.map((wc) => (
              <Badge
                key={wc.id}
                variant="secondary"
                className="bg-muted text-foreground border-0 text-sm py-1.5 px-3"
              >
                {wc.emoji ?? ""} {wc.symbol}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onDone}
          variant="outline"
          className="flex-1 rounded-2xl gap-1.5"
          data-testid="phonics-test-done"
        >
          <RotateCcw className="h-4 w-4" /> Back to Phonics
        </Button>
      </div>
    </div>
  );
}

export default PhonicsTest;
// audit-block-ignore-end
