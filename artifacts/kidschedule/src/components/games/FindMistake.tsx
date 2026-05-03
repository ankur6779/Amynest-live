import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
interface Round {
  tiles: string[];
  mistakeIdx: number;
}
const SETS: {
  base: string;
  mistake: string;
}[] = [{
  base: "A",
  mistake: "B"
}, {
  base: "7",
  mistake: "1"
}, {
  base: "★",
  mistake: "☆"
}, {
  base: "○",
  mistake: "◆"
}, {
  base: "3",
  mistake: "8"
}, {
  base: "b",
  mistake: "d"
}, {
  base: "+",
  mistake: "×"
}, {
  base: "M",
  mistake: "N"
}, {
  base: "9",
  mistake: "6"
}];
function buildRound(): Round {
  const s = SETS[Math.floor(Math.random() * SETS.length)];
  const tiles = Array(9).fill(s.base);
  const idx = Math.floor(Math.random() * 9);
  tiles[idx] = s.mistake;
  return {
    tiles,
    mistakeIdx: idx
  };
}
export function FindMistakeGame({
  onFinish
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const TOTAL = 5;
  const rounds = useMemo(() => Array.from({
    length: TOTAL
  }, buildRound), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (idx >= TOTAL) return null;
  const r = rounds[idx];
  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === r.mistakeIdx;
    if (ok) setScore(s => s + 1);
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= TOTAL) onFinish(ok ? score + 1 : score, TOTAL);else setIdx(n => n + 1);
    }, 900);
  };
  return <div style={{
    textAlign: "center"
  }}>
      <div style={{
      color: "#a99fd9",
      fontSize: 12,
      marginBottom: 6
    }}>{t("components.games.find_mistake.round")} {idx + 1} of {TOTAL}</div>
      <h3 style={{
      margin: "0 0 14px",
      color: "#fff",
      fontSize: 14,
      fontFamily: "Quicksand, sans-serif"
    }}>{t("components.games.find_mistake.tap_the_one_that_s_different")}</h3>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 8,
      maxWidth: 260,
      margin: "0 auto"
    }}>
        {r.tiles.map((c, i) => {
        const reveal = picked !== null;
        const isMistake = i === r.mistakeIdx;
        const isPicked = picked === i;
        const bg = reveal && isMistake ? "#22c55e" : reveal && isPicked && !isMistake ? "#ef4444" : "rgba(255,255,255,0.08)";
        return <button key={i} disabled={reveal} onClick={() => onPick(i)} style={{
          background: bg,
          color: "#fff",
          border: "1px solid rgba(139,92,246,0.35)",
          borderRadius: 12,
          padding: "16px 0",
          fontSize: 26,
          fontWeight: 800,
          fontFamily: "Quicksand, sans-serif",
          cursor: reveal ? "default" : "pointer"
        }}>{c}</button>;
      })}
      </div>
      <div style={{
      marginTop: 14,
      color: "#c4b5fd",
      fontSize: 12,
      fontWeight: 700
    }}>{t("components.games.find_mistake.score")} {score}</div>
    </div>;
}