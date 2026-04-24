import { useMemo, useState } from "react";

// Paint-by-numbers on a 4×4 grid. Each cell has a target color index.
// The player picks a color from a palette then taps cells to fill them.

const PALETTE = [
  { id: 0, color: "#ef4444", label: "Red"    },
  { id: 1, color: "#3b82f6", label: "Blue"   },
  { id: 2, color: "#22c55e", label: "Green"  },
  { id: 3, color: "#f59e0b", label: "Yellow" },
  { id: 4, color: "#a855f7", label: "Purple" },
  { id: 5, color: "#f97316", label: "Orange" },
];

// Each picture uses a subset of palette indices arranged on a 4×4 grid.
// Values map to PALETTE indices; -1 = white (background, auto-filled).
const PICTURES = [
  {
    label: "Rainbow Stripe",
    grid: [
      [0, 0, 0, 0],
      [3, 3, 3, 3],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
    ],
    usedColors: [0, 3, 1, 2],
  },
  {
    label: "Checkerboard",
    grid: [
      [0, 2, 0, 2],
      [2, 0, 2, 0],
      [0, 2, 0, 2],
      [2, 0, 2, 0],
    ],
    usedColors: [0, 2],
  },
  {
    label: "Sunset",
    grid: [
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [3, 3, 3, 3],
      [1, 1, 1, 1],
    ],
    usedColors: [5, 0, 3, 1],
  },
  {
    label: "Diamond",
    grid: [
      [1, 4, 4, 1],
      [4, 0, 0, 4],
      [4, 0, 0, 4],
      [1, 4, 4, 1],
    ],
    usedColors: [1, 4, 0],
  },
  {
    label: "Cross",
    grid: [
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 2],
    ],
    usedColors: [2, 0],
  },
];

const TOTAL = 4; // total rounds

export function ColorFillGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const picOrder = useMemo(() =>
    [...PICTURES].sort(() => Math.random() - 0.5).slice(0, TOTAL),
  []);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [activePalette, setActivePalette] = useState<number>(0);
  // Filled state: Map from "r-c" → palette index
  const [filled, setFilled] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<"correct" | null>(null);

  const pic = picOrder[roundIdx];

  const fill = (r: number, c: number) => {
    const key = `${r}-${c}`;
    setFilled((prev) => {
      const next = new Map(prev);
      next.set(key, activePalette);
      return next;
    });
  };

  const checkAndAdvance = () => {
    let allCorrect = true;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const target = pic.grid[r][c];
        const actual = filled.get(`${r}-${c}`);
        if (actual !== target) { allCorrect = false; break; }
      }
      if (!allCorrect) break;
    }
    if (!allCorrect) {
      // Let them keep trying — highlight errors briefly
      return;
    }
    const newScore = score + 1;
    setScore(newScore);
    setFeedback("correct");
    setTimeout(() => {
      if (roundIdx + 1 >= TOTAL) {
        onFinish(newScore, TOTAL);
      } else {
        setRoundIdx((i) => i + 1);
        setFilled(new Map());
        setActivePalette(0);
        setFeedback(null);
      }
    }, 800);
  };

  // Check if all cells are filled (even if wrong)
  const allFilled = (() => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!filled.has(`${r}-${c}`)) return false;
      }
    }
    return true;
  })();

  const usedPalette = PALETTE.filter((p) => pic.usedColors.includes(p.id));

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 4 }}>
        Round {roundIdx + 1} of {TOTAL} — "<strong style={{ color: "#fff" }}>{pic.label}</strong>"
      </div>
      <div style={{ color: "#7c6fb8", fontSize: 11, marginBottom: 10 }}>
        Pick a colour then tap cells to fill them.
      </div>

      {/* Color palette */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {usedPalette.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePalette(p.id)}
            title={p.label}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: p.color,
              border: activePalette === p.id ? "3px solid #fff" : "2px solid transparent",
              cursor: "pointer",
              boxShadow: activePalette === p.id ? `0 0 0 2px ${p.color}` : "none",
              transition: "all 0.15s",
            }}
          />
        ))}
      </div>

      {/* 4×4 grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 60px)",
        gridTemplateRows: "repeat(4, 60px)",
        gap: 4,
        margin: "0 auto 14px",
        width: "fit-content",
        background: "rgba(255,255,255,0.05)",
        padding: 6,
        borderRadius: 14,
        border: "1px solid rgba(139,92,246,0.3)",
      }}>
        {pic.grid.map((row, r) =>
          row.map((targetIdx, c) => {
            const key = `${r}-${c}`;
            const paintedIdx = filled.get(key);
            const painted = paintedIdx !== undefined;
            const correct = painted && paintedIdx === targetIdx;
            const wrong = painted && paintedIdx !== targetIdx;
            const hintColor = PALETTE[targetIdx]?.color;
            return (
              <button
                key={key}
                onClick={() => fill(r, c)}
                style={{
                  width: 60, height: 60, borderRadius: 10,
                  background: painted
                    ? PALETTE[paintedIdx!]?.color ?? "#fff"
                    : "rgba(255,255,255,0.08)",
                  border: wrong
                    ? "2px solid rgba(239,68,68,0.8)"
                    : correct
                    ? "2px solid rgba(34,197,94,0.7)"
                    : "1px solid rgba(139,92,246,0.25)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.12s",
                }}
                title={`Target: ${PALETTE[targetIdx]?.label}`}
              >
                {/* Tiny hint dot in corner */}
                {!painted && (
                  <span style={{
                    position: "absolute", bottom: 4, right: 4,
                    width: 10, height: 10, borderRadius: "50%",
                    background: hintColor,
                    opacity: 0.4,
                  }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {allFilled && !feedback && (
        <button
          onClick={checkAndAdvance}
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            color: "#fff", border: "none", borderRadius: 999,
            padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            marginBottom: 8,
          }}
        >
          Check! ✓
        </button>
      )}

      {feedback === "correct" && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#86efac" }}>
          Perfect colours! 🎨
        </div>
      )}

      <div style={{ color: "#7c6fb8", fontSize: 11, marginTop: 6 }}>
        Hint: small dot in each cell shows the target colour.
      </div>
    </div>
  );
}
