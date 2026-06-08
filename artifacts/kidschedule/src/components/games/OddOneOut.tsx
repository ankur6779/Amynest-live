import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS, sessionOddOneOutItems } from "@/lib/game-session-progression";

const GROUPS: {
  items: string[];
  odd: string;
}[][] = [
  [
    { items: ["🍎", "🍌", "🍇", "🚗"], odd: "🚗" },
    { items: ["🐶", "🐱", "🐰", "🍕"], odd: "🍕" },
    { items: ["⚽", "🏀", "🎾", "🥕"], odd: "🥕" },
    { items: ["✏️", "📒", "📐", "🍫"], odd: "🍫" },
    { items: ["☀️", "🌧️", "⛅", "🐠"], odd: "🐠" },
    { items: ["🚂", "🚗", "✈️", "🥦"], odd: "🥦" },
    { items: ["🎹", "🎸", "🥁", "🍩"], odd: "🍩" },
    { items: ["👕", "👖", "👟", "🍒"], odd: "🍒" },
  ],
];

const EXTRA_ODDS = ["🎸", "🎻", "🎺", "🥁", "🎷", "🪕", "🎤", "📻"];

function pickRounds(n: number) {
  const pool = [...GROUPS[0]].sort(() => Math.random() - 0.5);
  return pool.slice(0, n).map((g, roundIdx) => {
    const count = sessionOddOneOutItems(roundIdx, n);
    const base = [...g.items].sort(() => Math.random() - 0.5);
    const items = base.slice(0, Math.min(count, base.length));
    while (items.length < count) {
      const extra = EXTRA_ODDS.find((e) => e !== g.odd && !items.includes(e))
        ?? EXTRA_ODDS[items.length % EXTRA_ODDS.length];
      if (!items.includes(extra)) items.push(extra);
    }
    return { ...g, items: items.sort(() => Math.random() - 0.5) };
  });
}

export function OddOneOutGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const rounds = useMemo(() => pickRounds(GAME_SESSION_ROUNDS), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | undefined>();
  const finishedRef = useRef(false);

  useEffect(() => {
    if (idx >= rounds.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(score, rounds.length);
    }
  }, [idx, score, rounds.length, onFinish]);

  if (idx >= rounds.length) return null;

  const r = rounds[idx];

  const onPick = (item: string) => {
    if (feedback) return;
    if (item === r.odd) {
      setFeedback("correct");
      setFeedbackText("Yes! ✨");
      setScore((s) => s + 1);
      void feedbackCorrect();
    } else {
      setFeedback("wrong");
      setFeedbackText(`The odd one was ${r.odd}`);
      void feedbackWrong();
    }
    setTimeout(() => {
      setFeedback(null);
      setFeedbackText(undefined);
      setIdx((i) => i + 1);
    }, 700);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={rounds.length}
      score={score}
      feedback={feedback}
      feedbackText={feedbackText}
      title="Which one does not belong?"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${r.items.length > 4 ? 3 : 2}, 1fr)`,
          gap: 12,
          maxWidth: r.items.length > 4 ? 300 : 260,
          margin: "0 auto",
        }}
      >
        {r.items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() => onPick(it)}
            style={{
              fontSize: 38,
              padding: "14px 0",
              borderRadius: 14,
              background:
                feedback && it === r.odd ? gameTheme.successBg : "rgba(255,255,255,0.08)",
              border:
                "1px solid " +
                (feedback && it === r.odd ? "rgba(34,197,94,0.6)" : gameTheme.glassBorder),
              cursor: feedback ? "default" : "pointer",
              color: gameTheme.text,
            }}
          >
            {it}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
