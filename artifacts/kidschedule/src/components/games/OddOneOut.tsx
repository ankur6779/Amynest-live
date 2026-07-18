import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  getSoftFailEncouragement,
  getSoftFailHint,
  SOFT_FAIL_MAX_ATTEMPTS,
} from "@/lib/game-experience";
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
      const extra =
        EXTRA_ODDS.find((e) => e !== g.odd && !items.includes(e)) ??
        EXTRA_ODDS[items.length % EXTRA_ODDS.length];
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
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | undefined>();
  const [pickedWrong, setPickedWrong] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (idx >= rounds.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(score, rounds.length);
    }
  }, [idx, score, rounds.length, onFinish]);

  if (idx >= rounds.length) return null;

  const r = rounds[idx];

  const advance = () => {
    setFeedback(null);
    setFeedbackText(undefined);
    setPickedWrong(null);
    setAttempts(0);
    setIdx((i) => i + 1);
  };

  const onPick = (item: string) => {
    if (feedback) return;
    if (item === r.odd) {
      setFeedback("correct");
      setFeedbackText("Yes! ✨");
      setScore((s) => s + 1);
      void feedbackCorrect();
      setTimeout(advance, 700);
      return;
    }

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setPickedWrong(item);
    setFeedback("wrong");
    void feedbackWrong();
    const hint = getSoftFailHint("odd-one", nextAttempt);
    setFeedbackText(hint ?? getSoftFailEncouragement(nextAttempt, idx));

    if (nextAttempt >= SOFT_FAIL_MAX_ATTEMPTS) {
      setTimeout(() => {
        setFeedbackText("Nice looking — next one!");
        setTimeout(advance, 650);
      }, 700);
      return;
    }

    setTimeout(() => {
      setFeedback(null);
      setFeedbackText(undefined);
      setPickedWrong(null);
    }, 900);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={rounds.length}
      score={score}
      feedback={feedback}
      feedbackText={feedbackText}
      title="Which one does not belong?"
      idleHint="Which item feels different from the rest?"
    >
      <div
        role="group"
        aria-label="Pick the odd one out"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${r.items.length > 4 ? 3 : 2}, 1fr)`,
          gap: 12,
          maxWidth: r.items.length > 4 ? 300 : 260,
          margin: "0 auto",
        }}
      >
        {r.items.map((it, i) => {
          const showCorrect = feedback === "correct" && it === r.odd;
          const showWrongPick = feedback === "wrong" && pickedWrong === it;
          return (
            <button
              key={`${it}-${i}`}
              type="button"
              className="game-choice-a11y"
              onClick={() => onPick(it)}
              disabled={!!feedback}
              aria-label={`Choice ${i + 1}${showCorrect ? ", correct" : showWrongPick ? ", try again" : ""}`}
              style={{
                fontSize: 38,
                padding: "14px 0",
                minHeight: 56,
                borderRadius: 14,
                background: showCorrect
                  ? gameTheme.successBg
                  : showWrongPick
                    ? "rgba(251,113,133,0.15)"
                    : "rgba(255,255,255,0.08)",
                border: showCorrect
                  ? "3px solid rgba(34,197,94,0.85)"
                  : showWrongPick
                    ? "2px solid rgba(251,113,133,0.55)"
                    : `1px solid ${gameTheme.glassBorder}`,
                cursor: feedback ? "default" : "pointer",
                color: gameTheme.text,
                position: "relative",
              }}
            >
              {it}
              {showCorrect && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 6,
                    fontSize: 14,
                    fontWeight: 900,
                    color: gameTheme.success,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
