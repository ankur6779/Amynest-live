import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  COLOR_MEMORY_FLASH_MS,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong, feedbackTap } from "@/lib/game-feedback";
import {
  GAME_SESSION_ROUNDS,
  sessionSequenceLengths,
} from "@/lib/game-session-progression";

const COLORS = [
  { id: "r", name: "Red", bg: "hsl(var(--brand-red-500))" },
  { id: "b", name: "Blue", bg: "hsl(var(--brand-blue-500))" },
  { id: "g", name: "Green", bg: "hsl(var(--brand-green-500))" },
  { id: "y", name: "Yellow", bg: "hsl(var(--brand-amber-400))" },
  { id: "p", name: "Purple", bg: "hsl(var(--brand-purple-500))" },
  { id: "o", name: "Orange", bg: "hsl(var(--brand-orange-400))" },
];

function buildSequence(len: number): string[] {
  return Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);
}

export function ColorMemoryGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const roundLens = useMemo(() => sessionSequenceLengths(GAME_SESSION_ROUNDS), []);
  const sequences = useMemo(() => roundLens.map(buildSequence), [roundLens]);
  const flashMs = COLOR_MEMORY_FLASH_MS[difficulty];

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "feedback">("show");
  const [showIdx, setShowIdx] = useState(0);
  const [input, setInput] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [correctRound, setCorrectRound] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<number | null>(null);

  const resetDifficulty = (level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setRound(0);
    setPhase("show");
    setShowIdx(0);
    setInput([]);
    setScore(0);
    setCorrectRound(false);
    setFeedback(null);
  };

  const seq = sequences[round] ?? [];

  useEffect(() => {
    if (phase !== "show" || seq.length === 0) return;
    setShowIdx(0);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      if (i >= seq.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setTimeout(() => { setPhase("input"); setInput([]); }, 350);
      } else {
        setShowIdx(i);
      }
    }, flashMs);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [round, phase, seq.length, flashMs]);

  if (round >= sequences.length) return null;

  const onPick = (id: string) => {
    if (phase !== "input") return;
    void feedbackTap();
    const next = [...input, id];
    setInput(next);
    if (next.length === seq.length) {
      const ok = next.every((c, i) => c === seq[i]);
      setCorrectRound(ok);
      setPhase("feedback");
      setFeedback(ok ? "correct" : "wrong");
      void (ok ? feedbackCorrect() : feedbackWrong());
      const newScore = ok ? score + 1 : score;
      if (ok) setScore(newScore);
      setTimeout(() => {
        if (round + 1 >= sequences.length) onFinish(newScore, sequences.length);
        else { setRound((r) => r + 1); setPhase("show"); setFeedback(null); }
      }, 1100);
    }
  };

  return (
    <GameShell
      round={round + 1}
      totalRounds={sequences.length}
      score={score}
      subtitle={`Length ${seq.length} colours`}
      feedback={feedback}
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetDifficulty}
    >
      <div style={{ height: 86, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {phase === "show" && (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: COLORS.find((c) => c.id === seq[showIdx])?.bg ?? "#fff",
              boxShadow: `0 0 30px ${COLORS.find((c) => c.id === seq[showIdx])?.bg ?? "#fff"}55`,
              transition: "background 0.15s",
            }}
          />
        )}
        {phase === "input" && (
          <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Tap the colours in order ({input.length}/{seq.length})
          </div>
        )}
        {phase === "feedback" && (
          <div style={{ fontSize: 32, color: correctRound ? "hsl(var(--brand-green-500))" : "hsl(var(--brand-red-500))", fontWeight: 800 }}>
            {correctRound ? "✓" : "✗"}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto" }}>
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={phase !== "input"}
            onClick={() => onPick(c.id)}
            style={{
              background: c.bg,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "20px 0",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "Quicksand, sans-serif",
              cursor: phase === "input" ? "pointer" : "default",
              opacity: phase === "input" ? 1 : 0.5,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
