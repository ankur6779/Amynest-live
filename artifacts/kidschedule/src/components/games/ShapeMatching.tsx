import { useMemo, useState } from "react";

interface ShapeDef {
  id: string;
  emoji: string;
  label: string;
}

const ALL_SHAPES: ShapeDef[] = [
  { id: "circle",    emoji: "⭕", label: "Circle"    },
  { id: "square",    emoji: "⬛", label: "Square"    },
  { id: "triangle",  emoji: "🔺", label: "Triangle"  },
  { id: "diamond",   emoji: "🔷", label: "Diamond"   },
  { id: "star",      emoji: "⭐", label: "Star"      },
  { id: "heart",     emoji: "❤️", label: "Heart"     },
  { id: "pentagon",  emoji: "⬠", label: "Pentagon"  },
  { id: "hexagon",   emoji: "⬡", label: "Hexagon"   },
];

const ROUNDS = 5;
const PER_ROUND = 4;

function buildRounds() {
  return Array.from({ length: ROUNDS }, () => {
    const shuffled = [...ALL_SHAPES].sort(() => Math.random() - 0.5).slice(0, PER_ROUND);
    return shuffled;
  });
}

export function ShapeMatchingGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const rounds = useMemo(() => buildRounds(), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ slotId: string; ok: boolean } | null>(null);

  const shapes = rounds[roundIdx];

  // Slots are the labels in shuffled order
  const slots = useMemo(() => [...shapes].sort(() => Math.random() - 0.5), [shapes]);

  const onPickShape = (id: string) => {
    if (feedback) return;
    setSelected(id);
  };

  const onPickSlot = (slotId: string) => {
    if (!selected || feedback || matched.has(slotId)) return;
    const correct = selected === slotId;
    setFeedback({ slotId, ok: correct });
    if (correct) {
      const next = new Set(matched).add(slotId);
      setMatched(next);
      if (next.size === shapes.length) {
        // Round complete
        const newScore = score + 1;
        setScore(newScore);
        setTimeout(() => {
          if (roundIdx + 1 >= ROUNDS) {
            onFinish(newScore, ROUNDS);
          } else {
            setRoundIdx((i) => i + 1);
            setSelected(null);
            setMatched(new Set());
            setFeedback(null);
          }
        }, 700);
        return;
      }
    }
    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
    }, 600);
  };

  const selectedShape = shapes.find((s) => s.id === selected);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 8 }}>
        Round {roundIdx + 1} of {ROUNDS} — Score: {score}
      </div>
      <h3 style={{ margin: "4px 0 6px", color: "#fff", fontSize: 15, fontFamily: "Quicksand, sans-serif" }}>
        Pick a shape, then tap its name!
      </h3>

      {selected && (
        <div style={{ marginBottom: 8, fontSize: 13, color: "#c4b5fd", fontWeight: 700 }}>
          Selected: {selectedShape?.emoji} {selectedShape?.label} — now tap the matching name below
        </div>
      )}

      {/* Shape emojis (sources) */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {shapes.map((s) => {
          const done = matched.has(s.id);
          const isSelected = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => !done && onPickShape(s.id)}
              style={{
                width: 58, height: 58, borderRadius: 14, fontSize: 28,
                background: done
                  ? "rgba(34,197,94,0.2)"
                  : isSelected
                  ? "rgba(139,92,246,0.35)"
                  : "rgba(255,255,255,0.08)",
                border: `2px solid ${done ? "rgba(34,197,94,0.6)" : isSelected ? "#a78bfa" : "rgba(139,92,246,0.3)"}`,
                cursor: done ? "default" : "pointer",
                opacity: done ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {done ? "✅" : s.emoji}
            </button>
          );
        })}
      </div>

      {/* Label slots (targets) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 280, margin: "0 auto" }}>
        {slots.map((s) => {
          const done = matched.has(s.id);
          const isFeedback = feedback?.slotId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onPickSlot(s.id)}
              style={{
                padding: "10px 6px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: done
                  ? "rgba(34,197,94,0.2)"
                  : isFeedback && !feedback?.ok
                  ? "rgba(239,68,68,0.2)"
                  : selected
                  ? "rgba(139,92,246,0.15)"
                  : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${done ? "rgba(34,197,94,0.6)" : isFeedback && !feedback?.ok ? "rgba(239,68,68,0.5)" : "rgba(139,92,246,0.3)"}`,
                cursor: done ? "default" : "pointer",
                color: "#e9d5ff",
              }}
            >
              {done ? "✓ " : ""}{s.label}
            </button>
          );
        })}
      </div>

      {feedback && !feedback.ok && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>
          Not quite — try again!
        </div>
      )}
    </div>
  );
}
