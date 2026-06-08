import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong, feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS, sessionShapeCount } from "@/lib/game-session-progression";

interface ShapeDef {
  id: string;
  emoji: string;
  label: string;
}

const ALL_SHAPES: ShapeDef[] = [
  { id: "circle", emoji: "⭕", label: "Circle" },
  { id: "square", emoji: "⬛", label: "Square" },
  { id: "triangle", emoji: "🔺", label: "Triangle" },
  { id: "diamond", emoji: "🔷", label: "Diamond" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "pentagon", emoji: "⬠", label: "Pentagon" },
  { id: "hexagon", emoji: "⬡", label: "Hexagon" },
];

function buildRounds() {
  return Array.from({ length: GAME_SESSION_ROUNDS }, (_, roundIdx) => {
    const count = sessionShapeCount(roundIdx, GAME_SESSION_ROUNDS);
    return [...ALL_SHAPES].sort(() => Math.random() - 0.5).slice(0, count);
  });
}

export function ShapeMatchingGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const rounds = useMemo(() => buildRounds(), []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [slotFeedback, setSlotFeedback] = useState<{ slotId: string; ok: boolean } | null>(null);

  const shapes = rounds[roundIdx];
  const slots = useMemo(() => [...shapes].sort(() => Math.random() - 0.5), [shapes]);

  const onPickShape = (id: string) => {
    if (slotFeedback) return;
    void feedbackTap();
    setSelected(id);
  };

  const onPickSlot = (slotId: string) => {
    if (!selected || slotFeedback || matched.has(slotId)) return;
    const correct = selected === slotId;
    setSlotFeedback({ slotId, ok: correct });
    if (correct) {
      setFeedback("correct");
      void feedbackCorrect();
      const next = new Set(matched).add(slotId);
      setMatched(next);
      if (next.size === shapes.length) {
        const newScore = score + 1;
        setScore(newScore);
        setTimeout(() => {
          if (roundIdx + 1 >= GAME_SESSION_ROUNDS) {
            onFinish(newScore, GAME_SESSION_ROUNDS);
          } else {
            setRoundIdx((i) => i + 1);
            setSelected(null);
            setMatched(new Set());
            setSlotFeedback(null);
            setFeedback(null);
          }
        }, 700);
        return;
      }
    } else {
      setFeedback("wrong");
      void feedbackWrong();
    }
    setTimeout(() => {
      setSelected(null);
      setSlotFeedback(null);
      setFeedback(null);
    }, 600);
  };

  const selectedShape = shapes.find((s) => s.id === selected);

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      feedback={feedback}
      feedbackText={feedback === "wrong" ? "Not quite — try again!" : undefined}
      title="Pick a shape, then tap its name!"
      subtitle={
        selected
          ? `Selected: ${selectedShape?.emoji} ${selectedShape?.label} — tap the matching name`
          : undefined
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {shapes.map((s) => {
          const done = matched.has(s.id);
          const isSelected = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => !done && onPickShape(s.id)}
              style={{
                width: 58,
                height: 58,
                borderRadius: 14,
                fontSize: 28,
                background: done
                  ? gameTheme.successBg
                  : isSelected
                    ? "rgba(139,92,246,0.35)"
                    : "rgba(255,255,255,0.08)",
                border: `2px solid ${
                  done
                    ? "rgba(34,197,94,0.6)"
                    : isSelected
                      ? "hsl(var(--brand-violet-400))"
                      : gameTheme.glassBorder
                }`,
                cursor: done ? "default" : "pointer",
                opacity: done ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? "✅" : s.emoji}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          maxWidth: 280,
          margin: "0 auto",
        }}
      >
        {slots.map((s) => {
          const done = matched.has(s.id);
          const isFeedback = slotFeedback?.slotId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickSlot(s.id)}
              style={{
                padding: "10px 6px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                background: done
                  ? gameTheme.successBg
                  : isFeedback && !slotFeedback?.ok
                    ? gameTheme.errorBg
                    : selected
                      ? "rgba(139,92,246,0.15)"
                      : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${
                  done
                    ? "rgba(34,197,94,0.6)"
                    : isFeedback && !slotFeedback?.ok
                      ? "rgba(239,68,68,0.5)"
                      : gameTheme.glassBorder
                }`,
                cursor: done ? "default" : "pointer",
                color: gameTheme.accentSoft,
              }}
            >
              {done ? "✓" : ""}
              {s.label}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
