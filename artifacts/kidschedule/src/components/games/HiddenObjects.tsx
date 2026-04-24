import { useMemo, useState } from "react";

// ── Scene definitions ─────────────────────────────────────────────────────────
// Each scene is an 8-element "emoji pool" placed across a 4×5 grid (20 cells).
// 5 of the emojis are the "targets" — the user must tap all 5 to win.

interface Scene {
  name: string;
  targets: string[];   // exactly 5, the ones to find
  distractors: string[]; // fills the rest of the grid
}

const SCENES: Scene[] = [
  {
    name: "The Garden",
    targets:    ["🌸", "🐛", "🍄", "🦋", "🌻"],
    distractors: ["🌿", "🍃", "🌱", "🌾", "🍀", "🌲", "🌳", "🐝", "🌼", "🍁", "🪨", "🌵", "🍂", "🐞"],
  },
  {
    name: "The Ocean",
    targets:    ["🐠", "🦀", "🐚", "🦑", "🐙"],
    distractors: ["🌊", "🫧", "🪸", "🐡", "🐟", "🦞", "🦐", "🦈", "🐬", "🐳", "🐋", "🦭", "🪼", "🌀"],
  },
  {
    name: "The Kitchen",
    targets:    ["🍕", "🍦", "🎂", "🍩", "🍪"],
    distractors: ["🥄", "🍴", "🥘", "🥗", "🍳", "🧂", "🥞", "🍞", "🫕", "🧁", "🥧", "🧇", "🥐", "🍱"],
  },
  {
    name: "The Toy Box",
    targets:    ["🧸", "🎮", "🪀", "🪁", "🎲"],
    distractors: ["🎯", "🎳", "🎰", "🎠", "🧩", "🃏", "🀄", "🎱", "🎵", "📦", "🪆", "🛕", "🏆", "🎪"],
  },
];

const COLS = 4;
const ROWS = 5;
const TOTAL_CELLS = COLS * ROWS;
const ROUNDS = 3;

function buildGrid(scene: Scene): string[] {
  const all = [...scene.targets, ...scene.distractors];
  const pool = all.sort(() => Math.random() - 0.5).slice(0, TOTAL_CELLS);
  // ensure all targets are present (replace last N slots if missing)
  let idx = 0;
  for (const t of scene.targets) {
    if (!pool.includes(t)) pool[TOTAL_CELLS - 1 - idx++] = t;
  }
  return pool.sort(() => Math.random() - 0.5);
}

export function HiddenObjectsGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const sceneOrder = useMemo(() =>
    [...SCENES].sort(() => Math.random() - 0.5).slice(0, ROUNDS),
  []);

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
      const next = new Set(found).add(cellIdx);
      setFound(next);
      if (next.size === scene.targets.length) {
        const newScore = score + 1;
        setScore(newScore);
        setRoundDone(true);
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
      setWrong(cellIdx);
      setTimeout(() => setWrong(null), 500);
    }
  };

  const foundTargets = new Set(
    [...found].map((idx) => grid[idx]).filter((e) => scene.targets.includes(e)),
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 4 }}>
        Round {roundIdx + 1} of {ROUNDS} — <strong style={{ color: "#fff" }}>"{scene.name}"</strong>
      </div>

      {/* Target row */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: "#7c6fb8", fontSize: 11, marginBottom: 4 }}>Find these 5 items:</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {scene.targets.map((t) => (
            <div key={t} style={{
              width: 36, height: 36, fontSize: 22, borderRadius: 8,
              background: foundTargets.has(t) ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)",
              border: `1.5px solid ${foundTargets.has(t) ? "rgba(34,197,94,0.6)" : "rgba(139,92,246,0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: foundTargets.has(t) ? "none" : "grayscale(0.5) opacity(0.7)",
              transition: "all 0.2s",
            }}>
              {foundTargets.has(t) ? t : "❓"}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 56px)`,
        gap: 6,
        margin: "0 auto 12px",
        width: "fit-content",
        background: "rgba(255,255,255,0.04)",
        padding: 8,
        borderRadius: 16,
        border: "1px solid rgba(139,92,246,0.25)",
      }}>
        {grid.map((emoji, i) => {
          const isFound = found.has(i);
          const isWrong = wrong === i;
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              style={{
                width: 56, height: 56, fontSize: 24, borderRadius: 10,
                background: isFound
                  ? "rgba(34,197,94,0.22)"
                  : isWrong
                  ? "rgba(239,68,68,0.22)"
                  : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${isFound ? "rgba(34,197,94,0.6)" : isWrong ? "rgba(239,68,68,0.5)" : "rgba(139,92,246,0.2)"}`,
                cursor: isFound ? "default" : "pointer",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <div style={{ color: "#7c6fb8", fontSize: 11 }}>
        Found <strong style={{ color: "#c4b5fd" }}>{foundTargets.size}</strong> / {scene.targets.length}
      </div>
    </div>
  );
}
