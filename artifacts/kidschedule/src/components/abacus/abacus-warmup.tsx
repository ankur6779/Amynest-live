import { useEffect, useMemo, useState } from "react";
import { Flame, Zap } from "lucide-react";
import {
  abacusValue,
  emptyAbacus,
  generateProblem,
  rng,
  type LevelId,
} from "@workspace/abacus";
import { useAbacusTranslation } from "@/hooks/use-abacus-translation";
import { AbacusBoard, ConfettiBurst } from "./abacus-board";
import { MentalMode } from "./abacus-mental-mode";
import { abacusSfx } from "./abacus-sfx";
import { WARMUP_BONUS_POINTS } from "./abacus-storage";
import { cn } from "@/lib/utils";

type WarmupStep = "mental" | "practice" | "speed" | "done";

export function AbacusWarmupCard({
  completedToday,
  onStart,
}: {
  completedToday: boolean;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={completedToday}
      className={cn(
        "w-full rounded-2xl border-2 p-3 text-left transition-all min-h-[44px]",
        completedToday
          ? "border-emerald-400/40 bg-emerald-500/10 opacity-90"
          : "border-orange-400/40 bg-gradient-to-br from-orange-500/15 to-amber-500/10 hover:scale-[1.01]",
      )}
      data-testid="abacus-warmup-card"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {completedToday ? "✅" : "🔥"}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            Daily ritual
          </span>
          <span className="block text-sm font-black text-foreground">
            {completedToday ? "Warm-up complete!" : "Today's 3 Minute Brain Warm-up"}
          </span>
          <span className="block text-[11px] text-muted-foreground font-semibold mt-0.5">
            1 Mental · 1 Practice · 1 Speed · +{WARMUP_BONUS_POINTS} XP
          </span>
        </span>
        {!completedToday && <Zap className="h-5 w-5 text-amber-500 shrink-0" />}
      </div>
    </button>
  );
}

export function AbacusWarmupSession({
  level,
  onAttempt,
  onComplete,
  onExit,
}: {
  level: LevelId;
  onAttempt: (correct: boolean) => void;
  onComplete: (bonusPoints: number) => void;
  onExit: () => void;
}) {
  const { t } = useAbacusTranslation();
  const [step, setStep] = useState<WarmupStep>("mental");
  const practiceProblem = useMemo(
    () => generateProblem(level, rng(Date.now() + 42)),
    [level],
  );
  const speedProblem = useMemo(
    () => generateProblem(level, rng(Date.now() + 99)),
    [level],
  );
  const [board, setBoard] = useState(() =>
    practiceProblem.initialState ?? emptyAbacus(practiceProblem.rods),
  );
  const [speedAnswer, setSpeedAnswer] = useState("");
  const [speedLeft, setSpeedLeft] = useState(12);
  const [bonusAwarded, setBonusAwarded] = useState(false);

  useEffect(() => {
    if (step !== "speed") return;
    const id = window.setInterval(() => {
      setSpeedLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === "speed" && speedLeft === 0 && !bonusAwarded) {
      finishWarmup(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish once on timeout
  }, [speedLeft, step, bonusAwarded]);

  const finishWarmup = (lastCorrect: boolean) => {
    if (bonusAwarded) return;
    setBonusAwarded(true);
    onAttempt(lastCorrect);
    abacusSfx.celebrate();
    setStep("done");
    onComplete(WARMUP_BONUS_POINTS);
  };

  if (step === "done") {
    return (
      <div className="relative text-center space-y-3 py-6" data-testid="abacus-warmup-done">
        <ConfettiBurst show />
        <Flame className="h-10 w-10 mx-auto text-orange-500" />
        <h4 className="text-lg font-black">Morning warm-up complete!</h4>
        <p className="text-sm text-muted-foreground">+{WARMUP_BONUS_POINTS} bonus XP · Fire badge</p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-4 py-3 min-h-[44px]"
        >
          {t("abacus.back_home")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="abacus-warmup-session">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
          Brain Warm-up
        </p>
        <button
          type="button"
          onClick={onExit}
          className="text-xs font-semibold text-muted-foreground min-h-[40px] px-2"
        >
          Exit
        </button>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {(["mental", "practice", "speed"] as const).map((s, i) => {
          const order = { mental: 0, practice: 1, speed: 2 } as const;
          const current = order[step as Exclude<WarmupStep, "done">] ?? 0;
          return (
            <span
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full",
                i < current ? "bg-emerald-500" : i === current ? "bg-orange-500" : "bg-muted",
              )}
            />
          );
        })}
      </div>

      {step === "mental" && (
        <MentalMode
          level={level}
          onAttempt={(meta) => {
            onAttempt(meta.correct);
            setTimeout(() => setStep("practice"), 500);
          }}
        />
      )}

      {step === "practice" && (
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground font-semibold">Practice bead</p>
          <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/15 p-4 text-center">
            <p className="text-4xl font-black font-quicksand">{practiceProblem.prompt}</p>
          </div>
          <AbacusBoard
            state={board}
            onChange={(s) => {
              abacusSfx.bead();
              setBoard(s);
            }}
          />
          <button
            type="button"
            onClick={() => {
              const ok = abacusValue(board) === practiceProblem.answer;
              if (ok) abacusSfx.correct();
              else abacusSfx.wrong();
              onAttempt(ok);
              setTimeout(() => setStep("speed"), 400);
            }}
            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 min-h-[44px]"
            data-testid="abacus-warmup-practice-check"
          >
            ✓ {t("abacus.check")}
          </button>
        </div>
      )}

      {step === "speed" && (
        <div className="space-y-3">
          <p className="text-center text-sm font-bold">
            Speed round ·{" "}
            <span className={speedLeft <= 3 ? "text-rose-600 animate-pulse" : ""}>{speedLeft}s</span>
          </p>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/30 p-6 text-center">
            <p className="text-5xl font-black font-quicksand">{speedProblem.prompt}</p>
          </div>
          <input
            inputMode="numeric"
            value={speedAnswer}
            onChange={(e) => setSpeedAnswer(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-3xl font-black font-quicksand min-h-[52px]"
            placeholder="?"
            aria-label="Speed answer"
            data-testid="abacus-warmup-speed-answer"
          />
          <button
            type="button"
            disabled={!speedAnswer.trim()}
            onClick={() => {
              const ok = Number(speedAnswer) === speedProblem.answer;
              if (ok) abacusSfx.correct();
              else abacusSfx.wrong();
              finishWarmup(ok);
            }}
            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 min-h-[44px] disabled:opacity-40"
            data-testid="abacus-warmup-speed-submit"
          >
            ✓ {t("abacus.submit")}
          </button>
        </div>
      )}
    </div>
  );
}
