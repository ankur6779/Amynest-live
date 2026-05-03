import { useMemo, useState } from "react";

interface Round { count: number; choices: number[] }

function buildRound(): Round {
  const count = Math.floor(Math.random() * 9) + 2;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const w = Math.max(1, Math.min(12, count + (Math.floor(Math.random() * 5) - 2 || 1)));
    if (w !== count) wrongs.add(w);
  }
  return { count, choices: [count, ...Array.from(wrongs)].sort(() => Math.random() - 0.5) };
}

export function NumberMatchGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const TOTAL = 6;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildRound), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (idx >= TOTAL) return null;
  const r = rounds[idx];
  const dots = Array.from({ length: r.count });

  const onPick = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    const ok = n === r.count;
    if (ok) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= TOTAL) onFinish(ok ? score + 1 : score, TOTAL);
      else setIdx((i) => i + 1);
    }, 800);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 10 }}>Round {idx + 1} of {TOTAL}</div>
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: 16, padding: 16, minHeight: 110, maxWidth: 320, margin: "0 auto 18px",
      }}>
        {dots.map((_, i) => (
          <span key={i} style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            display: "inline-block",
          }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxWidth: 320, margin: "0 auto" }}>
        {r.choices.map((c) => {
          const reveal = picked !== null;
          const isCorrect = c === r.count;
          const isPicked = picked === c;
          const bg = reveal && isCorrect ? "hsl(var(--brand-green-500))"
            : reveal && isPicked && !isCorrect ? "hsl(var(--brand-red-500))"
            : "rgba(255,255,255,0.08)";
          return (
            <button key={c} disabled={reveal} onClick={() => onPick(c)}
              style={{
                background: bg, color: "#fff", border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: 12, padding: "12px 0", fontSize: 18, fontWeight: 800,
                fontFamily: "Quicksand, sans-serif", cursor: reveal ? "default" : "pointer",
              }}
            >{c}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 14, color: "hsl(var(--brand-violet-300))", fontSize: 12, fontWeight: 700 }}>Score: {score}</div>
    </div>
  );
}
