import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  GAME_SESSION_ROUNDS,
  sessionChoiceCount,
  sessionPatternLength,
  sessionProgress,
} from "@/lib/game-session-progression";

const SHAPES = ["🟥", "🟦", "🟩", "🟨", "⬛", "🟪", "🟧"];

function buildPattern(rounds: number): {
  sequence: string[];
  missing: number;
  choices: string[];
  correct: string;
}[] {
  const out: {
    sequence: string[];
    missing: number;
    choices: string[];
    correct: string;
  }[] = [];
  for (let r = 0; r < rounds; r++) {
    const progress = sessionProgress(r, rounds);
    const a = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    let c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    while (c === a || c === b) c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const useABC = progress > 0.25 || Math.random() > 0.45;
    const unit = useABC ? [a, b, c] : [a, b];
    const targetLen = sessionPatternLength(r, rounds);
    const seq: string[] = [];
    while (seq.length < targetLen) seq.push(...unit);
    const trimmed = seq.slice(0, targetLen);
    const missing = trimmed.length - 1;
    const correct = trimmed[missing];
    trimmed[missing] = "?";
    const choiceN = sessionChoiceCount(r, 4, 6, rounds);
    const distractors = SHAPES.filter((s) => s !== correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, choiceN - 1);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    out.push({ sequence: trimmed, missing, choices, correct });
  }
  return out;
}

export function PatternMatchGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const rounds = useMemo(() => buildPattern(GAME_SESSION_ROUNDS), []);
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

  const round = rounds[idx];

  const onPick = (choice: string) => {
    if (feedback) return;
    const ok = choice === round.correct;
    if (ok) {
      setFeedback("correct");
      setFeedbackText("Correct! ✨");
      setScore((s) => s + 1);
      void feedbackCorrect();
    } else {
      setFeedback("wrong");
      setFeedbackText(`Almost — the answer was ${round.correct}`);
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
      title="What comes next in the pattern?"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {round.sequence.map((s, i) => (
          <div
            key={i}
            style={{
              width: 38,
              height: 38,
              fontSize: 26,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: s === "?" ? "rgba(139,92,246,0.2)" : "transparent",
              border:
                s === "?"
                  ? "2px dashed hsl(var(--brand-violet-300))"
                  : `1px solid ${gameTheme.glassBorder}`,
              borderRadius: 8,
              color: s === "?" ? gameTheme.text : undefined,
            }}
          >
            {s === "?" ? "?" : s}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          maxWidth: 240,
          margin: "0 auto",
        }}
      >
        {round.choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            style={{
              fontSize: 30,
              padding: "12px 0",
              borderRadius: 12,
              background:
                feedback && c === round.correct
                  ? gameTheme.successBg
                  : "rgba(255,255,255,0.08)",
              border:
                "1px solid " +
                (feedback && c === round.correct
                  ? "rgba(34,197,94,0.6)"
                  : gameTheme.glassBorder),
              cursor: feedback ? "default" : "pointer",
              color: gameTheme.text,
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
