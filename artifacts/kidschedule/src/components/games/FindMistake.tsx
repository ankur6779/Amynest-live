import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS, sessionGridSide } from "@/lib/game-session-progression";

interface Round {
  tiles: string[];
  mistakeIdx: number;
}

const SETS: { base: string; mistake: string }[] = [
  { base: "A", mistake: "B" },
  { base: "7", mistake: "1" },
  { base: "★", mistake: "☆" },
  { base: "○", mistake: "◆" },
  { base: "3", mistake: "8" },
  { base: "b", mistake: "d" },
  { base: "+", mistake: "×" },
  { base: "M", mistake: "N" },
  { base: "9", mistake: "6" },
];

function buildRound(roundIndex: number): Round {
  const s = SETS[Math.floor(Math.random() * SETS.length)];
  const side = sessionGridSide(roundIndex, GAME_SESSION_ROUNDS);
  const cells = side * side;
  const tiles = Array(cells).fill(s.base);
  const idx = Math.floor(Math.random() * cells);
  tiles[idx] = s.mistake;
  return { tiles, mistakeIdx: idx };
}

export function FindMistakeGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const TOTAL = GAME_SESSION_ROUNDS;
  const rounds = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => buildRound(i)),
    [],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  if (idx >= TOTAL) return null;

  const r = rounds[idx];

  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === r.mistakeIdx;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) {
      setScore((s) => s + 1);
      void feedbackCorrect();
    } else {
      void feedbackWrong();
    }
    setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      if (idx + 1 >= TOTAL) onFinish(ok ? score + 1 : score, TOTAL);
      else setIdx((n) => n + 1);
    }, 900);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={TOTAL}
      score={score}
      feedback={feedback}
      title="Tap the one that's different"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.round(Math.sqrt(r.tiles.length))}, 1fr)`,
          gap: 8,
          maxWidth: r.tiles.length > 9 ? 300 : 260,
          margin: "0 auto",
        }}
      >
        {r.tiles.map((c, i) => {
          const reveal = picked !== null;
          const isMistake = i === r.mistakeIdx;
          const isPicked = picked === i;
          const bg =
            reveal && isMistake
              ? "hsl(var(--brand-green-500))"
              : reveal && isPicked && !isMistake
                ? "hsl(var(--brand-red-500))"
                : "rgba(255,255,255,0.08)";
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onPick(i)}
              style={{
                background: bg,
                color: gameTheme.text,
                border: `1px solid ${gameTheme.glassBorder}`,
                borderRadius: 12,
                padding: "16px 0",
                fontSize: 26,
                fontWeight: 800,
                fontFamily: gameTheme.fontDisplay,
                cursor: reveal ? "default" : "pointer",
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
