import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { useElementSize } from "@/hooks/use-element-size";
import { useA11yPrefs } from "@/hooks/use-a11y-prefs";
import { usePageVisible } from "@/hooks/use-page-visible";
import { feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { fitArenaHeight, GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { scaleDurationMs } from "@/lib/game-a11y";
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
  const { reducedMotion, timeScale } = useA11yPrefs();
  const pageVisible = usePageVisible();
  const waveMs = scaleDurationMs(TARGET_TAP_WAVE_MS, timeScale);
  const [layoutRef, { width: layoutWidth }] = useElementSize();
  const [viewportH, setViewportH] = useState(
    () => (typeof window !== "undefined" ? window.innerHeight : 640),
  );
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

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const arenaHeight = fitArenaHeight({ viewportHeight: viewportH });
  const targetSize = Math.max(
    GAME_LAYOUT.touchComfort,
    Math.min(GAME_LAYOUT.cellMaxComfort + 8, Math.round((layoutWidth || 280) * 0.16)),
  );

  const cleanup = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (spawnRef.current) window.clearInterval(spawnRef.current);
    if (cleanRef.current) window.clearInterval(cleanRef.current);
  };

  useEffect(() => {
    cleanup();
    if (!pageVisible) return;

    overRef.current = false;
    setTargets([]);
    setWaveHits(0);
    setWaveTotal(0);
    setTimeLeft(Math.round(waveMs / 1000));

    const cfg = sessionTargetTapWave(wave, GAME_SESSION_ROUNDS);
    const lifeMs = scaleDurationMs(cfg.lifeMs, timeScale);
    const spawnMs = scaleDurationMs(cfg.spawnMs, timeScale);
    const startTime = Date.now();

    // UI clock 250ms (was 200) — same wave length, fewer React commits.
    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, Math.round((waveMs - elapsed) / 1000));
      setTimeLeft(left);
      if (elapsed >= waveMs && !overRef.current) {
        overRef.current = true;
        cleanup();
        if (wave + 1 >= GAME_SESSION_ROUNDS) {
          onFinish(scoreRef.current, Math.max(totalTargetsRef.current, GAME_SESSION_ROUNDS));
        } else {
          setWave((w) => w + 1);
        }
      }
    }, 250);

    spawnRef.current = window.setInterval(() => {
      if (overRef.current) return;
      const t: Target = {
        id: ++idRef.current,
        // Keep targets inset so they stay fully inside the arena
        x: 12 + Math.random() * 76,
        y: 12 + Math.random() * 76,
        bornAt: Date.now(),
      };
      setTargets((arr) => [...arr, t]);
      totalTargetsRef.current += 1;
      setWaveTotal((n) => n + 1);
    }, spawnMs);

    cleanRef.current = window.setInterval(() => {
      const now = Date.now();
      setTargets((arr) => arr.filter((t) => now - t.bornAt < lifeMs));
    }, 200);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave, waveMs, timeScale, pageVisible]);

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

  const waveProgress =
    ((GAME_SESSION_ROUNDS - wave - 1) / GAME_SESSION_ROUNDS) * 100 +
    ((waveMs / 1000 - timeLeft) / (waveMs / 1000)) * (100 / GAME_SESSION_ROUNDS);

  return (
    <GameShell
      round={wave + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      subtitle={`Wave hits ${waveHits} · targets ${waveTotal}`}
      progress={Math.min(100, waveProgress)}
      progressLabel={`⏱ ${timeLeft}s · wave ${wave + 1}`}
      idleHint="Watch for glowing targets — tap when you see them."
      title="Tap the targets!"
      footer="Each wave gets faster — tap before targets vanish!"
    >
      <div
        ref={layoutRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          height: arenaHeight,
          maxHeight: `min(${GAME_LAYOUT.arenaMaxHeight}px, ${GAME_LAYOUT.arenaHeightVh * 100}dvh)`,
          margin: "0 auto",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${gameTheme.glassBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          touchAction: "manipulation",
          boxSizing: "border-box",
        }}
      >
        <div className="game-sr-only" aria-live="polite">
          {targets.length === 0
            ? "Waiting for targets"
            : `${targets.length} target${targets.length === 1 ? "" : "s"} on screen`}
        </div>
        {targets.map((tg) => {
          const age = Date.now() - tg.bornAt;
          const lifeMs = scaleDurationMs(waveConfig.lifeMs, timeScale);
          const scale = reducedMotion
            ? 1
            : 1 - Math.min(0.45, (age / lifeMs) * 0.45);
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
                width: targetSize,
                height: targetSize,
                minWidth: GAME_LAYOUT.touchComfort,
                minHeight: GAME_LAYOUT.touchComfort,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%, #fff 0, hsl(var(--brand-amber-300)) 30%, hsl(var(--brand-orange-500)) 70%, hsl(var(--brand-orange-600)) 100%)",
                border: "3px solid #fff",
                cursor: "pointer",
                boxShadow: reducedMotion ? "0 0 0 2px rgba(0,0,0,0.35)" : "0 0 14px rgba(251,191,36,0.6)",
                transition: reducedMotion ? "none" : "transform 0.1s",
                padding: 0,
              }}
              aria-label="Tap glowing target"
            >
              <span aria-hidden style={{ fontSize: Math.round(targetSize * 0.45), lineHeight: 1 }}>
                ●
              </span>
            </button>
          );
        })}
        {targets.length === 0 && timeLeft > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gameTheme.textMuted,
              fontSize: "clamp(0.8125rem, 3.2vw, 0.9375rem)",
            }}
          >
            Targets coming…
          </div>
        )}
      </div>
    </GameShell>
  );
}
