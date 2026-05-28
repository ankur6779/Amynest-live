import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";

const DURATION_MS = 30_000;
const SPAWN_MS = 850;
const LIFE_MS = 1400;

interface Target {
  id: number;
  x: number;
  y: number;
  bornAt: number;
}

export function TargetTapGame({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.round(DURATION_MS / 1000));
  const tickRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const cleanRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const totalRef = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, Math.round((DURATION_MS - elapsed) / 1000));
      setTimeLeft(left);
      if (elapsed >= DURATION_MS && !overRef.current) {
        overRef.current = true;
        cleanup();
        onFinish(scoreRef.current, Math.max(totalRef.current, 1));
      }
    }, 250);
    spawnRef.current = window.setInterval(() => {
      if (overRef.current) return;
      const t: Target = {
        id: ++idRef.current,
        x: 8 + Math.random() * 80,
        y: 8 + Math.random() * 80,
        bornAt: Date.now(),
      };
      setTargets((arr) => [...arr, t]);
      totalRef.current += 1;
      setTotal(totalRef.current);
    }, SPAWN_MS);
    cleanRef.current = window.setInterval(() => {
      const now = Date.now();
      setTargets((arr) => arr.filter((t) => now - t.bornAt < LIFE_MS));
    }, 200);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (spawnRef.current) window.clearInterval(spawnRef.current);
    if (cleanRef.current) window.clearInterval(cleanRef.current);
  }

  const onTap = (id: number) => {
    setTargets((arr) => {
      if (!arr.some((t) => t.id === id)) return arr;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      void feedbackTap();
      return arr.filter((t) => t.id !== id);
    });
  };

  const totalSeconds = DURATION_MS / 1000;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <GameShell
      subtitle={`Hit ${score} / ${total}`}
      score={score}
      progress={progress}
      progressLabel={`⏱ ${timeLeft}s remaining`}
      title="Tap the targets!"
      footer="Tap each target before it disappears — 30 seconds total."
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          height: 320,
          margin: "0 auto",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${gameTheme.glassBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          touchAction: "manipulation",
        }}
      >
        {targets.map((tg) => {
          const age = Date.now() - tg.bornAt;
          const scale = 1 - Math.min(0.4, (age / LIFE_MS) * 0.4);
          return (
            <button
              key={tg.id}
              type="button"
              onClick={() => onTap(tg.id)}
              style={{
                position: "absolute",
                left: `${tg.x}%`,
                top: `${tg.y}%`,
                transform: `translate(-50%,-50%) scale(${scale})`,
                width: 52,
                height: 52,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%, #fff 0, hsl(var(--brand-amber-300)) 30%, hsl(var(--brand-orange-500)) 70%, hsl(var(--brand-orange-600)) 100%)",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(251,191,36,0.6)",
                transition: "transform 0.1s",
              }}
              aria-label="Tap target"
            />
          );
        })}
        {targets.length === 0 && timeLeft > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gameTheme.textMuted,
              fontSize: 12,
            }}
          >
            Targets coming…
          </div>
        )}
      </div>
    </GameShell>
  );
}
