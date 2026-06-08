import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import {
  GAME_SESSION_ROUNDS,
  sessionTargetTapWave,
  TARGET_TAP_WAVE_MS,
} from "@/lib/game-session-progression";

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
  const [wave, setWave] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [waveHits, setWaveHits] = useState(0);
  const [waveTotal, setWaveTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.round(TARGET_TAP_WAVE_MS / 1000));
  const tickRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const cleanRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const totalTargetsRef = useRef(0);
  const waveConfig = sessionTargetTapWave(wave, GAME_SESSION_ROUNDS);

  const cleanup = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (spawnRef.current) window.clearInterval(spawnRef.current);
    if (cleanRef.current) window.clearInterval(cleanRef.current);
  };

  useEffect(() => {
    cleanup();
    overRef.current = false;
    setTargets([]);
    setWaveHits(0);
    setWaveTotal(0);
    setTimeLeft(Math.round(TARGET_TAP_WAVE_MS / 1000));

    const cfg = sessionTargetTapWave(wave, GAME_SESSION_ROUNDS);
    const startTime = Date.now();

    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, Math.round((TARGET_TAP_WAVE_MS - elapsed) / 1000));
      setTimeLeft(left);
      if (elapsed >= TARGET_TAP_WAVE_MS && !overRef.current) {
        overRef.current = true;
        cleanup();
        if (wave + 1 >= GAME_SESSION_ROUNDS) {
          onFinish(scoreRef.current, Math.max(totalTargetsRef.current, GAME_SESSION_ROUNDS));
        } else {
          setWave((w) => w + 1);
        }
      }
    }, 200);

    spawnRef.current = window.setInterval(() => {
      if (overRef.current) return;
      const t: Target = {
        id: ++idRef.current,
        x: 8 + Math.random() * 80,
        y: 8 + Math.random() * 80,
        bornAt: Date.now(),
      };
      setTargets((arr) => [...arr, t]);
      totalTargetsRef.current += 1;
      setWaveTotal((n) => n + 1);
    }, cfg.spawnMs);

    cleanRef.current = window.setInterval(() => {
      const now = Date.now();
      setTargets((arr) => arr.filter((t) => now - t.bornAt < cfg.lifeMs));
    }, 150);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave]);

  const onTap = (id: number) => {
    setTargets((arr) => {
      if (!arr.some((t) => t.id === id)) return arr;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setWaveHits((h) => h + 1);
      void feedbackTap();
      return arr.filter((t) => t.id !== id);
    });
  };

  const waveProgress = ((GAME_SESSION_ROUNDS - wave - 1) / GAME_SESSION_ROUNDS) * 100
    + ((TARGET_TAP_WAVE_MS / 1000 - timeLeft) / (TARGET_TAP_WAVE_MS / 1000)) * (100 / GAME_SESSION_ROUNDS);

  return (
    <GameShell
      round={wave + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      subtitle={`Wave hits ${waveHits} · targets ${waveTotal}`}
      progress={Math.min(100, waveProgress)}
      progressLabel={`⏱ ${timeLeft}s · wave ${wave + 1}`}
      title="Tap the targets!"
      footer="Each wave gets faster — tap before targets vanish!"
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
          const scale = 1 - Math.min(0.45, (age / waveConfig.lifeMs) * 0.45);
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
