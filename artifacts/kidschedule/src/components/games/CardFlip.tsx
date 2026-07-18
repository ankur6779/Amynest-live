import { useEffect, useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  sessionCardPairs,
  sessionCardRevealDelayMs,
} from "@/lib/game-session-progression";

const ICONS = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐵", "🐰"];

export function CardFlipGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const pairs = sessionCardPairs();
  const revealDelay = sessionCardRevealDelayMs();
  const cards = useMemo(() => {
    const set = ICONS.slice(0, pairs);
    return [...set, ...set].sort(() => Math.random() - 0.5);
  }, [pairs]);
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
    // Higher mastery: hold the reveal a beat longer (working-memory stretch).
    const t = setTimeout(() => setFlipped([]), 700 + revealDelay);
    return () => clearTimeout(t);
  }, [flipped, cards, revealDelay]);

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
      title="Flip two cards. Find a matching pair!"
      idleHint="Remember where you saw each card — then find its twin."
    >
      <div
        role="group"
        aria-label="Memory cards"
        className="game-landscape-board"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          maxWidth: 320,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.includes(i);
          const isMatched = matched.includes(i);
          const label = isMatched
            ? `Card ${i + 1}, matched ${c}`
            : open
              ? `Card ${i + 1}, showing ${c}`
              : `Card ${i + 1}, face down`;
          return (
            <button
              key={i}
              type="button"
              className="game-choice-a11y"
              onClick={() => onClick(i)}
              disabled={isMatched}
              aria-label={label}
              aria-pressed={open}
              style={{
                aspectRatio: "1 / 1",
                fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
                borderRadius: 10,
                background: isMatched
                  ? gameTheme.successBg
                  : open
                    ? "rgba(139,92,246,0.25)"
                    : "linear-gradient(135deg, hsl(var(--brand-violet-700)), hsl(var(--brand-violet-900)))",
                border:
                  "1px solid " +
                  (isMatched ? "rgba(34,197,94,0.5)" : gameTheme.glassBorder),
                color: gameTheme.text,
                cursor: open ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
                minHeight: 48,
              }}
            >
              <span aria-hidden>{open ? c : "✦"}</span>
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
