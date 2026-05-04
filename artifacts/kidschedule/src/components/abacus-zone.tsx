import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Volume2, VolumeX, Sparkles, Lock, RotateCw, Trophy } from "lucide-react";
import {
  abacusValue,
  buildLessonScript,
  emptyAbacus,
  generateChallenge,
  generateProblem,
  highestUnlockedLevel,
  isLevelUnlocked,
  LEVELS,
  rng,
  scoreAnswer,
  setLowerCount,
  summarizeSession,
  toggleUpper,
  type AbacusProblem,
  type AbacusState,
  type LevelId,
  type LevelMode,
} from "@workspace/abacus";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─── Tiny WebAudio bleeps for bead taps + correct/wrong/unlock cues ────
// Uses a single shared AudioContext lazily; no-ops in SSR or browsers
// without WebAudio so it never breaks rendering or tests.
let _abacusAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  if (!_abacusAudioCtx) {
    try { _abacusAudioCtx = new Ctor(); } catch { return null; }
  }
  return _abacusAudioCtx;
}
function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.06) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch { /* noop */ }
}
const sfx = {
  bead: () => playTone(900, 60, "triangle", 0.04),
  correct: () => {
    playTone(660, 90, "sine", 0.06);
    setTimeout(() => playTone(990, 140, "sine", 0.06), 70);
  },
  wrong: () => playTone(220, 200, "sawtooth", 0.05),
  unlock: () => {
    playTone(523, 100);
    setTimeout(() => playTone(659, 100), 90);
    setTimeout(() => playTone(784, 180), 180);
  },
};

// ─── localStorage helpers for offline-first progress hydration ─────────
const PROGRESS_LS_KEY = (childId: number) => `abacus.progress.v1.${childId}`;
function readCachedProgress<T = unknown>(childId: number): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PROGRESS_LS_KEY(childId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function writeCachedProgress(childId: number, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROGRESS_LS_KEY(childId), JSON.stringify(value));
  } catch { /* noop (quota / privacy mode) */ }
}

