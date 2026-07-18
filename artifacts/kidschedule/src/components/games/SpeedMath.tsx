import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  SPEED_MATH_CONFIG,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import {
  GAME_SESSION_ROUNDS,
  sessionMathConfig,
} from "@/lib/game-session-progression";
import { scaleSeconds } from "@/lib/game-a11y";
import { useA11yPrefs } from "@/hooks/use-a11y-prefs";
import { usePageVisible } from "@/hooks/use-page-visible";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { gameTheme } from "@/lib/game-theme";

interface Round {
  question: string;
  correct: number;
  choices: number[];
  perQSeconds: number;
}

function buildRound(roundIndex: number, difficulty: GameDifficulty): Round {
  const base = sessionMathConfig(roundIndex, GAME_SESSION_ROUNDS);
  const bonus = SPEED_MATH_CONFIG[difficulty];
  const cfg = {
    perQSeconds: Math.max(4, base.perQSeconds + bonus.perQSecondsBonus),
    maxNum: Math.max(5, base.maxNum + bonus.maxNumBonus),
    allowMultiply: base.allowMultiply,
    allowDivide: base.allowDivide,
  };
  const ops: string[] = ["+", "-"];
  if (cfg.allowMultiply) ops.push("×");
  if (cfg.allowDivide) ops.push("÷");
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * cfg.maxNum) + 1;
  let b = Math.floor(Math.random() * cfg.maxNum) + 1;
  let correct = 0;
  if (op === "+") correct = a + b;
  if (op === "-") {
    if (b > a) [a, b] = [b, a];
    correct = a - b;
  }
  if (op === "×") {
    a = Math.floor(Math.random() * Math.min(9, cfg.maxNum)) + 2;
    b = Math.floor(Math.random() * Math.min(9, cfg.maxNum)) + 2;
    correct = a * b;
  }
  if (op === "÷") {
    b = Math.floor(Math.random() * 8) + 2;
    correct = Math.floor(Math.random() * 9) + 2;
    a = b * correct;
  }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 7) - 3 || 4;
    const w = correct + delta;
    if (w !== correct && w >= 0) wrongs.add(w);
  }
  const choices = [correct, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
  return { question: `${a} ${op} ${b}`, correct, choices, perQSeconds: cfg.perQSeconds };
}

export function SpeedMathGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const { timeScale } = useA11yPrefs();
  const pageVisible = usePageVisible();
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const rounds = useMemo(
    () =>
      Array.from({ length: GAME_SESSION_ROUNDS }, (_, i) => {
        const r = buildRound(i, difficulty);
        return { ...r, perQSeconds: scaleSeconds(r.perQSeconds, timeScale) };
      }),
    [difficulty, timeScale],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(rounds[0]?.perQSeconds ?? 10);
  const tickRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  const resetDifficulty = (level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setIdx(0);
    setScore(0);
    setFeedback(null);
    resolvedRef.current = false;
  };

  const advance = (correctPick: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (tickRef.current) window.clearInterval(tickRef.current);
    setFeedback(correctPick ? "correct" : "wrong");
    void (correctPick ? feedbackCorrect() : feedbackWrong());
    if (correctPick) setScore((s) => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= GAME_SESSION_ROUNDS) onFinish(correctPick ? score + 1 : score, GAME_SESSION_ROUNDS);
      else setIdx((n) => n + 1);
    }, 700);
  };

  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (!pageVisible) return;
    const perQ = rounds[idx]?.perQSeconds ?? 10;
    setTimeLeft(perQ);
    resolvedRef.current = false;
    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (resolvedRef.current) return t;
        if (t <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          advance(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, rounds, pageVisible]);

  if (idx >= GAME_SESSION_ROUNDS) return null;
  const r = rounds[idx];
  const progress = ((idx + (feedback ? 1 : 0)) / GAME_SESSION_ROUNDS) * 100;

  return (
    <GameShell
      round={idx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      progress={progress}
      subtitle={`Question ${idx + 1} of ${GAME_SESSION_ROUNDS} · ⏱ ${timeLeft}s`}
      feedback={feedback}
      feedbackText={
        feedback === "correct" ? "Nice!" : feedback === "wrong" ? "Keep going — next one!" : undefined
      }
      idleHint="Take a breath — you can still solve it."
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetDifficulty}
      title={`${r.question} = ?`}
    >
      <div
        role="group"
        aria-label="Answer choices"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 280, margin: "0 auto" }}
      >
        {r.choices.map((c) => {
          const isCorrect = c === r.correct;
          const reveal = feedback !== null;
          const bg = reveal && isCorrect
            ? "hsl(var(--brand-green-500))"
            : reveal && !isCorrect
            ? "hsl(var(--muted) / 0.35)"
            : "hsl(var(--muted) / 0.25)";
          return (
            <button
              key={c}
              type="button"
              className="game-choice-a11y"
              disabled={feedback !== null}
              onClick={() => advance(isCorrect)}
              aria-label={
                reveal
                  ? isCorrect
                    ? `${c}, correct answer`
                    : `${c}`
                  : `Answer ${c}`
              }
              style={{
                background: bg,
                color: "hsl(var(--foreground))",
                border:
                  reveal && isCorrect
                    ? "3px solid #fff"
                    : `1px solid ${gameTheme.glassBorder}`,
                borderRadius: 14,
                padding: "16px 0",
                minHeight: GAME_LAYOUT.touchComfort,
                fontSize: "clamp(1.125rem, 4vw, 1.375rem)",
                fontWeight: 800,
                cursor: feedback ? "default" : "pointer",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {reveal && isCorrect ? `✓ ${c}` : c}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
