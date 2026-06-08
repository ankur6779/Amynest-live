import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS, sessionDotCount } from "@/lib/game-session-progression";

interface Round {
  count: number;
  choices: number[];
}

function buildRound(roundIndex: number): Round {
  const count = sessionDotCount(roundIndex, GAME_SESSION_ROUNDS);
  const spread = Math.max(2, Math.round(count * 0.35));
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * spread * 2 + 1) * (Math.random() > 0.5 ? 1 : -1);
    const w = Math.max(1, Math.min(15, count + delta));
    if (w !== count) wrongs.add(w);
  }
  return { count, choices: [count, ...Array.from(wrongs)].sort(() => Math.random() - 0.5) };
}

export function NumberMatchGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const TOTAL = GAME_SESSION_ROUNDS;
  const rounds = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => buildRound(i)),
    [],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  if (idx >= TOTAL) return null;

  const r = rounds[idx];
  const dots = Array.from({ length: r.count });

  const onPick = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    const ok = n === r.count;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) {
      setScore((s) => s + 1);
      void feedbackCorrect();
    } else {
      void feedbackWrong();
    }
    setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      if (idx + 1 >= TOTAL) onFinish(ok ? score + 1 : score, TOTAL);
      else setIdx((i) => i + 1);
    }, 800);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={TOTAL}
      score={score}
      feedback={feedback}
      title="How many dots do you see?"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${gameTheme.glassBorder}`,
          borderRadius: 16,
          padding: 16,
          minHeight: 110,
          maxWidth: 320,
          margin: "0 auto 18px",
        }}
      >
        {dots.map((_, i) => (
          <span
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
              display: "inline-block",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          maxWidth: 320,
          margin: "0 auto",
        }}
      >
        {r.choices.map((c) => {
          const reveal = picked !== null;
          const isCorrect = c === r.count;
          const isPicked = picked === c;
          const bg =
            reveal && isCorrect
              ? "hsl(var(--brand-green-500))"
              : reveal && isPicked && !isCorrect
                ? "hsl(var(--brand-red-500))"
                : "rgba(255,255,255,0.08)";
          return (
            <button
              key={c}
              type="button"
              disabled={reveal}
              onClick={() => onPick(c)}
              style={{
                background: bg,
                color: gameTheme.text,
                border: `1px solid ${gameTheme.glassBorder}`,
                borderRadius: 12,
                padding: "12px 0",
                fontSize: 18,
                fontWeight: 800,
                fontFamily: gameTheme.fontDisplay,
                cursor: reveal ? "default" : "pointer",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
