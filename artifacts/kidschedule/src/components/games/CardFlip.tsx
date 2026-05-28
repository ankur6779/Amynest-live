import { useEffect, useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";

const ICONS = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐵", "🐰"];

export function CardFlipGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const pairs = 6;
  const cards = useMemo(() => {
    const set = ICONS.slice(0, pairs);
    return [...set, ...set].sort(() => Math.random() - 0.5);
  }, []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    if (cards[a] === cards[b]) {
      setMatched((m) => [...m, a, b]);
      void feedbackCorrect();
    }
    const t = setTimeout(() => setFlipped([]), 700);
    return () => clearTimeout(t);
  }, [flipped, cards]);

  useEffect(() => {
    if (matched.length === cards.length) {
      const extraMoves = Math.max(0, moves - pairs);
      const score = Math.max(0, Math.min(pairs, pairs + 3 - extraMoves));
      onFinish(score, pairs);
    }
  }, [matched, cards.length, moves, onFinish, pairs]);

  const onClick = (i: number) => {
    if (flipped.length === 2) return;
    if (flipped.includes(i) || matched.includes(i)) return;
    void feedbackTap();
    if (flipped.length === 1) setMoves((m) => m + 1);
    setFlipped((f) => [...f, i]);
  };

  const pairsFound = matched.length / 2;
  const progress = cards.length > 0 ? (matched.length / cards.length) * 100 : 0;

  return (
    <GameShell
      subtitle={`Pairs ${pairsFound} / ${pairs} · Moves ${moves}`}
      score={pairsFound}
      progress={progress}
      progressLabel="Pairs matched"
      title="Find all the matching pairs"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          maxWidth: 280,
          margin: "0 auto",
        }}
      >
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onClick(i)}
              disabled={matched.includes(i)}
              style={{
                aspectRatio: "1 / 1",
                fontSize: 28,
                borderRadius: 10,
                background: matched.includes(i)
                  ? gameTheme.successBg
                  : open
                    ? "rgba(139,92,246,0.25)"
                    : "linear-gradient(135deg, hsl(var(--brand-violet-700)), hsl(var(--brand-violet-900)))",
                border:
                  "1px solid " +
                  (matched.includes(i) ? "rgba(34,197,94,0.5)" : gameTheme.glassBorder),
                color: gameTheme.text,
                cursor: open ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
            >
              {open ? c : "✦"}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
