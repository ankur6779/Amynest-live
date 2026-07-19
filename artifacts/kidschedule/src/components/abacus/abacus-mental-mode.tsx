import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  generateProblem,
  rng,
  type AbacusProblem,
  type LevelId,
} from "@workspace/abacus";
import { useAbacusTranslation } from "@/hooks/use-abacus-translation";
import { cn } from "@/lib/utils";
import { abacusSfx } from "./abacus-sfx";
import type { BoardFeedback } from "./abacus-types";

function MentalNumberPad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "C"] as const;
  const press = (key: (typeof keys)[number]) => {
    if (disabled) return;
    if (key === "⌫") onChange(value.slice(0, -1));
    else if (key === "C") onChange("");
    else if (value.length < 4) onChange(value + key);
  };
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="abacus-mental-pad">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => press(k)}
          className={cn(
            "min-h-[52px] rounded-xl text-xl font-black transition-all active:scale-95",
            k === "⌫" || k === "C"
              ? "bg-muted text-muted-foreground text-base font-bold"
              : "bg-gradient-to-br from-teal-500/15 to-cyan-500/10 border border-teal-500/20 text-foreground hover:from-teal-500/25",
          )}
          data-testid={
            k === "⌫"
              ? "abacus-mental-backspace"
              : k === "C"
                ? "abacus-mental-clear"
                : `abacus-mental-key-${k}`
          }
        >
          {k}
        </button>
      ))}
    </div>
  );
}

export type MentalAttemptMeta = {
  correct: boolean;
  elapsedMs: number;
  answer: number;
  prompt: string;
  expected: number;
};

export function MentalMode({
  level,
  onAttempt,
  easeFactor = 1,
}: {
  level: LevelId;
  onAttempt: (meta: MentalAttemptMeta) => void;
  easeFactor?: number;
}) {
  const { t } = useAbacusTranslation();
  const [problem, setProblem] = useState<AbacusProblem>(() =>
    generateProblem(level, rng(Date.now()), { easeFactor }),
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<BoardFeedback>("none");
  const startedAt = useRef(Date.now());

  const next = useCallback(() => {
    setProblem(
      generateProblem(level, rng(Date.now() + Math.floor(Math.random() * 1000)), {
        easeFactor,
      }),
    );
    setAnswer("");
    setFeedback("none");
    startedAt.current = Date.now();
  }, [easeFactor, level]);

  useEffect(() => {
    next();
  }, [level, next]);

  const check = () => {
    const numeric = Number(answer);
    const ok = numeric === problem.answer;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) abacusSfx.correct();
    else abacusSfx.wrong();
    onAttempt({
      correct: ok,
      elapsedMs: Date.now() - startedAt.current,
      answer: numeric,
      prompt: problem.prompt,
      expected: problem.answer,
    });
  };

  return (
    <div className="space-y-3" data-testid="abacus-mental-mode">
      <p className="text-xs text-muted-foreground text-center">{t("abacus.mental_intro")}</p>
      <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/15 p-4 text-center">
        <p className="text-4xl sm:text-5xl font-black text-foreground font-quicksand">{problem.prompt}</p>
      </div>

      <div
        className={cn(
          "rounded-2xl border-2 bg-background px-4 py-3 text-center min-h-[4rem] flex items-center justify-center",
          feedback === "correct" && "border-emerald-400 bg-emerald-500/5",
          feedback === "wrong" && "border-rose-400 bg-rose-500/5",
          feedback === "none" && "border-border",
        )}
        data-testid="abacus-mental-answer"
        aria-live="polite"
      >
        <span
          className={cn(
            "text-4xl font-black font-quicksand tabular-nums",
            !answer && "text-muted-foreground/40",
          )}
        >
          {answer || "?"}
        </span>
      </div>

      <MentalNumberPad
        value={answer}
        onChange={(v) => {
          setAnswer(v);
          setFeedback("none");
        }}
        disabled={feedback === "correct"}
      />

      <AnimatePresence>
        {feedback !== "none" && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "text-center font-bold text-sm rounded-xl p-2.5 border",
              feedback === "correct"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-400/40"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-400/40",
            )}
            data-testid={`abacus-mental-feedback-${feedback}`}
          >
            {feedback === "correct"
              ? `🎉 ${t("abacus.correct")}`
              : `❌ ${t("abacus.try_again")} — ${t("abacus.answer_was", { n: problem.answer })}`}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={check}
          disabled={!answer.trim()}
          className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 disabled:opacity-40 text-white text-sm font-bold py-3 min-h-[44px]"
          data-testid="abacus-mental-check"
        >
          {t("abacus.check")}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white text-sm font-bold px-4 py-3 min-h-[44px]"
          data-testid="abacus-mental-next"
        >
          {t("abacus.new_problem")} →
        </button>
      </div>
    </div>
  );
}
