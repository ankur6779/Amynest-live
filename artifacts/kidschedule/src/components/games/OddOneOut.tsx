import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
const GROUPS: {
  items: string[];
  odd: string;
}[][] = [
// each round: pick one group
[{
  items: ["🍎", "🍌", "🍇", "🚗"],
  odd: "🚗"
}, {
  items: ["🐶", "🐱", "🐰", "🍕"],
  odd: "🍕"
}, {
  items: ["⚽", "🏀", "🎾", "🥕"],
  odd: "🥕"
}, {
  items: ["✏️", "📒", "📐", "🍫"],
  odd: "🍫"
}, {
  items: ["☀️", "🌧️", "⛅", "🐠"],
  odd: "🐠"
}, {
  items: ["🚂", "🚗", "✈️", "🥦"],
  odd: "🥦"
}, {
  items: ["🎹", "🎸", "🥁", "🍩"],
  odd: "🍩"
}, {
  items: ["👕", "👖", "👟", "🍒"],
  odd: "🍒"
}]];
function pickRounds(n: number) {
  const pool = [...GROUPS[0]].sort(() => Math.random() - 0.5);
  return pool.slice(0, n).map(g => ({
    ...g,
    items: [...g.items].sort(() => Math.random() - 0.5)
  }));
}
export function OddOneOutGame({
  onFinish
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const rounds = useMemo(() => pickRounds(5), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  if (idx >= rounds.length) {
    onFinish(score, rounds.length);
    return null;
  }
  const r = rounds[idx];
  const onPick = (item: string) => {
    if (feedback) return;
    if (item === r.odd) {
      setFeedback("correct");
      setScore(score + 1);
    } else setFeedback("wrong");
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
    }}>{t("components.games.odd_one_out.round")} {idx + 1} of {rounds.length}</div>
      <h3 style={{
      margin: "4px 0 20px",
      color: "#fff",
      fontSize: 16,
      fontFamily: "Quicksand, sans-serif"
    }}>{t("components.games.odd_one_out.which_one_does_not_belong")}</h3>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
      maxWidth: 260,
      margin: "0 auto"
    }}>
        {r.items.map(it => <button key={it} onClick={() => onPick(it)} style={{
        fontSize: 38,
        padding: "14px 0",
        borderRadius: 14,
        background: feedback && it === r.odd ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
        border: "1px solid " + (feedback && it === r.odd ? "rgba(34,197,94,0.6)" : "rgba(139,92,246,0.3)"),
        cursor: feedback ? "default" : "pointer",
        color: "#fff"
      }}>{it}</button>)}
      </div>
      {feedback && <div style={{
      marginTop: 16,
      fontSize: 14,
      fontWeight: 700,
      color: feedback === "correct" ? "#86efac" : "#fca5a5"
    }}>
          {feedback === "correct" ? "Yes! ✨" : `The odd one was ${r.odd}`}
        </div>}
    </div>;
}