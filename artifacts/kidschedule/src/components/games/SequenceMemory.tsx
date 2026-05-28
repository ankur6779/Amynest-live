import { useEffect, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  SEQUENCE_CONFIG,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong, feedbackTap } from "@/lib/game-feedback";

const COLORS = [
  { id: "red", bg: "hsl(var(--brand-red-500))", glow: "hsl(var(--brand-red-300))" },
  { id: "blue", bg: "hsl(var(--brand-blue-500))", glow: "hsl(var(--brand-blue-300))" },
  { id: "green", bg: "hsl(var(--brand-green-500))", glow: "hsl(var(--brand-green-300))" },
  { id: "yellow", bg: "hsl(var(--brand-yellow-500))", glow: "hsl(var(--brand-amber-200))" },
];

export function SequenceMemoryGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const targetLen = SEQUENCE_CONFIG[difficulty].length;
  const [sequence, setSequence] = useState<string[]>([]);
  const [showingIdx, setShowingIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"showing" | "input" | "done">("showing");
  const [inputIdx, setInputIdx] = useState(0);
  const [over, setOver] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const rebuild = (level: GameDifficulty) => {
    const len = SEQUENCE_CONFIG[level].length;
    const seq = Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * 4)].id);
    setGameDifficulty(level);
    setDifficulty(level);
    setSequence(seq);
    setShowingIdx(null);
    setPhase("showing");
    setInputIdx(0);
    setOver(false);
    setFeedback(null);
  };

  useEffect(() => {
    rebuild(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0) return;
    let i = 0;
    const tick = () => {
      if (i >= sequence.length) {
        setShowingIdx(null);
        setPhase("input");
        return;
      }
      setShowingIdx(i);
      setTimeout(() => {
        setShowingIdx(null);
        setTimeout(() => {
          i++;
          tick();
        }, 200);
      }, 600);
    };
    const start = setTimeout(tick, 600);
    return () => clearTimeout(start);
  }, [phase, sequence]);

  const tap = (id: string) => {
    if (phase !== "input" || over) return;
    void feedbackTap();
    if (id === sequence[inputIdx]) {
      const next = inputIdx + 1;
      if (next >= sequence.length) {
        setPhase("done");
        setFeedback("correct");
        void feedbackCorrect();
        setTimeout(() => onFinish(sequence.length, sequence.length), 400);
      } else {
        setInputIdx(next);
      }
    } else {
      setOver(true);
      setPhase("done");
      setFeedback("wrong");
      void feedbackWrong();
      setTimeout(() => onFinish(inputIdx, sequence.length), 600);
    }
  };

  const phaseLabel =
    phase === "showing"
      ? "Watch carefully…"
      : phase === "input"
      ? `Repeat: ${inputIdx} / ${sequence.length}`
      : over
      ? "Game over"
      : "Done!";

  return (
    <GameShell
      subtitle={phaseLabel}
      progress={phase === "input" ? (inputIdx / sequence.length) * 100 : phase === "done" ? 100 : 10}
      feedback={feedback}
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={rebuild}
      title="Remember and repeat the colour sequence"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 240, margin: "0 auto" }}>
        {COLORS.map((c) => {
          const lit = showingIdx !== null && sequence[showingIdx] === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => tap(c.id)}
              disabled={phase !== "input"}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 16,
                background: c.bg,
                border: "none",
                cursor: phase === "input" ? "pointer" : "default",
                opacity: lit ? 1 : phase === "input" ? 0.95 : 0.55,
                boxShadow: lit ? `0 0 32px ${c.glow}, 0 0 0 4px ${c.glow}` : "0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.15s",
              }}
              aria-label={c.id}
            >
              &nbsp;
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
