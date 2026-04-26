import { useCallback, useEffect, useState } from "react";
import {
  GraduationCap, Volume2, Loader2, CheckCircle2,
  Clock, Trophy, RotateCcw, Sparkles,
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

interface AvailabilityState {
  ageGroup: string | null;
  eligible: boolean;
  daily: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
  weekly: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
}

type QuestionType = "letter_to_sound" | "sound_to_letter" | "word_pic" | "animal_sound" | "blending" | "listening";

interface ClientQuestion {
  id: string;
  type: QuestionType;
  prompt: { instruction: string; text?: string; symbol?: string; emoji?: string; ttsText?: string };
  options: { label: string; emoji?: string }[];
}

interface StartResponse {
  sessionToken: string;
  testType: TestType;
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

const TYPE_LABEL: Record<QuestionType, string> = {
  letter_to_sound: "Letter → Sound",
  sound_to_letter: "Sound → Letter",
  word_pic: "Word + Picture",
  animal_sound: "Animal Sound",
  blending: "Blend the Sounds",
  listening: "Listen & Choose",
};

// ─── Question card (one at a time) ───────────────────────────────────────────

interface QuestionCardProps {
  question: ClientQuestion;
  index: number;
  total: number;
  onAnswer: (selectedIndex: number) => void;
  selectedIndex: number | null;
}

function QuestionCard({ question, index, total, onAnswer, selectedIndex }: QuestionCardProps) {
  const { speaking, loading, speak, stop } = useAmyVoice();

  const ttsText = question.prompt.ttsText ?? question.prompt.text ?? "";

  // Auto-play prompt audio for sound/listening questions on mount.
  useEffect(() => {
    if (!ttsText) return;
    if (
      question.type === "sound_to_letter" ||
      question.type === "animal_sound" ||
      question.type === "listening"
    ) {
      void speak(ttsText);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const playPrompt = useCallback(() => {
    if (speaking || loading) {
      stop();
      return;
    }
    if (ttsText) void speak(ttsText);
  }, [speaking, loading, stop, speak, ttsText]);

  return (
    <div className="space-y-4" data-testid={`phonics-test-question-${index}`}>
      {/* Progress */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200 border-0 text-[11px] font-bold">
          Q {index + 1} / {total}
        </Badge>
        <Badge variant="outline" className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
          {TYPE_LABEL[question.type]}
        </Badge>
      </div>
      <Progress value={((index + 1) / total) * 100} className="h-1.5" />

      {/* Prompt */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border border-violet-200/60 dark:border-violet-500/20 p-5 sm:p-7 text-center space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {question.prompt.instruction}
        </p>

        {(question.prompt.text || question.prompt.emoji) && (
          <div className="text-6xl sm:text-7xl font-black select-none leading-none py-2">
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
            className="gap-1.5 rounded-full border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-200"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Volume2 className={cn("h-3.5 w-3.5", speaking && "animate-pulse")} />
            )}
            {speaking ? "Stop" : loading ? "Loading…" : "Play sound"}
          </Button>
        )}
      </div>

      {/* Options */}
      <div className={cn(
        "grid gap-2.5",
        question.options.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
      )}>
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          return (
            <button
              key={`${question.id}-opt-${i}`}
              type="button"
              disabled={selectedIndex != null}
              onClick={() => onAnswer(i)}
              data-testid={`phonics-test-option-${index}-${i}`}
              className={cn(
                "relative rounded-2xl border-2 p-4 text-center transition-all min-h-[64px] flex items-center justify-center gap-2",
                "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700",
                "hover:border-violet-400 hover:shadow-md active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700",
                isSelected && "border-violet-500 bg-violet-50 dark:bg-violet-950/40 ring-2 ring-violet-300 dark:ring-violet-500/40",
              )}
            >
              {opt.emoji && <span className="text-3xl">{opt.emoji}</span>}
              <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                {opt.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="absolute -top-2 -right-2 h-6 w-6 text-violet-600 bg-white dark:bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface PhonicsTestProps {
  childId: number | string;
  childName: string;
  totalAgeMonths: number;
}

type Phase =
  | { kind: "idle" }
  | { kind: "running"; testType: TestType; data: StartResponse; index: number; answers: { questionId: string; selectedIndex: number }[]; selectedIndex: number | null }
  | { kind: "submitting" }
  | { kind: "result"; data: SubmitResponse };

export function PhonicsTest({ childId, childName, totalAgeMonths }: PhonicsTestProps) {
  const authFetch = useAuthFetch();
  const numericChildId = typeof childId === "number" ? childId : Number(childId);

  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [availError, setAvailError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [now, setNow] = useState(Date.now());

  // Tick the countdown every 30s while there's an active cooldown.
  useEffect(() => {
    if (!availability) return;
    if (!availability.daily.nextAvailableAt && !availability.weekly.nextAvailableAt) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [availability]);

  const refreshAvailability = useCallback(async () => {
    if (!Number.isFinite(numericChildId) || numericChildId <= 0) {
      setAvailLoading(false);
      return;
    }
    try {
      setAvailLoading(true);
      setAvailError(null);
      const res = await authFetch(`/api/phonics/tests/availability/${numericChildId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AvailabilityState;
      setAvailability(json);
    } catch (err) {
      setAvailError(err instanceof Error ? err.message : "Failed to load availability");
    } finally {
      setAvailLoading(false);
    }
  }, [authFetch, numericChildId]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  // Eligibility: only show test card for children >= 12 months (engine handles cutoffs).
  const eligible = totalAgeMonths >= 12 && (availability?.eligible ?? totalAgeMonths >= 12);

  const handleStart = useCallback(async (testType: TestType) => {
    try {
      setPhase({ kind: "submitting" });
      const res = await authFetch("/api/phonics/tests/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: numericChildId, testType }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as StartResponse;
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions returned");
      }
      setPhase({ kind: "running", testType, data, index: 0, answers: [], selectedIndex: null });
    } catch (err) {
      setPhase({ kind: "idle" });
      setAvailError(err instanceof Error ? err.message : "Failed to start test");
    }
  }, [authFetch, numericChildId]);

  const handleAnswer = useCallback(async (selectedIndex: number) => {
    if (phase.kind !== "running" || phase.selectedIndex != null) return;
    const q = phase.data.questions[phase.index];
    const newAnswers = [...phase.answers, { questionId: q.id, selectedIndex }];
    // Briefly show the user's selection, then advance or submit.
    setPhase({ ...phase, answers: newAnswers, selectedIndex });
    setTimeout(async () => {
      const isLast = phase.index + 1 >= phase.data.questions.length;
      if (!isLast) {
        setPhase({ ...phase, answers: newAnswers, index: phase.index + 1, selectedIndex: null });
        return;
      }
      setPhase({ kind: "submitting" });
      try {
        const res = await authFetch("/api/phonics/tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: phase.data.sessionToken, answers: newAnswers }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `HTTP ${res.status}`);
        }
        const submitData = (await res.json()) as SubmitResponse;
        setPhase({ kind: "result", data: submitData });
        void refreshAvailability();
      } catch (err) {
        setPhase({ kind: "idle" });
        setAvailError(err instanceof Error ? err.message : "Failed to submit test");
      }
    }, 350);
  }, [phase, authFetch, refreshAvailability]);

  // Reset back to picker.
  const handleDone = useCallback(() => {
    setPhase({ kind: "idle" });
  }, []);

  if (!eligible) {
    return null; // No test card for children < 12 months.
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card
      data-testid="phonics-test-card"
      className="border-violet-200/70 dark:border-violet-500/30 bg-gradient-to-br from-white via-violet-50/30 to-fuchsia-50/30 dark:from-slate-900 dark:via-violet-950/20 dark:to-fuchsia-950/20 shadow-md"
    >
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
              Phonics Test
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Quick check of {childName}'s phonics — Daily 5 questions or Weekly 20.
            </p>
          </div>
        </div>

        {availLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
          </div>
        )}

        {availError && (
          <p className="text-xs text-red-600 dark:text-red-400" data-testid="phonics-test-error">
            {availError}
          </p>
        )}

        {phase.kind === "idle" && availability && !availLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["daily", "weekly"] as const).map((tt) => {
              const info = availability[tt];
              const cd = formatCountdown(info.nextAvailableAt);
              const _now = now; // eslint-disable-line @typescript-eslint/no-unused-vars -- keep re-render bound to ticker
              const label = tt === "daily" ? "Daily Test" : "Weekly Test";
              const sub = tt === "daily" ? "5 questions • once a day" : "20 questions • once a week";
              return (
                <Button
                  key={tt}
                  type="button"
                  disabled={!info.available}
                  onClick={() => handleStart(tt)}
                  data-testid={`phonics-test-start-${tt}`}
                  className={cn(
                    "h-auto rounded-2xl py-4 px-4 flex flex-col items-start gap-1 text-left whitespace-normal",
                    "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white",
                    "disabled:opacity-60 disabled:from-slate-400 disabled:to-slate-500",
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

        {phase.kind === "submitting" && (
          <div className="flex items-center gap-2 py-6 justify-center text-violet-700 dark:text-violet-300">
            <Loader2 className="h-5 w-5 animate-spin" /> Working…
          </div>
        )}

        {phase.kind === "running" && (
          <QuestionCard
            question={phase.data.questions[phase.index]}
            index={phase.index}
            total={phase.data.questions.length}
            onAnswer={handleAnswer}
            selectedIndex={phase.selectedIndex}
          />
        )}

        {phase.kind === "result" && (
          <ResultPanel data={phase.data} childName={childName} onDone={handleDone} />
        )}
      </CardContent>
    </Card>
  );
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
    accuracy >= 80 ? "from-emerald-500 to-teal-500" :
    accuracy >= 50 ? "from-amber-500 to-orange-500" :
                     "from-rose-500 to-pink-500";
  return (
    <div className="space-y-4" data-testid="phonics-test-result">
      <div className="text-center space-y-2">
        <div className={cn(
          "inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br text-white shadow-lg",
          ringColor,
        )}>
          <div className="text-center">
            <div className="text-2xl font-black leading-none">{accuracy}%</div>
            <div className="text-[10px] opacity-95">{breakdown.correct}/{breakdown.total}</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {insight.performanceLabel}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-500/20 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-violet-800 dark:text-violet-200">
          <Sparkles className="h-3.5 w-3.5" /> {childName}'s phonics insight
        </div>
        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
          {insight.text}
        </p>
        {insight.suggestion && (
          <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed font-medium border-t border-violet-200/60 dark:border-violet-500/20 pt-2 mt-2">
            💡 {insight.suggestion}
          </p>
        )}
      </div>

      {weakConcepts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Sounds to revisit
          </div>
          <div className="flex flex-wrap gap-2">
            {weakConcepts.map((wc) => (
              <Badge
                key={wc.id}
                variant="secondary"
                className="bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-0 text-sm py-1.5 px-3"
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
