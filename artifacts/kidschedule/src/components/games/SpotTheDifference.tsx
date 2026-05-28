import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackTap, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";

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

const ROUNDS = 3;

export function SpotTheDifferenceGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const scenes = useMemo(() => [...ALL_SCENES].sort(() => Math.random() - 0.5).slice(0, ROUNDS), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [foundDiffs, setFoundDiffs] = useState<Set<string>>(new Set());
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  const scene = scenes[roundIdx];
  const total = scene.diffs.length;
  const diffSet = useMemo(() => new Set(scene.diffs.map(([r, c]) => `${r}-${c}`)), [scene]);

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
        setTimeout(() => {
          if (roundIdx + 1 >= ROUNDS) {
            onFinish(newScore, ROUNDS);
          } else {
            setRoundIdx((i) => i + 1);
            setFoundDiffs(new Set());
            setWrongCell(null);
            setRoundDone(false);
          }
        }, 800);
      }
    } else {
      void feedbackWrong();
      setWrongCell(key);
      setTimeout(() => setWrongCell(null), 500);
    }
  };

  const CELL_SIZE = 52;

  const renderGrid = (grid: string[][], isRight: boolean) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(4, ${CELL_SIZE}px)`,
        gap: 3,
        background: "rgba(255,255,255,0.04)",
        padding: 6,
        borderRadius: 12,
        border: `1px solid ${gameTheme.glassBorder}`,
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
              onClick={() => isRight && tapRight(r, c)}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                fontSize: 24,
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
                transition: "all 0.12s",
                position: "relative",
              }}
            >
              {emoji}
              {isRight && isFound && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 3,
                    fontSize: 11,
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
      totalRounds={ROUNDS}
      score={score}
      subtitle={`${scene.name} — found ${foundDiffs.size} / ${total}`}
      title="Tap the differences in the right picture"
      feedback={roundDone ? "correct" : null}
      feedbackText={roundDone ? `All ${total} differences found!` : undefined}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: gameTheme.textMuted,
              fontSize: 10,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Original
          </div>
          {renderGrid(scene.base, false)}
        </div>
        <div>
          <div
            style={{
              color: gameTheme.accentSoft,
              fontSize: 10,
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
