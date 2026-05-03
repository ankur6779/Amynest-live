import { useEffect, useMemo, useRef, useState } from "react";

interface Round { question: string; correct: number; choices: number[] }

function buildRound(): Round {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  let correct = 0;
  if (op === "+") correct = a + b;
  if (op === "-") { if (b > a) [a, b] = [b, a]; correct = a - b; }
  if (op === "×") { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; correct = a * b; }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 7) - 3 || 4;
    const w = correct + delta;
    if (w !== correct && w >= 0) wrongs.add(w);
  }
  const choices = [correct, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
  return { question: `${a} ${op} ${b}`, correct, choices };
}

export function SpeedMathGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const TOTAL = 6;
  const PER_Q_SECONDS = 8;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildRound), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "no" | null>(null);
  const [timeLeft, setTimeLeft] = useState(PER_Q_SECONDS);
  const tickRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    setTimeLeft(PER_Q_SECONDS);
    resolvedRef.current = false;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (resolvedRef.current) return t;
        if (t <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          advance(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const advance = (correctPick: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (tickRef.current) window.clearInterval(tickRef.current);
    setFeedback(correctPick ? "ok" : "no");
    if (correctPick) setScore((s) => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= TOTAL) onFinish(correctPick ? score + 1 : score, TOTAL);
      else setIdx((n) => n + 1);
    }, 700);
  };

  if (idx >= TOTAL) return null;
  const r = rounds[idx];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#a99fd9", fontSize: 12, marginBottom: 10 }}>
        <span>Question {idx + 1} of {TOTAL}</span>
        <span style={{ color: timeLeft <= 3 ? "hsl(var(--brand-red-300))" : "#a99fd9", fontWeight: 700 }}>⏱ {timeLeft}s</span>
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: "8px 0 22px", fontFamily: "Quicksand, sans-serif" }}>
        {r.question} = ?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 280, margin: "0 auto" }}>
        {r.choices.map((c) => {
          const isCorrect = c === r.correct;
          const reveal = feedback !== null;
          const bg = reveal && isCorrect ? "hsl(var(--brand-green-500))"
            : reveal && !isCorrect ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.08)";
          return (
            <button key={c} disabled={feedback !== null} onClick={() => advance(isCorrect)}
              style={{
                background: bg, color: "#fff", border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: 14, padding: "16px 0", fontSize: 22, fontWeight: 800, cursor: feedback ? "default" : "pointer",
                fontFamily: "Quicksand, sans-serif",
              }}
            >{c}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 14, color: "hsl(var(--brand-violet-300))", fontSize: 12, fontWeight: 700 }}>Score: {score}</div>
    </div>
  );
}
