import { useMemo, useState } from "react";

// ── Scene definitions ─────────────────────────────────────────────────────────
// Two 4×4 emoji grids side-by-side. A handful of cells differ.
// The player must tap the different cells in the RIGHT (changed) grid.

interface SDScene {
  name: string;
  base: string[][];           // 4×4 original
  diffs: [number, number][];  // [row, col] cells that are changed in the right grid
  changed: string[][];        // replacement emojis for those diff positions
}

const ALL_SCENES: SDScene[] = [
  {
    name: "Farm Friends",
    base: [
      ["🐄", "🐑", "🐔", "🐷"],
      ["🌽", "🥕", "🌻", "🍎"],
      ["🚜", "🌾", "🏡", "🌳"],
      ["☀️",  "🐝", "🦋", "🌸"],
    ],
    diffs: [[0,1],[1,2],[2,0],[3,3]],
    changed: [
      ["🐄", "🐐", "🐔", "🐷"],
      ["🌽", "🥕", "🍀", "🍎"],
      ["🚗", "🌾", "🏡", "🌳"],
      ["☀️",  "🐝", "🦋", "🌹"],
    ],
  },
  {
    name: "Space Station",
    base: [
      ["🚀", "🌍", "🌟", "🛸"],
      ["🌙", "👾", "☄️",  "🪐"],
      ["🔭", "🛰️", "🌠", "🌌"],
      ["👨‍🚀","🤖", "🪨", "💫"],
    ],
    diffs: [[0,2],[1,0],[2,3],[3,1]],
    changed: [
      ["🚀", "🌍", "⭐", "🛸"],
      ["⚡", "👾", "☄️",  "🪐"],
      ["🔭", "🛰️", "🌠", "🎆"],
      ["👨‍🚀","🦾", "🪨", "💫"],
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
    diffs: [[0,1],[1,3],[2,2],[3,0]],
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
    diffs: [[0,0],[1,2],[2,1],[3,3]],
    changed: [
      ["🐯", "🐘", "🦒", "🦓"],
      ["🌿", "🐦", "🦚", "🌴"],
      ["🐊", "🦅", "🐸", "🍃"],
      ["🌺", "🦧", "🐆", "🌊"],
    ],
  },
];

const ROUNDS = 3;

export function SpotTheDifferenceGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const scenes = useMemo(() =>
    [...ALL_SCENES].sort(() => Math.random() - 0.5).slice(0, ROUNDS),
  []);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [foundDiffs, setFoundDiffs] = useState<Set<string>>(new Set());
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  const scene = scenes[roundIdx];
  const total = scene.diffs.length;
  const diffSet = useMemo(() =>
    new Set(scene.diffs.map(([r, c]) => `${r}-${c}`)),
  [scene]);

  const tapRight = (r: number, c: number) => {
    const key = `${r}-${c}`;
    if (foundDiffs.has(key) || roundDone) return;
    if (diffSet.has(key)) {
      const next = new Set(foundDiffs).add(key);
      setFoundDiffs(next);
      if (next.size === total) {
        const newScore = score + 1;
        setScore(newScore);
        setRoundDone(true);
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
      setWrongCell(key);
      setTimeout(() => setWrongCell(null), 500);
    }
  };

  const CELL_SIZE = 52;

  const renderGrid = (grid: string[][], isRight: boolean) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(4, ${CELL_SIZE}px)`,
      gap: 3,
      background: "rgba(255,255,255,0.04)",
      padding: 6,
      borderRadius: 12,
      border: "1px solid rgba(139,92,246,0.25)",
    }}>
      {grid.map((row, r) =>
        row.map((emoji, c) => {
          const key = `${r}-${c}`;
          const isDiff = diffSet.has(key);
          const isFound = foundDiffs.has(key);
          const isWrong = wrongCell === key && isRight;
          return (
            <button
              key={key}
              onClick={() => isRight && tapRight(r, c)}
              style={{
                width: CELL_SIZE, height: CELL_SIZE, fontSize: 24, borderRadius: 8,
                background: isFound
                  ? "rgba(34,197,94,0.25)"
                  : isWrong
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${
                  isFound ? "rgba(34,197,94,0.65)"
                  : isWrong ? "rgba(239,68,68,0.65)"
                  : "rgba(139,92,246,0.2)"
                }`,
                cursor: isRight && !isFound ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
                position: "relative",
              }}
            >
              {emoji}
              {isRight && isFound && (
                <span style={{
                  position: "absolute", top: 2, right: 3,
                  fontSize: 11, color: "#86efac",
                }}>✓</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 4 }}>
        Round {roundIdx + 1} of {ROUNDS} — <strong style={{ color: "#fff" }}>"{scene.name}"</strong>
      </div>
      <div style={{ color: "#7c6fb8", fontSize: 11, marginBottom: 10 }}>
        Tap the <strong style={{ color: "#c4b5fd" }}>differences</strong> in the right picture!&nbsp;
        Found: {foundDiffs.size} / {total}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ color: "#7c6fb8", fontSize: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Original</div>
          {renderGrid(scene.base, false)}
        </div>
        <div>
          <div style={{ color: "#c4b5fd", fontSize: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Changed ← tap here</div>
          {renderGrid(scene.changed, true)}
        </div>
      </div>

      {roundDone && (
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "#86efac" }}>
          All {total} differences found! 👀
        </div>
      )}
    </div>
  );
}
