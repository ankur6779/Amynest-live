import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
const ICONS = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐵", "🐰"];
export function CardFlipGame({
  onFinish
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const pairs = 6;
  const cards = useMemo(() => {
    const set = ICONS.slice(0, pairs);
    return [...set, ...set].sort(() => Math.random() - 0.5);
  }, []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    if (cards[a] === cards[b]) {
      setMatched(m => [...m, a, b]);
    }
    const t = setTimeout(() => setFlipped([]), 700);
    return () => clearTimeout(t);
  }, [flipped, cards]);
  useEffect(() => {
    if (matched.length === cards.length) {
      // perfect = pairs * 2 == optimal moves, anything within +3 still 'perfect'
      const optimal = pairs;
      const score = Math.max(0, optimal + 3 - moves);
      onFinish(Math.min(pairs, score), pairs);
    }
  }, [matched, cards.length, moves, onFinish]);
  const onClick = (i: number) => {
    if (flipped.length === 2) return;
    if (flipped.includes(i) || matched.includes(i)) return;
    if (flipped.length === 1) setMoves(m => m + 1);
    setFlipped(f => [...f, i]);
  };
  return <div style={{
    textAlign: "center"
  }}>
      <div style={{
      color: "#a99fd9",
      fontSize: 12,
      marginBottom: 8
    }}>
        {t("components.games.card_flip.pairs")} {matched.length / 2} / {pairs} {t("components.games.card_flip.moves")} {moves}
      </div>
      <h3 style={{
      margin: "4px 0 16px",
      color: "#fff",
      fontSize: 15,
      fontFamily: "Quicksand, sans-serif"
    }}>{t("components.games.card_flip.find_all_the_matching_pairs")}</h3>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
      maxWidth: 280,
      margin: "0 auto"
    }}>
        {cards.map((c, i) => {
        const open = flipped.includes(i) || matched.includes(i);
        return <button key={i} onClick={() => onClick(i)} disabled={matched.includes(i)} style={{
          aspectRatio: "1 / 1",
          fontSize: 28,
          borderRadius: 10,
          background: matched.includes(i) ? "rgba(34,197,94,0.2)" : open ? "rgba(139,92,246,0.25)" : "linear-gradient(135deg, hsl(var(--brand-violet-700)), hsl(var(--brand-violet-900)))",
          border: "1px solid " + (matched.includes(i) ? "rgba(34,197,94,0.5)" : "rgba(139,92,246,0.4)"),
          color: "#fff",
          cursor: open ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s"
        }}>{open ? c : "✦"}</button>;
      })}
      </div>
    </div>;
}