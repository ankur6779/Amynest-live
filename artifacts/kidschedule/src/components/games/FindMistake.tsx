import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { useElementSize } from "@/hooks/use-element-size";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  fitCellFontSize,
  fitChoiceGridMaxWidth,
  fitGridCellSize,
  GAME_LAYOUT,
} from "@/lib/game-layout-tokens";
import { GAME_SESSION_ROUNDS, sessionGridSide } from "@/lib/game-session-progression";
import { useReducedMotion } from "@/lib/reduced-motion";

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
  const reducedMotion = useReducedMotion();
  const [layoutRef, { width: layoutWidth }] = useElementSize();
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
  const side = Math.round(Math.sqrt(r.tiles.length));
  const gridMax = fitChoiceGridMaxWidth(
    layoutWidth || GAME_LAYOUT.breakpoints.md,
    side > 3 ? GAME_LAYOUT.choiceGridMaxPx : 280,
  );
  const cellSize = fitGridCellSize({
    containerWidth: gridMax,
    columns: side,
    gap: GAME_LAYOUT.gridGap,
    padding: 0,
    minCell: GAME_LAYOUT.touchMin,
    maxCell: side > 3 ? 56 : 72,
  });
  const fontSize = fitCellFontSize(cellSize, 0.42);

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
    window.setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      if (idx + 1 >= TOTAL) onFinish(ok ? score + 1 : score, TOTAL);
      else setIdx((n) => n + 1);
    }, reducedMotion ? 250 : 900);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={TOTAL}
      score={score}
      feedback={feedback}
      title="Look closely. Tap the different one."
      idleHint="Look for the one that doesn't match the others."
    >
      <div ref={layoutRef} style={{ width: "100%", maxWidth: "100%" }}>
        <div
          role="group"
          aria-label="Find the mistake grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${side}, ${cellSize}px)`,
            gap: GAME_LAYOUT.gridGap,
            width: "fit-content",
            maxWidth: "100%",
            margin: "0 auto",
            justifyContent: "center",
            boxSizing: "border-box",
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
                  ? "hsl(var(--brand-amber-500))"
                  : "rgba(255,255,255,0.08)";
            return (
              <button
                key={i}
                type="button"
                className="game-choice-a11y"
                disabled={reveal}
                onClick={() => onPick(i)}
                aria-label={`Tile ${i + 1}: ${c}${reveal && isMistake ? ", different one" : reveal && isPicked ? ", not this one" : ""}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  minWidth: GAME_LAYOUT.touchMin,
                  minHeight: GAME_LAYOUT.touchMin,
                  background: bg,
                  color: gameTheme.text,
                  border:
                    reveal && isMistake
                      ? "3px solid #fff"
                      : reveal && isPicked && !isMistake
                        ? "2px dashed rgba(255,255,255,0.85)"
                        : `1px solid ${gameTheme.glassBorder}`,
                  borderRadius: 12,
                  padding: 0,
                  fontSize,
                  fontWeight: 800,
                  fontFamily: gameTheme.fontDisplay,
                  cursor: reveal ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: reducedMotion ? "none" : "background 0.15s ease",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
