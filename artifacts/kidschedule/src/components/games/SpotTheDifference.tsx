import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { useElementSize } from "@/hooks/use-element-size";
import { feedbackCorrect, feedbackTap, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  fitCellFontSize,
  fitGridCellSize,
  GAME_LAYOUT,
} from "@/lib/game-layout-tokens";
import { GAME_SESSION_ROUNDS } from "@/lib/game-session-progression";
import { useReducedMotion } from "@/lib/reduced-motion";

interface SDScene {
  name: string;
  base: string[][];
  diffs: [number, number][];
  changed: string[][];
}

const ALL_SCENES: SDScene[] = [
  {
    name: "Farm Friends",
    base: [
      ["🐄", "🐑", "🐔", "🐷"],
      ["🌽", "🥕", "🌻", "🍎"],
      ["🚜", "🌾", "🏡", "🌳"],
      ["☀️", "🐝", "🦋", "🌸"],
    ],
    diffs: [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 3],
    ],
    changed: [
      ["🐄", "🐐", "🐔", "🐷"],
      ["🌽", "🥕", "🍀", "🍎"],
      ["🚗", "🌾", "🏡", "🌳"],
      ["☀️", "🐝", "🦋", "🌹"],
    ],
  },
  {
    name: "Space Station",
    base: [
      ["🚀", "🌍", "🌟", "🛸"],
      ["🌙", "👾", "☄️", "🪐"],
      ["🔭", "🛰️", "🌠", "🌌"],
      ["👨‍🚀", "🤖", "🪨", "💫"],
    ],
    diffs: [
      [0, 2],
      [1, 0],
      [2, 3],
      [3, 1],
    ],
    changed: [
      ["🚀", "🌍", "⭐", "🛸"],
      ["⚡", "👾", "☄️", "🪐"],
      ["🔭", "🛰️", "🌠", "🎆"],
      ["👨‍🚀", "🦾", "🪨", "💫"],
    ],
  },
  {
    name: "Birthday Party",
    base: [
      ["🎂", "🎈", "🎁", "🎉"],
      ["🍭", "🎊", "🎀", "🧁"],
      ["🥳", "🎵", "🍾", "🕯️"],
      ["👑", "🎯", "🎠", "🌈"],
    ],
    diffs: [
      [0, 1],
      [1, 3],
      [2, 2],
      [3, 0],
    ],
    changed: [
      ["🎂", "🎏", "🎁", "🎉"],
      ["🍭", "🎊", "🎀", "🍰"],
      ["🥳", "🎵", "🍻", "🕯️"],
      ["💎", "🎯", "🎠", "🌈"],
    ],
  },
  {
    name: "Jungle Trek",
    base: [
      ["🦁", "🐘", "🦒", "🦓"],
      ["🌿", "🐦", "🦜", "🌴"],
      ["🐊", "🦋", "🐸", "🍃"],
      ["🌺", "🦧", "🐆", "💧"],
    ],
    diffs: [
      [0, 0],
      [1, 2],
      [2, 1],
      [3, 3],
    ],
    changed: [
      ["🐯", "🐘", "🦒", "🦓"],
      ["🌿", "🐦", "🦚", "🌴"],
      ["🐊", "🦅", "🐸", "🍃"],
      ["🌺", "🦧", "🐆", "🌊"],
    ],
  },
];

const GRID_COLS = 4;

