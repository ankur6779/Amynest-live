import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
const SHAPES = ["🟥", "🟦", "🟩", "🟨", "⬛", "🟪", "🟧"];
function buildPattern(rounds: number): {
  sequence: string[];
  missing: number;
  choices: string[];
}[] {
  const out: {
    sequence: string[];
    missing: number;
    choices: string[];
  }[] = [];
  for (let r = 0; r < rounds; r++) {
    const a = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const b = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    let c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    while (c === a || c === b) c = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    // ABAB? or ABCABC?
    const useABC = Math.random() > 0.5;
    const seq = useABC ? [a, b, c, a, b, c, a, b, c] : [a, b, a, b, a, b, a, b];
    const missing = seq.length - 1;
    const correct = seq[missing];
    seq[missing] = "?";
    const distractors = SHAPES.filter(s => s !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    out.push({
      sequence: seq,
      missing,
      choices
    });
  }
  return out;
}
export function PatternMatchGame({
  onFinish
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const rounds = useMemo(() => buildPattern(5), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  if (idx >= rounds.length) {
    onFinish(score, rounds.length);
    return null;
  }
  const round = rounds[idx];
  const correctValue = (() => {
    const seq = round.sequence;
    const beforeBefore = seq[round.missing - 2];
    return round.choices.find(c => {
      if (seq.length === 8) return c === beforeBefore;
      return c === seq[round.missing - 3];
    })!;
  })();
  const onPick = (choice: string) => {
    if (feedback) return;
    if (choice === correctValue) {
      setFeedback("correct");
      setScore(score + 1);
    } else {
      setFeedback("wrong");
    }
    setTimeout(() => {
      setFeedback(null);
      setIdx(idx + 1);
    }, 700);
  };
  return <div style={{
    textAlign: "center"
  }}>
      <div style={{
      color: "#a99fd9",
      fontSize: 12,
      marginBottom: 8
    }}>{t("components.games.pattern_match.round")} {idx + 1} of {rounds.length}</div>
      <h3 style={{
      margin: "4px 0 16px",
      color: "#fff",
      fontSize: 16,
      fontFamily: "Quicksand, sans-serif"
    }}>{t("components.games.pattern_match.what_comes_next_in_the_pattern")}</h3>
      <div style={{
      display: "flex",
      justifyContent: "center",
      gap: 6,
      marginBottom: 24,
      flexWrap: "wrap"
    }}>
        {round.sequence.map((s, i) => <div key={i} style={{
        width: 38,
        height: 38,
        fontSize: 26,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: s === "?" ? "rgba(139,92,246,0.2)" : "transparent",
        border: s === "?" ? "2px dashed hsl(var(--brand-violet-300))" : "1px solid rgba(139,92,246,0.2)",
        borderRadius: 8,
        color: s === "?" ? "#fff" : undefined
      }}>{s === "?" ? "?" : s}</div>)}
      </div>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 10,
      maxWidth: 240,
      margin: "0 auto"
    }}>
        {round.choices.map(c => <button key={c} onClick={() => onPick(c)} style={{
        fontSize: 30,
        padding: "12px 0",
        borderRadius: 12,
        background: feedback && c === correctValue ? "rgba(34,197,94,0.25)" : feedback === "wrong" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
        border: "1px solid " + (feedback && c === correctValue ? "rgba(34,197,94,0.6)" : "rgba(139,92,246,0.3)"),
        cursor: feedback ? "default" : "pointer",
        color: "#fff"
      }}>{c}</button>)}
      </div>
      {feedback && <div style={{
      marginTop: 16,
      fontSize: 14,
      fontWeight: 700,
      color: feedback === "correct" ? "hsl(var(--brand-green-300))" : "hsl(var(--brand-red-300))"
    }}>
          {feedback === "correct" ? "Correct! ✨" : `Almost — the answer was ${correctValue}`}
        </div>}
    </div>;
}