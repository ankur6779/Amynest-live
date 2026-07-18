import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { useElementSize } from "@/hooks/use-element-size";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  getSoftFailEncouragement,
  getSoftFailHint,
  SOFT_FAIL_MAX_ATTEMPTS,
} from "@/lib/game-experience";
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
  const [attempts, setAttempts] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | undefined>();

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

  const goNext = (nextScore: number) => {
    setPicked(null);
    setFeedback(null);
    setFeedbackText(undefined);
    setAttempts(0);
    if (idx + 1 >= TOTAL) onFinish(nextScore, TOTAL);
    else setIdx((n) => n + 1);
  };

  const onPick = (i: number) => {
    if (feedback) return;
    const ok = i === r.mistakeIdx;
    if (ok) {
      setPicked(i);
      setFeedback("correct");
      setFeedbackText("You found it!");
      const nextScore = score + 1;
      setScore(nextScore);
      void feedbackCorrect();
      window.setTimeout(() => goNext(nextScore), reducedMotion ? 250 : 700);
      return;
    }

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setPicked(i);
    setFeedback("wrong");
    void feedbackWrong();
    const hint = getSoftFailHint("mistake", nextAttempt);
    setFeedbackText(hint ?? getSoftFailEncouragement(nextAttempt, idx));

    if (nextAttempt >= SOFT_FAIL_MAX_ATTEMPTS) {
      window.setTimeout(() => goNext(score), reducedMotion ? 400 : 1000);
      return;
    }

    window.setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      setFeedbackText(undefined);
    }, reducedMotion ? 300 : 900);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={TOTAL}
      score={score}
      feedback={feedback}
      feedbackText={feedbackText}
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
            const isMistake = i === r.mistakeIdx;
            const isPicked = picked === i;
            const showCorrect = feedback === "correct" && isMistake;
            const showWrongPick = feedback === "wrong" && isPicked && !isMistake;
            const bg = showCorrect
              ? "hsl(var(--brand-green-500))"
              : showWrongPick
                ? "hsl(var(--brand-amber-500))"
                : "rgba(255,255,255,0.08)";
            return (
              <button
                key={i}
                type="button"
                className="game-choice-a11y"
                disabled={!!feedback}
                onClick={() => onPick(i)}
                aria-label={`Tile ${i + 1}: ${c}${showCorrect ? ", correct" : showWrongPick ? ", try again" : ""}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  minWidth: GAME_LAYOUT.touchMin,
                  minHeight: GAME_LAYOUT.touchMin,
                  background: bg,
                  color: gameTheme.text,
                  border: showCorrect
                    ? "3px solid #fff"
                    : showWrongPick
                      ? "2px dashed rgba(255,255,255,0.85)"
                      : `1px solid ${gameTheme.glassBorder}`,
                  borderRadius: 12,
                  padding: 0,
                  fontSize,
                  fontWeight: 800,
                  fontFamily: gameTheme.fontDisplay,
                  cursor: feedback ? "default" : "pointer",
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
