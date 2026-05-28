import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackTap, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";

interface Scene {
  name: string;
  targets: string[];
  distractors: string[];
}

const SCENES: Scene[] = [
  {
    name: "The Garden",
    targets: ["🌸", "🐛", "🍄", "🦋", "🌻"],
    distractors: ["🌿", "🍃", "🌱", "🌾", "🍀", "🌲", "🌳", "🐝", "🌼", "🍁", "🪨", "🌵", "🍂", "🐞"],
  },
  {
    name: "The Ocean",
    targets: ["🐠", "🦀", "🐚", "🦑", "🐙"],
    distractors: ["🌊", "🫧", "🪸", "🐡", "🐟", "🦞", "🦐", "🦈", "🐬", "🐳", "🐋", "🦭", "🪼", "🌀"],
  },
  {
    name: "The Kitchen",
    targets: ["🍕", "🍦", "🎂", "🍩", "🍪"],
    distractors: ["🥄", "🍴", "🥘", "🥗", "🍳", "🧂", "🥞", "🍞", "🫕", "🧁", "🥧", "🧇", "🥐", "🍱"],
  },
  {
    name: "The Toy Box",
    targets: ["🧸", "🎮", "🪀", "🪁", "🎲"],
    distractors: ["🎯", "🎳", "🎰", "🎠", "🧩", "🃏", "🀄", "🎱", "🎵", "📦", "🪆", "🛕", "🏆", "🎪"],
  },
];

const COLS = 4;
const ROWS = 5;
const TOTAL_CELLS = COLS * ROWS;
const ROUNDS = 3;

function buildGrid(scene: Scene): string[] {
  const neededDistractors = TOTAL_CELLS - scene.targets.length;
  const distractors = scene.distractors.slice(0, neededDistractors);
  let pool = [...scene.targets, ...distractors];
  while (pool.length < TOTAL_CELLS) {
    pool.push(scene.distractors[pool.length % scene.distractors.length]);
  }
  return pool.sort(() => Math.random() - 0.5).slice(0, TOTAL_CELLS);
}

export function HiddenObjectsGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const sceneOrder = useMemo(() => [...SCENES].sort(() => Math.random() - 0.5).slice(0, ROUNDS), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  const scene = sceneOrder[roundIdx];
  const grid = useMemo(() => buildGrid(scene), [scene]);

  const tap = (cellIdx: number) => {
    if (found.has(cellIdx) || roundDone) return;
    const emoji = grid[cellIdx];
    if (scene.targets.includes(emoji)) {
      void feedbackTap();
      const next = new Set(found).add(cellIdx);
      setFound(next);
      const foundTargetTypes = new Set(
        [...next].map((idx) => grid[idx]).filter((e) => scene.targets.includes(e)),
      );
      if (foundTargetTypes.size === scene.targets.length) {
        const newScore = score + 1;
        setScore(newScore);
        setRoundDone(true);
        void feedbackCorrect();
        setTimeout(() => {
          if (roundIdx + 1 >= ROUNDS) {
            onFinish(newScore, ROUNDS);
          } else {
            setRoundIdx((i) => i + 1);
            setFound(new Set());
            setWrong(null);
            setRoundDone(false);
          }
        }, 800);
      }
    } else {
      void feedbackWrong();
      setWrong(cellIdx);
      setTimeout(() => setWrong(null), 500);
    }
  };

  const foundTargets = new Set(
    [...found].map((idx) => grid[idx]).filter((e) => scene.targets.includes(e)),
  );

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={ROUNDS}
      score={score}
      subtitle={`Scene: ${scene.name}`}
      title="Find these 5 items"
      footer={
        <>
          Found <strong style={{ color: gameTheme.accentSoft }}>{foundTargets.size}</strong> /{" "}
          {scene.targets.length}
        </>
      }
    >
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {scene.targets.map((t) => (
            <div
              key={t}
              style={{
                width: 36,
                height: 36,
                fontSize: 22,
                borderRadius: 8,
                background: foundTargets.has(t) ? gameTheme.successBg : "rgba(255,255,255,0.08)",
                border: `1.5px solid ${
                  foundTargets.has(t) ? "rgba(34,197,94,0.6)" : gameTheme.glassBorder
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: foundTargets.has(t) ? "none" : "grayscale(0.5) opacity(0.7)",
                transition: "all 0.2s",
              }}
            >
              {foundTargets.has(t) ? t : "❓"}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 56px)`,
          gap: 6,
          margin: "0 auto",
          width: "fit-content",
          background: "rgba(255,255,255,0.04)",
          padding: 8,
          borderRadius: 16,
          border: `1px solid ${gameTheme.glassBorder}`,
        }}
      >
        {grid.map((emoji, i) => {
          const isFound = found.has(i);
          const isWrong = wrong === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              style={{
                width: 56,
                height: 56,
                fontSize: 24,
                borderRadius: 10,
                background: isFound
                  ? gameTheme.successBg
                  : isWrong
                    ? gameTheme.errorBg
                    : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${
                  isFound
                    ? "rgba(34,197,94,0.6)"
                    : isWrong
                      ? "rgba(239,68,68,0.5)"
                      : gameTheme.glassBorder
                }`,
                cursor: isFound ? "default" : "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
