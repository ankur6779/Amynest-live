import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const COLORS = [{
  id: "red",
  bg: "hsl(var(--brand-red-500))",
  glow: "hsl(var(--brand-red-300))"
}, {
  id: "blue",
  bg: "hsl(var(--brand-blue-500))",
  glow: "hsl(var(--brand-blue-300))"
}, {
  id: "green",
  bg: "hsl(var(--brand-green-500))",
  glow: "hsl(var(--brand-green-300))"
}, {
  id: "yellow",
  bg: "hsl(var(--brand-yellow-500))",
  glow: "hsl(var(--brand-amber-200))"
}];
export function SequenceMemoryGame({
  onFinish
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const targetLen = 6;
  const [sequence, setSequence] = useState<string[]>([]);
  const [showingIdx, setShowingIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"showing" | "input" | "done">("showing");
  const [inputIdx, setInputIdx] = useState(0);
  const [over, setOver] = useState(false);

  // Build initial sequence
  useEffect(() => {
    const seq = Array.from({
      length: targetLen
    }, () => COLORS[Math.floor(Math.random() * 4)].id);
    setSequence(seq);
  }, []);

  // Show sequence one by one
  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0) return;
    let i = 0;
    const tick = () => {
      if (i >= sequence.length) {
        setShowingIdx(null);
        setPhase("input");
        return;
      }
      setShowingIdx(i);
      setTimeout(() => {
        setShowingIdx(null);
        setTimeout(() => {
          i++;
          tick();
        }, 200);
      }, 600);
    };
    const start = setTimeout(tick, 600);
    return () => clearTimeout(start);
  }, [phase, sequence]);
  const tap = (id: string) => {
    if (phase !== "input" || over) return;
    if (id === sequence[inputIdx]) {
      const next = inputIdx + 1;
      if (next >= sequence.length) {
        setPhase("done");
        setTimeout(() => onFinish(sequence.length, sequence.length), 400);
      } else {
        setInputIdx(next);
      }
    } else {
      setOver(true);
      setPhase("done");
      setTimeout(() => onFinish(inputIdx, sequence.length), 600);
    }
  };
  return <div style={{
    textAlign: "center"
  }}>
      <div style={{
      color: "#a99fd9",
      fontSize: 12,
      marginBottom: 8
    }}>
        {phase === "showing" ? "Watch carefully…" : phase === "input" ? `Repeat: ${inputIdx} / ${sequence.length}` : over ? "Game over" : "Done!"}
      </div>
      <h3 style={{
      margin: "4px 0 16px",
      color: "#fff",
      fontSize: 15,
      fontFamily: "Quicksand, sans-serif"
    }}>{t("components.games.sequence_memory.remember_and_repeat_the_colour_sequence")}</h3>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
      maxWidth: 240,
      margin: "0 auto"
    }}>
        {COLORS.map((c, i) => {
        const lit = showingIdx !== null && sequence[showingIdx] === c.id;
        return <button key={c.id} onClick={() => tap(c.id)} disabled={phase !== "input"} style={{
          aspectRatio: "1 / 1",
          borderRadius: 16,
          background: c.bg,
          border: "none",
          cursor: phase === "input" ? "pointer" : "default",
          opacity: lit ? 1 : phase === "input" ? 0.95 : 0.55,
          boxShadow: lit ? `0 0 32px ${c.glow}, 0 0 0 4px ${c.glow}` : "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.15s"
        }} aria-label={c.id}>&nbsp;</button>;
      })}
      </div>
    </div>;
}