// ─── Confetti burst (lightweight, no extra deps) ───────────────────────
function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 16 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((_, i) => {
        const x = (Math.random() - 0.5) * 280;
        const y = -120 - Math.random() * 80;
        const rot = (Math.random() - 0.5) * 720;
        const colors = ["hsl(var(--brand-amber-500))", "hsl(var(--brand-pink-500))", "hsl(var(--brand-violet-500))", "hsl(var(--brand-emerald-500))", "hsl(var(--brand-rose-500))"];
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x, y, rotate: rot }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 8,
              height: 14,
              background: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

type Mode = "learn" | "practice" | "challenge" | "mental" | "tutor";

interface Props {
  childId: number;
  childName: string;
  ageYears: number;
}

interface ProgressShape {
  currentLevel: LevelId;
  lastMode: Mode;
  completedLevels: LevelId[];
  highestUnlocked: LevelId;
  bestScores: Record<string, { points: number; accuracyPct: number; completedAt: string }>;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
}

interface LeaderboardEntry {
  rank: number;
  childId: number;
  name: string;
  points: number;
  isMe: boolean;
}
interface LeaderboardShape {
  weekStart: string;
  top: LeaderboardEntry[];
  me: { rank: number; points: number; total: number };
}

// ─── Bead UI ────────────────────────────────────────────────────────────

function BeadColumn({
  rod,
  rodIndex,
  onToggleUpper,
  onSetLower,
  highlight,
  disabled,
}: {
  rod: { upper: 0 | 1; lower: 0 | 1 | 2 | 3 | 4 };
  rodIndex: number;
  onToggleUpper: (i: number) => void;
  onSetLower: (i: number, n: 0 | 1 | 2 | 3 | 4) => void;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={[
        "relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl",
        "bg-muted border-2",
        highlight
          ? "border-primary shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
          : "border-border",
      ].join(" ")}
      data-testid={`abacus-rod-${rodIndex}`}
    >
      {/* Upper bead (worth 5) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggleUpper(rodIndex)}
        aria-label={`rod ${rodIndex + 1} upper bead`}
        data-testid={`abacus-upper-${rodIndex}`}
        className="relative h-12 w-full flex items-start justify-center"
      >
        <motion.span
          animate={{ y: rod.upper === 1 ? 18 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          className={[
            "block h-7 w-12 rounded-full",
            "bg-card shadow-md ring-1 ring-primary",
          ].join(" ")}
        />
      </button>

      {/* Crossbar */}
      <div className="h-[3px] w-full rounded-full bg-primary" />

      {/* Lower beads (worth 1 each) */}
      <div className="relative h-28 w-full flex flex-col items-center justify-end gap-1 pb-1">
        {[0, 1, 2, 3].map((i) => {
          const beadIndexFromBottom = 3 - i;
          const isUp = rod.lower > beadIndexFromBottom;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => {
                // Tapping a bead pushes it (and beads beyond it) up to make
                // the lower-bead count match this position.
                const target = (isUp ? beadIndexFromBottom : beadIndexFromBottom + 1) as 0 | 1 | 2 | 3 | 4;
                onSetLower(rodIndex, target);
              }}
              aria-label={`rod ${rodIndex + 1} lower bead ${i + 1}`}
              data-testid={`abacus-lower-${rodIndex}-${i}`}
              className="block h-6 w-12"
            >
              <motion.span
                animate={{ y: isUp ? -8 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="block h-6 w-12 rounded-full bg-card shadow ring-1 ring-primary"
              />
            </button>
          );
        })}
      </div>

      <span className="text-[10px] font-mono text-muted-foreground">
        {rod.upper * 5 + rod.lower}
      </span>
    </div>
  );
}

function AbacusBoard({
  state,
  onChange,
  highlightRod,
  disabled,
}: {
  state: AbacusState;
  onChange: (next: AbacusState) => void;
  highlightRod?: number;
  disabled?: boolean;
}) {
  const value = abacusValue(state);
  return (
    <div className="rounded-2xl bg-muted border-2 border-border p-3">
      <div className="flex justify-center gap-2">
        {state.map((rod, i) => (
          <BeadColumn
            key={i}
            rod={rod}
            rodIndex={i}
            highlight={highlightRod === i}
            disabled={disabled}
            onToggleUpper={(idx) => onChange(toggleUpper(state, idx))}
            onSetLower={(idx, n) => onChange(setLowerCount(state, idx, n))}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-bold text-foreground" data-testid="abacus-value">
        = {value}
      </p>
    </div>
  );
}

// ─── Sub-modes ──────────────────────────────────────────────────────────

function LearnMode({
  level,
  onSpeak,
  onStop,
  speaking,
}: {
  level: LevelId;
  onSpeak: (text: string) => void;
  onStop: () => void;
  speaking: boolean;
}) {
  const { t } = useTranslation();
  const script = useMemo(() => buildLessonScript(level), [level]);
  const [step, setStep] = useState(0);
  const cur = script.steps[step];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{script.title}</h4>
        <span className="text-xs text-muted-foreground">
          {t("abacus.step")} {step + 1} / {script.steps.length}
        </span>
      </div>
      <AbacusBoard state={cur.state} onChange={() => {}} highlightRod={cur.highlightRod} disabled />
      <p className="text-sm leading-relaxed text-foreground bg-muted rounded-xl p-3">
        {cur.text}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (speaking ? onStop() : onSpeak(cur.text))}
          className="inline-flex items-center gap-1 rounded-lg bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold px-3 py-2"
          data-testid="abacus-learn-tts"
        >
          {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {speaking ? t("abacus.stop_voice") : t("abacus.amy_voice")}
        </button>
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg bg-muted text-foreground text-xs font-semibold px-3 py-2 disabled:opacity-40"
        >
          ← {t("abacus.back")}
        </button>
        <button
          type="button"
          disabled={step >= script.steps.length - 1}
          onClick={() => setStep((s) => Math.min(script.steps.length - 1, s + 1))}
          className="rounded-lg bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 disabled:opacity-40"
          data-testid="abacus-learn-next"
        >
          {t("abacus.next")} →
        </button>
      </div>
    </div>
  );
}

function PracticeMode({ level }: { level: LevelId }) {
  const { t } = useTranslation();
  const [problem, setProblem] = useState<AbacusProblem>(() => generateProblem(level, rng(Date.now())));
  const [board, setBoard] = useState<AbacusState>(() => problem.initialState ?? emptyAbacus(problem.rods));
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);

  const next = useCallback(() => {
    const p = generateProblem(level, rng(Date.now() + Math.floor(Math.random() * 1000)));
    setProblem(p);
    setBoard(p.initialState ?? emptyAbacus(p.rods));
    setFeedback("none");
    setShowHint(false);
  }, [level]);

  // When the level prop changes, generate a fresh problem appropriate for it.
  useEffect(() => {
    next();
  }, [level, next]);

  const check = () => {
    const v = abacusValue(board);
    const ok = v === problem.answer;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) sfx.correct(); else sfx.wrong();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted p-3 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("abacus.show_on_abacus")}</p>
        <p className="text-3xl font-black text-foreground" data-testid="abacus-problem">
          {problem.prompt}
        </p>
      </div>
      <div className="relative">
        <AbacusBoard state={board} onChange={(s) => { sfx.bead(); setBoard(s); }} />
        <ConfettiBurst show={feedback === "correct"} />
      </div>
      <AnimatePresence>
        {feedback !== "none" && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={[
              "text-center font-bold text-sm rounded-lg p-2",
              feedback === "correct"
                ? "bg-muted text-foreground"
                : "bg-muted text-foreground",
            ].join(" ")}
            data-testid={`abacus-practice-feedback-${feedback}`}
          >
            {feedback === "correct" ? `🎉 ${t("abacus.correct")}` : `❌ ${t("abacus.try_again")} — ${t("abacus.answer_was", { n: problem.answer })}`}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={check}
          className="rounded-lg bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold px-3 py-2"
          data-testid="abacus-practice-check"
        >
          ✓ {t("abacus.check")}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-lg bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 inline-flex items-center gap-1"
          data-testid="abacus-practice-next"
        >
          <RotateCw className="h-3.5 w-3.5" /> {t("abacus.new_problem")}
        </button>
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="rounded-lg bg-muted text-foreground text-xs font-semibold px-3 py-2"
        >
          💡 {t("abacus.hint")}
        </button>
        <button
          type="button"
          onClick={() => setBoard(problem.initialState ?? emptyAbacus(problem.rods))}
          className="rounded-lg bg-muted text-xs font-semibold px-3 py-2"
        >
          ↺ {t("abacus.reset")}
        </button>
      </div>
      {showHint && (
        <p className="text-xs italic text-muted-foreground bg-muted rounded-lg p-2">
          💡 {problem.hint}
        </p>
      )}
    </div>
  );
}

function ChallengeMode({
  level,
  onComplete,
}: {
  level: LevelId;
  onComplete: (accuracyPct: number, points: number) => void;
}) {
  const { t } = useTranslation();
  const lvlDef = useMemo(() => LEVELS.find((l) => l.id === level)!, [level]);
  const [seed] = useState(() => Date.now());
  const problems = useMemo(() => generateChallenge(level, seed), [level, seed]);
  const [idx, setIdx] = useState(0);
  const [board, setBoard] = useState<AbacusState>(() => problems[0].initialState ?? emptyAbacus(problems[0].rods));
  const [results, setResults] = useState<{ correct: boolean; points: number }[]>([]);
  const [tLeft, setTLeft] = useState(lvlDef.challengeSecondsPerQ);
  const startedAt = useRef(Date.now());

  const advance = useCallback(
    (correct: boolean, elapsedMs: number) => {
      const score = scoreAnswer({
        correct,
        elapsedMs,
        limitMs: lvlDef.challengeSecondsPerQ * 1000,
        fastBonusFraction: lvlDef.fastBonusFraction,
      });
      setResults((rs) => {
        const next = [...rs, { correct, points: score.points }];
        if (next.length >= problems.length) {
          const summary = summarizeSession(level, next);
          onComplete(summary.accuracyPct, summary.totalPoints);
        }
        return next;
      });
      const nextIdx = idx + 1;
      if (nextIdx < problems.length) {
        setIdx(nextIdx);
        const p = problems[nextIdx];
        setBoard(p.initialState ?? emptyAbacus(p.rods));
        setTLeft(lvlDef.challengeSecondsPerQ);
        startedAt.current = Date.now();
      }
    },
    [idx, level, lvlDef, onComplete, problems],
  );

  useEffect(() => {
    if (results.length >= problems.length) return;
    const id = setInterval(() => {
      setTLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          advance(false, lvlDef.challengeSecondsPerQ * 1000);
          return lvlDef.challengeSecondsPerQ;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [idx, advance, lvlDef.challengeSecondsPerQ, problems.length, results.length]);

  if (results.length >= problems.length) {
    const summary = summarizeSession(level, results);
    return (
      <div className="text-center space-y-3 py-4 relative" data-testid="abacus-challenge-complete">
        <ConfettiBurst show={summary.passed} />
        <Trophy className="h-12 w-12 mx-auto text-foreground" />
        <h4 className="text-lg font-black">
          {summary.label === "perfect"
            ? t("abacus.label_perfect")
            : summary.label === "great"
              ? t("abacus.label_great")
              : summary.label === "good"
                ? t("abacus.label_good")
                : t("abacus.label_keep_going")}
        </h4>
        <p className="text-sm">
          {summary.correct} / {summary.totalQuestions} {t("abacus.correct_lower")} •{""}
          <strong>{summary.totalPoints}</strong> {t("abacus.points")}
        </p>
        <p className={`text-xs font-semibold ${summary.passed ? "text-foreground" : "text-foreground"}`}>
          {summary.passed ? `🔓 ${t("abacus.level_unlocked")}` : `${t("abacus.need_pct", { pct: lvlDef.unlockAccuracyPct })}`}
        </p>
      </div>
    );
  }

  const cur = problems[idx];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono">
          Q {idx + 1} / {problems.length}
        </span>
        <span className={`font-bold ${tLeft <= 5 ? "text-foreground" : "text-foreground"}`} data-testid="abacus-challenge-timer">
          ⏱ {tLeft}s
        </span>
      </div>
      <div className="rounded-xl bg-muted p-3 text-center">
        <p className="text-3xl font-black text-foreground">{cur.prompt}</p>
      </div>
      <AbacusBoard state={board} onChange={setBoard} />
      <button
        type="button"
        onClick={() => advance(abacusValue(board) === cur.answer, Date.now() - startedAt.current)}
        className="w-full rounded-lg bg-primary hover:bg-primary text-primary-foreground text-sm font-bold py-3"
        data-testid="abacus-challenge-submit"
      >
        ✓ {t("abacus.submit")}
      </button>
    </div>
  );
}

function MentalMode({ level }: { level: LevelId }) {
  const { t } = useTranslation();
  const [problem, setProblem] = useState<AbacusProblem>(() => generateProblem(level, rng(Date.now())));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const next = () => {
    setProblem(generateProblem(level, rng(Date.now() + Math.floor(Math.random() * 1000))));
    setAnswer("");
    setFeedback("none");
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">{t("abacus.mental_intro")}</p>
      <div className="rounded-xl bg-muted p-4 text-center">
        <p className="text-4xl font-black text-foreground">{problem.prompt}</p>
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={t("abacus.your_answer")}
        className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-center text-xl font-bold"
        data-testid="abacus-mental-answer"
      />
      {feedback !== "none" && (
        <p
          className={`text-center text-sm font-bold rounded-lg p-2 ${
            feedback === "correct"
              ? "bg-muted text-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {feedback === "correct" ? `🎉 ${t("abacus.correct")}` : `❌ ${problem.answer}`}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFeedback(Number(answer) === problem.answer ? "correct" : "wrong")}
          disabled={!answer.trim()}
          className="flex-1 rounded-lg bg-primary hover:bg-primary text-primary-foreground text-sm font-bold py-2 disabled:opacity-40"
          data-testid="abacus-mental-check"
        >
          {t("abacus.check")}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-lg bg-primary hover:bg-primary text-primary-foreground text-sm font-bold px-4 py-2"
        >
          {t("abacus.new_problem")} →
        </button>
      </div>
    </div>
  );
}

function TutorMode({ childId, level, ageYears }: { childId: number; level: LevelId; ageYears: number }) {
  const { t, i18n } = useTranslation();
  const authFetch = useAuthFetch();
  const amy = useAmyVoice();
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  void ageYears; // included for API parity; server reads child's age from DB.

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setErr(null);
    setReply("");
    try {
      const res = await authFetch("/api/abacus/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          level,
          language: "en",
          question: question.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error(data?.error ?? "ai_failed");
      setReply(data.reply as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ai_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("abacus.tutor_intro")}</p>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("abacus.tutor_placeholder")}
        rows={3}
        className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm"
        data-testid="abacus-tutor-question"
      />
      <button
        type="button"
        onClick={ask}
        disabled={loading || !question.trim()}
        className="w-full rounded-lg bg-primary hover:bg-primary disabled:opacity-40 text-primary-foreground text-sm font-bold py-2 inline-flex items-center justify-center gap-1"
        data-testid="abacus-tutor-ask"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? t("abacus.thinking") : t("abacus.ask_amy")}
      </button>
      {err && <p className="text-xs text-foreground text-center">⚠️ {err}</p>}
      {reply && (
        <div className="rounded-xl bg-muted p-3 space-y-2" data-testid="abacus-tutor-reply">
          <p className="text-sm leading-relaxed">{reply}</p>
          <button
            type="button"
            onClick={() => (amy.speaking || amy.loading ? amy.stop() : amy.speak(reply))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground"
          >
            {amy.speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {amy.speaking ? t("abacus.stop_voice") : t("abacus.amy_voice")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Top-level component ────────────────────────────────────────────────

export function AbacusZone({ childId, childName, ageYears }: Props) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const amy = useAmyVoice();
  const [progress, setProgress] = useState<ProgressShape | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardShape | null>(null);
  const [mode, setMode] = useState<Mode>("learn");
  const [level, setLevel] = useState<LevelId>(1);
  const [loading, setLoading] = useState(true);

  // Pull the friends/family leaderboard. Lightweight — re-fetched on
  // mount and after every challenge completion so the strip reflects
  // the child's latest weekly points without a manual refresh.
  const refreshLeaderboard = useCallback(() => {
    authFetch(`/api/abacus/leaderboard?childId=${childId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.top) setLeaderboard(data as LeaderboardShape);
      })
      .catch(() => { /* leaderboard is non-essential — silent on failure */ });
  }, [authFetch, childId]);

  // Fetch progress + initial mode/level on mount and whenever the child changes.
  // Hydrate from localStorage immediately so the UI is responsive offline,
  // then refresh from the server in the background.
  useEffect(() => {
    let cancelled = false;
    const cached = readCachedProgress<ProgressShape>(childId);
    if (cached) {
      setProgress(cached);
      setMode((cached.lastMode as Mode) || "learn");
      setLevel((cached.currentLevel as LevelId) || 1);
      setLoading(false);
    } else {
      setLoading(true);
    }
    authFetch(`/api/abacus/progress?childId=${childId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.eligible && data.progress) {
          const p = data.progress as ProgressShape;
          setProgress(p);
          writeCachedProgress(childId, p);
          if (!cached) {
            setMode((p.lastMode as Mode) || "learn");
            setLevel((p.currentLevel as LevelId) || 1);
          }
        } else if (!cached) {
          setProgress(null);
        }
      })
      .catch(() => { /* keep cached state on network failure */ })
      .finally(() => !cancelled && setLoading(false));
    refreshLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, refreshLeaderboard]);

  const persistMode = useCallback(
    (next: Mode, lvl: LevelId) => {
      void authFetch("/api/abacus/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mode", childId, mode: next, level: lvl }),
      }).catch(() => {});
    },
    [authFetch, childId],
  );

  const onChallengeComplete = useCallback(
    async (accuracyPct: number, points: number) => {
      const def = LEVELS.find((l) => l.id === level)!;
      if (accuracyPct >= def.unlockAccuracyPct) {
        const res = await authFetch("/api/abacus/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_level",
            childId,
            level,
            accuracyPct,
            points,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.progress) {
          const np: ProgressShape = {
            ...(progress ?? {
              currentLevel: level,
              lastMode: mode,
              completedLevels: [],
              highestUnlocked: level,
              bestScores: {},
              totalCorrect: 0,
              totalAttempts: 0,
              totalPoints: 0,
            }),
            currentLevel: data.progress.currentLevel,
            completedLevels: data.progress.completedLevels ?? [],
            highestUnlocked: highestUnlockedLevel(data.progress.completedLevels ?? []),
            bestScores: data.progress.bestScores ?? {},
          };
          setProgress(np);
          writeCachedProgress(childId, np);
          sfx.unlock();
        }
      }
      // Always log the session totals so the lifetime counters move.
      await authFetch("/api/abacus/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log_session",
          childId,
          totalCorrect: Math.round((accuracyPct / 100) * def.challengeCount),
          totalAttempts: def.challengeCount,
          totalPoints: points,
        }),
      }).catch(() => {});
      // Refresh the leaderboard so the strip updates with the new score.
      refreshLeaderboard();
    },
    [authFetch, childId, level, mode, progress, refreshLeaderboard],
  );

  if (loading) {
    return <p className="text-xs text-muted-foreground">{t("abacus.loading")}</p>;
  }

  if (ageYears < 4 || ageYears > 10) {
    return (
      <p className="text-xs text-muted-foreground">{t("abacus.age_not_eligible", { name: childName })}</p>
    );
  }

  const completed = progress?.completedLevels ?? [];
  const MODES: { id: Mode; label: string; emoji: string }[] = [
    { id: "learn", label: t("abacus.mode_learn"), emoji: "📚" },
    { id: "practice", label: t("abacus.mode_practice"), emoji: "✏️" },
    { id: "challenge", label: t("abacus.mode_challenge"), emoji: "⏱️" },
    { id: "mental", label: t("abacus.mode_mental"), emoji: "🧠" },
    { id: "tutor", label: t("abacus.mode_tutor"), emoji: "💜" },
  ];

  return (
    <div className="space-y-3" data-testid="abacus-zone">
      {/* Progress strip */}
      {progress && (
        <div className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
          <span>
            🏅 <strong>{progress.totalPoints}</strong> {t("abacus.points")}
          </span>
          <span>
            ✅ {completed.length} / {LEVELS.length} {t("abacus.levels")}
          </span>
        </div>
      )}

      {/* Weekly friends/family leaderboard strip */}
      {leaderboard && (
        <div
          className="rounded-xl border border-border bg-card px-3 py-2 space-y-1"
          data-testid="abacus-leaderboard"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {t("abacus.weekly_leaderboard")}
            </span>
            <span data-testid="abacus-leaderboard-rank">
              {t("abacus.your_rank", {
                rank: leaderboard.me.rank,
                total: leaderboard.me.total,
              })}
            </span>
          </div>
          {leaderboard.top.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              {t("abacus.no_scores_yet")}
            </p>
          ) : (
            <ol className="space-y-0.5">
              {leaderboard.top.map((row) => (
                <li
                  key={row.childId}
                  className={[
                    "flex items-center justify-between text-xs rounded px-2 py-1",
                    row.isMe ? "bg-primary/10 font-bold text-foreground" : "text-foreground",
                  ].join(" ")}
                  data-testid={`abacus-leaderboard-row-${row.rank}`}
                >
                  <span>
                    <span className="inline-block w-5 text-muted-foreground">#{row.rank}</span>
                    {row.isMe ? `${row.name} (${t("abacus.you")})` : row.name}
                  </span>
                  <span>{row.points} {t("abacus.pts")}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Level chips */}
      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((l) => {
          const unlocked = isLevelUnlocked(l.id, completed);
          const active = l.id === level;
          return (
            <button
              key={l.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                setLevel(l.id);
                persistMode(mode, l.id);
              }}
              className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border-2",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : unlocked
                    ? "bg-background text-foreground border-border hover:bg-muted"
                    : "bg-muted text-muted-foreground border-muted opacity-60",
              ].join(" ")}
              data-testid={`abacus-level-${l.id}`}
            >
              {!unlocked && <Lock className="h-3 w-3" />}
              L{l.id} • {t(`abacus.level_${l.slug}` as `abacus.level_${LevelMode}`)}
            </button>
          );
        })}
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-5 gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              persistMode(m.id, level);
            }}
            className={[
              "rounded-lg text-xs font-semibold py-2 px-1 border",
              mode === m.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            ].join(" ")}
            data-testid={`abacus-mode-${m.id}`}
          >
            <span className="block text-base leading-none">{m.emoji}</span>
            <span className="block mt-0.5 text-[10px] leading-tight">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode body */}
      <div className="rounded-xl border border-border bg-card p-3">
        {mode === "learn" && (
          <LearnMode
            level={level}
            speaking={amy.speaking || amy.loading}
            onSpeak={(text) => amy.speak(text)}
            onStop={() => amy.stop()}
          />
        )}
        {mode === "practice" && <PracticeMode level={level} />}
        {mode === "challenge" && <ChallengeMode level={level} onComplete={onChallengeComplete} />}
        {mode === "mental" && <MentalMode level={level} />}
        {mode === "tutor" && <TutorMode childId={childId} level={level} ageYears={ageYears} />}
      </div>
    </div>
  );
}

export default AbacusZone;
