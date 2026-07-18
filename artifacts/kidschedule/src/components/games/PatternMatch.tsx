import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  getSoftFailEncouragement,
  getSoftFailHint,
  SOFT_FAIL_MAX_ATTEMPTS,
} from "@/lib/game-experience";
import {
  GAME_SESSION_ROUNDS,
  sessionChoiceCount,
  sessionPatternLength,
  sessionPatternMode,
} from "@/lib/game-session-progression";

const SHAPES = ["🟥", "🟦", "🟩", "🟨", "⬛", "🟪", "🟧"];

function unitForMode(mode: ReturnType<typeof sessionPatternMode>): string[] {
  const a = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  let b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  while (b === a) b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  let c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  while (c === a || c === b) c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  switch (mode) {
    case "ab":
      return [a, b];
    case "aba":
      return [a, b, a];
    case "abb":
      return [a, b, b];
    case "abbc":
      return [a, b, b, c];
    case "dual":
      return [a, b, a, c];
    default:
      return [a, b];
  }
}

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
  const mode = sessionPatternMode();
  for (let r = 0; r < rounds; r++) {
    const unit = unitForMode(mode);
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

  const round = rounds[idx];

  const advance = () => {
    setFeedback(null);
    setFeedbackText(undefined);
    setPickedWrong(null);
    setAttempts(0);
    setIdx((i) => i + 1);
  };

  const onPick = (choice: string) => {
    if (feedback) return;
    const ok = choice === round.correct;
    if (ok) {
      setFeedback("correct");
      setFeedbackText("Correct! ✨");
      setScore((s) => s + 1);
      void feedbackCorrect();
      setTimeout(advance, 700);
      return;
    }

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);
    setPickedWrong(choice);
    setFeedback("wrong");
    void feedbackWrong();
    const hint = getSoftFailHint("pattern", nextAttempt);
    setFeedbackText(
      hint ?? getSoftFailEncouragement(nextAttempt, idx),
    );

    if (nextAttempt >= SOFT_FAIL_MAX_ATTEMPTS) {
      // Exhausted retries — move on without naming/revealing the answer.
      setTimeout(() => {
        setFeedbackText("Nice effort — next pattern!");
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
      title="What comes next in the pattern?"
      idleHint="Say the pattern out loud — then pick what comes next."
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
        role="group"
        aria-label="What comes next"
        className="game-landscape-board"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          maxWidth: 240,
          margin: "0 auto",
        }}
      >
        {round.choices.map((c) => {
          const showCorrect = feedback === "correct" && c === round.correct;
          const showWrongPick = feedback === "wrong" && pickedWrong === c;
          return (
            <button
              key={c}
              type="button"
              className="game-choice-a11y"
              onClick={() => onPick(c)}
              disabled={!!feedback}
              aria-label={`Choice ${c}${showCorrect ? ", correct" : showWrongPick ? ", try again" : ""}`}
              style={{
                fontSize: 30,
                padding: "12px 0",
                minHeight: 52,
                borderRadius: 12,
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