export function SpotTheDifferenceGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [layoutRef, { width: layoutWidth }] = useElementSize();
  const scenes = useMemo(() => {
    const shuffled = [...ALL_SCENES].sort(() => Math.random() - 0.5);
    const out = [...shuffled];
    while (out.length < GAME_SESSION_ROUNDS) out.push(shuffled[out.length % shuffled.length]);
    return out.slice(0, GAME_SESSION_ROUNDS);
  }, []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [foundDiffs, setFoundDiffs] = useState<Set<string>>(new Set());
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  const scene = scenes[roundIdx];
  const total = scene.diffs.length;
  const diffSet = useMemo(() => new Set(scene.diffs.map(([r, c]) => `${r}-${c}`)), [scene]);

  const panelGap = GAME_LAYOUT.gridGap * 2;
  // Prefer stacking when side-by-side cells would fall under touch-min.
  const sideBySideCell =
    layoutWidth > 0
      ? fitGridCellSize({
          containerWidth: (layoutWidth - panelGap) / 2,
          columns: GRID_COLS,
          minCell: 1,
          maxCell: GAME_LAYOUT.cellMaxComfort,
        })
      : 0;
  const stackPanels =
    layoutWidth <= 0 ||
    layoutWidth < GAME_LAYOUT.stackPanelsBelow ||
    sideBySideCell < GAME_LAYOUT.touchMin;
  const panelWidth = stackPanels
    ? layoutWidth || GAME_LAYOUT.breakpoints.sm
    : (layoutWidth - panelGap) / 2;

  const cellSize = fitGridCellSize({
    containerWidth: Math.max(panelWidth, GAME_LAYOUT.touchMin * GRID_COLS),
    columns: GRID_COLS,
    minCell: GAME_LAYOUT.touchMin,
    maxCell: GAME_LAYOUT.cellMaxComfort,
  });
  const fontSize = fitCellFontSize(cellSize, 0.46);

  const tapRight = (r: number, c: number) => {
    const key = `${r}-${c}`;
    if (foundDiffs.has(key) || roundDone) return;
    if (diffSet.has(key)) {
      void feedbackTap();
      const next = new Set(foundDiffs).add(key);
      setFoundDiffs(next);
      if (next.size === total) {
        const newScore = score + 1;
        setScore(newScore);
        setRoundDone(true);
        void feedbackCorrect();
        window.setTimeout(() => {
          if (roundIdx + 1 >= GAME_SESSION_ROUNDS) {
            onFinish(newScore, GAME_SESSION_ROUNDS);
          } else {
            setRoundIdx((i) => i + 1);
            setFoundDiffs(new Set());
            setWrongCell(null);
            setRoundDone(false);
          }
        }, reducedMotion ? 200 : 800);
      }
    } else {
      void feedbackWrong();
      setWrongCell(key);
      window.setTimeout(() => setWrongCell(null), reducedMotion ? 200 : 500);
    }
  };

  const renderGrid = (grid: string[][], isRight: boolean) => (
    <div
      role={isRight ? "group" : "img"}
      aria-label={isRight ? "Changed picture — tap differences" : "Original picture"}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, ${cellSize}px))`,
        gap: GAME_LAYOUT.gridGap / 2,
        background: "rgba(255,255,255,0.04)",
        padding: GAME_LAYOUT.gridPadding,
        borderRadius: 12,
        border: `1px solid ${gameTheme.glassBorder}`,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        justifyContent: "center",
      }}
    >
      {grid.map((row, r) =>
        row.map((emoji, c) => {
          const key = `${r}-${c}`;
          const isFound = foundDiffs.has(key);
          const isWrong = wrongCell === key && isRight;
          return (
            <button
              key={key}
              type="button"
              disabled={!isRight || isFound || roundDone}
              onClick={() => isRight && tapRight(r, c)}
              aria-label={
                isRight
                  ? isFound
                    ? `Difference found at row ${r + 1} column ${c + 1}`
                    : `Cell row ${r + 1} column ${c + 1}`
                  : undefined
              }
              style={{
                width: cellSize,
                height: cellSize,
                minWidth: GAME_LAYOUT.touchMin,
                minHeight: GAME_LAYOUT.touchMin,
                fontSize,
                borderRadius: 8,
                background: isFound
                  ? gameTheme.successBg
                  : isWrong
                    ? gameTheme.errorBg
                    : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${
                  isFound
                    ? "rgba(34,197,94,0.65)"
                    : isWrong
                      ? "rgba(239,68,68,0.65)"
                      : gameTheme.glassBorder
                }`,
                cursor: isRight && !isFound ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: reducedMotion ? "none" : "all 0.12s",
                position: "relative",
                color: gameTheme.text,
                padding: 0,
              }}
            >
              {emoji}
              {isRight && isFound && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 3,
                    fontSize: Math.max(10, fitCellFontSize(cellSize, 0.22)),
                    color: gameTheme.success,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      subtitle={`${scene.name} — found ${foundDiffs.size} / ${total}`}
      title="Compare both pictures. Tap what changed."
      idleHint="Compare left and right — look for one small change."
      feedback={roundDone ? "correct" : null}
      feedbackText={roundDone ? `All ${total} differences found!` : undefined}
    >
      <div
        ref={layoutRef}
        style={{
          display: "flex",
          flexDirection: stackPanels ? "column" : "row",
          justifyContent: "center",
          alignItems: stackPanels ? "stretch" : "flex-start",
          gap: panelGap,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ flex: stackPanels ? undefined : "1 1 0", minWidth: 0, width: stackPanels ? "100%" : undefined }}>
          <div
            style={{
              color: gameTheme.textMuted,
              fontSize: "clamp(10px, 2.8vw, 12px)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Original
          </div>
          {renderGrid(scene.base, false)}
        </div>
        <div style={{ flex: stackPanels ? undefined : "1 1 0", minWidth: 0, width: stackPanels ? "100%" : undefined }}>
          <div
            style={{
              color: gameTheme.accentSoft,
              fontSize: "clamp(10px, 2.8vw, 12px)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontWeight: 700,
            }}
          >
            Changed — tap here
          </div>
          {renderGrid(scene.changed, true)}
        </div>
      </div>
    </GameShell>
  );
}
