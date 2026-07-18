import { useMemo, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  getSoftFailEncouragement,
  getSoftFailHint,
  SOFT_FAIL_MAX_ATTEMPTS,
} from "@/lib/game-experience";
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
  const [attempts, setAttempts] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | undefined>();

  if (idx >= TOTAL) return null;

  const r = rounds[idx];
  const dots = Array.from({ length: r.count });

  const goNext = (nextScore: number) => {
    setPicked(null);
    setFeedback(null);
    setFeedbackText(undefined);
    setAttempts(0);
    if (idx + 1 >= TOTAL) onFinish(nextScore, TOTAL);
    else setIdx((i) => i + 1);
  };

  const onPick = (n: number) => {
    if (feedback) return;
    const ok = n === r.count;
    if (ok) {
      setPicked(n);
      setFeedback("correct");
      setFeedbackText("Nice counting!");
      const nextScore = score + 1;
      setScore(nextScore);
      void feedbackCorrect();
      setTimeout(() => goNext(nextScore), 700);
      return;
    }

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setPicked(n);
    setFeedback("wrong");
    void feedbackWrong();
    const hint = getSoftFailHint("number", nextAttempt);
    setFeedbackText(hint ?? getSoftFailEncouragement(nextAttempt, idx));

    if (nextAttempt >= SOFT_FAIL_MAX_ATTEMPTS) {
      setTimeout(() => goNext(score), 900);
      return;
    }

    setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      setFeedbackText(undefined);
    }, 900);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={TOTAL}
      score={score}
      feedback={feedback}
      feedbackText={feedbackText}
      title="How many dots do you see?"
      idleHint="Count carefully — touch each dot in your mind."
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
        <div className="game-sr-only">{r.count} dots</div>
        {dots.map((_, i) => (
          <span
            key={i}
            aria-hidden
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
        role="group"
        aria-label="How many dots"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          maxWidth: 320,
          margin: "0 auto",
        }}
      >
        {r.choices.map((c) => {
          const isCorrect = c === r.count;
          const isPicked = picked === c;
          const showCorrect = feedback === "correct" && isCorrect;
          const showWrongPick = feedback === "wrong" && isPicked && !isCorrect;
          const bg = showCorrect
            ? "hsl(var(--brand-green-500))"
            : showWrongPick
              ? "hsl(var(--brand-amber-500))"
              : "rgba(255,255,255,0.08)";
          return (
            <button
              key={c}
              type="button"
              className="game-choice-a11y"
              disabled={!!feedback}
              onClick={() => onPick(c)}
              aria-label={`${c}${showCorrect ? ", correct" : showWrongPick ? ", try again" : ""}`}
              style={{
                background: bg,
                color: gameTheme.text,
                border: showCorrect
                  ? "3px solid #fff"
                  : showWrongPick
                    ? "2px dashed rgba(251,191,36,0.9)"
                    : `1px solid ${gameTheme.glassBorder}`,
                borderRadius: 12,
                padding: "12px 0",
                minHeight: 48,
                fontSize: 18,
                fontWeight: 800,
                fontFamily: gameTheme.fontDisplay,
                cursor: feedback ? "default" : "pointer",
              }}
            >
              {showCorrect ? `✓ ${c}` : c}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
