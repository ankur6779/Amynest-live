import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  SPEED_MATH_CONFIG,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";

interface Round { question: string; correct: number; choices: number[] }

function buildRound(cfg: (typeof SPEED_MATH_CONFIG)["normal"]): Round {
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
  return { question: `${a} ${op} ${b}`, correct, choices };
}

export function SpeedMathGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const cfg = SPEED_MATH_CONFIG[difficulty];
  const rounds = useMemo(
    () => Array.from({ length: cfg.total }, () => buildRound(cfg)),
    [cfg],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(cfg.perQSeconds);
  const tickRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  const resetDifficulty = (level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setIdx(0);
    setScore(0);
    setFeedback(null);
    setTimeLeft(SPEED_MATH_CONFIG[level].perQSeconds);
    resolvedRef.current = false;
  };

  useEffect(() => {
    setTimeLeft(cfg.perQSeconds);
    resolvedRef.current = false;
    if (tickRef.current) window.clearInterval(tickRef.current);
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
  }, [idx, cfg.perQSeconds]);

  const advance = (correctPick: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (tickRef.current) window.clearInterval(tickRef.current);
    setFeedback(correctPick ? "correct" : "wrong");
    void (correctPick ? feedbackCorrect() : feedbackWrong());
    if (correctPick) setScore((s) => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= cfg.total) onFinish(correctPick ? score + 1 : score, cfg.total);
      else setIdx((n) => n + 1);
    }, 700);
  };

  if (idx >= cfg.total) return null;
  const r = rounds[idx];
  const progress = ((idx + (feedback ? 1 : 0)) / cfg.total) * 100;

  return (
    <GameShell
      round={idx + 1}
      totalRounds={cfg.total}
      score={score}
      progress={progress}
      subtitle={`Question ${idx + 1} of ${cfg.total} · ⏱ ${timeLeft}s`}
      feedback={feedback}
      feedbackText={feedback === "correct" ? "Nice!" : "Time's up or wrong answer"}
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetDifficulty}
      title={`${r.question} = ?`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 280, margin: "0 auto" }}>
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
              disabled={feedback !== null}
              onClick={() => advance(isCorrect)}
              style={{
                background: bg,
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--card-border))",
                borderRadius: 14,
                padding: "16px 0",
                fontSize: 22,
                fontWeight: 800,
                cursor: feedback ? "default" : "pointer",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
