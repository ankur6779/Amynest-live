import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS } from "@/lib/game-session-progression";

const PALETTE = [
  { id: 0, color: "hsl(var(--brand-red-500))", label: "Red" },
  { id: 1, color: "hsl(var(--brand-blue-500))", label: "Blue" },
  { id: 2, color: "hsl(var(--brand-green-500))", label: "Green" },
  { id: 3, color: "hsl(var(--brand-amber-500))", label: "Yellow" },
  { id: 4, color: "hsl(var(--brand-purple-500))", label: "Purple" },
  { id: 5, color: "hsl(var(--brand-orange-500))", label: "Orange" },
];

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

export function ColorFillGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const picOrder = useMemo(() => {
    const shuffled = [...PICTURES].sort(() => Math.random() - 0.5);
    const out = [...shuffled];
    while (out.length < GAME_SESSION_ROUNDS) {
      out.push(shuffled[out.length % shuffled.length]);
    }
    return out.slice(0, GAME_SESSION_ROUNDS);
  }, []);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [activePalette, setActivePalette] = useState<number>(0);
  const [filled, setFilled] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<"correct" | null>(null);

  const pic = picOrder[roundIdx];

  const fill = (r: number, c: number) => {
    void feedbackTap();
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
        if (actual !== target) {
          allCorrect = false;
          break;
        }
      }
      if (!allCorrect) break;
    }
    if (!allCorrect) return;

    const newScore = score + 1;
    setScore(newScore);
    setFeedback("correct");
    void feedbackCorrect();
    setTimeout(() => {
      if (roundIdx + 1 >= GAME_SESSION_ROUNDS) {
        onFinish(newScore, GAME_SESSION_ROUNDS);
      } else {
        setRoundIdx((i) => i + 1);
        setFilled(new Map());
        setActivePalette(0);
        setFeedback(null);
      }
    }, 800);
  };

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
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      feedback={feedback}
      feedbackText={feedback === "correct" ? "Perfect colours! 🎨" : undefined}
      subtitle={`Picture: ${pic.label}`}
      title="Pick a colour, then tap cells to fill them"
      footer="Hint: small dot in each cell shows the target colour."
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {usedPalette.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePalette(p.id)}
            title={p.label}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: p.color,
              border: activePalette === p.id ? "3px solid #fff" : "2px solid transparent",
              cursor: "pointer",
              boxShadow: activePalette === p.id ? `0 0 0 2px ${p.color}` : "none",
              transition: "all 0.15s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 60px)",
          gridTemplateRows: "repeat(4, 60px)",
          gap: 4,
          margin: "0 auto 14px",
          width: "fit-content",
          background: "rgba(255,255,255,0.05)",
          padding: 6,
          borderRadius: 14,
          border: `1px solid ${gameTheme.glassBorder}`,
        }}
      >
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
                type="button"
                onClick={() => fill(r, c)}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 10,
                  background: painted ? (PALETTE[paintedIdx!]?.color ?? "#fff") : "rgba(255,255,255,0.08)",
                  border: wrong
                    ? "2px solid rgba(239,68,68,0.8)"
                    : correct
                      ? "2px solid rgba(34,197,94,0.7)"
                      : `1px solid ${gameTheme.glassBorder}`,
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.12s",
                }}
                title={`Target: ${PALETTE[targetIdx]?.label}`}
              >
                {!painted && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: hintColor,
                      opacity: 0.4,
                    }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>

      {allFilled && !feedback && (
        <button
          type="button"
          onClick={checkAndAdvance}
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            color: gameTheme.text,
            border: "none",
            borderRadius: 999,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          Check! ✓
        </button>
      )}
    </GameShell>
  );
}
