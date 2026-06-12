/**
 * HeroWeatherAmbient — premium environmental ambience for the dashboard hero.
 * Sits behind all hero content; GPU-friendly transform + opacity only.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, type CSSProperties } from "react";

export interface HeroWeatherAmbientProps {
  weatherCondition?: string;
  weatherCode?: number;
  isDay: boolean;
}

type AmbientKind = "rain" | "clear" | "cloudy" | "fog" | "snow" | "neutral";

const LUX_EASE = [0.22, 1, 0.36, 1] as const;
const TRANSITION = { duration: 0.8, ease: LUX_EASE };

const TINTS: Record<AmbientKind, string> = {
  rain: "linear-gradient(135deg, rgba(28,38,88,0.55) 0%, rgba(18,22,58,0.35) 100%)",
  clear: "linear-gradient(135deg, rgba(88,62,28,0.28) 0%, rgba(48,28,72,0.32) 100%)",
  cloudy: "linear-gradient(135deg, rgba(58,52,78,0.38) 0%, rgba(38,32,68,0.28) 100%)",
  fog: "linear-gradient(135deg, rgba(72,72,88,0.34) 0%, rgba(48,42,72,0.26) 100%)",
  snow: "linear-gradient(135deg, rgba(72,82,110,0.34) 0%, rgba(42,38,72,0.28) 100%)",
  neutral: "linear-gradient(135deg, rgba(48,32,88,0.22) 0%, rgba(28,18,58,0.18) 100%)",
};

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function resolveAmbientKind(condition?: string, code?: number): AmbientKind {
  const c = (condition ?? "").toLowerCase();
  if (c === "rainy" || c === "stormy") return "rain";
  if (c === "sunny" || c === "heatwave" || c === "humid") return "clear";
  if (c === "cloudy" || c === "windy") return "cloudy";
  if (c === "foggy") return "fog";
  if (c === "cold") return "snow";

  if (code != null) {
    if ([51, 52, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
      return "rain";
    }
    if (code === 45 || code === 48) return "fog";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 85 && code <= 86) return "snow";
    if (code >= 2 && code <= 3) return "cloudy";
    if (code === 0 || code === 1) return "clear";
  }

  return "neutral";
}

function RainAmbience({ reduced }: { reduced: boolean }) {
  const streaks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${seededRand(i * 5) * 100}%`,
        height: 28 + seededRand(i * 5 + 1) * 36,
        opacity: 0.05 + seededRand(i * 5 + 2) * 0.03,
        dur: 2.4 + seededRand(i * 5 + 3) * 1.6,
        delay: seededRand(i * 5 + 4) * 2,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(165deg, rgba(120,160,220,0.06) 0%, transparent 70%)" }}
      />
    );
  }

  return (
    <>
      {streaks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute pointer-events-none"
          style={{
            left: s.left,
            top: "-8%",
            width: 1.5,
            height: s.height,
            opacity: s.opacity,
            transform: "rotate(18deg)",
            background: "linear-gradient(180deg, transparent 0%, rgba(190,210,255,0.75) 100%)",
            filter: "blur(1px)",
          }}
          animate={{ y: ["0%", "130%"], opacity: [0, s.opacity, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.05) 50%, transparent 65%)",
        }}
        animate={{ x: ["-8%", "8%"], opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: "12%",
          left: "38%",
          width: 120,
          height: 120,
          background: "radial-gradient(circle, rgba(160,190,255,0.12) 0%, transparent 70%)",
        }}
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0, 0.06, 0] }}
        transition={{ duration: 11, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
      />
    </>
  );
}

function ClearAmbience({ reduced }: { reduced: boolean }) {
  const dust = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: `${8 + seededRand(i * 7) * 84}%`,
        size: 2 + seededRand(i * 7 + 1) * 2,
        opacity: 0.04 + seededRand(i * 7 + 2) * 0.04,
        dur: 14 + seededRand(i * 7 + 3) * 10,
        delay: seededRand(i * 7 + 4) * 6,
        drift: 8 + seededRand(i * 7 + 5) * 14,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute -top-8 -right-8 h-40 w-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,210,140,0.10) 0%, transparent 70%)" }}
      />
    );
  }

  return (
    <>
      <motion.div
        className="absolute -top-10 -right-10 h-52 w-52 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,210,150,0.10) 0%, transparent 68%)",
        }}
        animate={{ opacity: [0.08, 0.12, 0.08], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {dust.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            bottom: "10%",
            width: p.size,
            height: p.size,
            background: "rgba(255,230,180,0.55)",
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -p.drift, 0],
            x: [0, p.drift * 0.35, 0],
            opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4],
          }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function CloudyAmbience({ reduced }: { reduced: boolean }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        top: `${12 + i * 22}%`,
        width: 120 + seededRand(i * 11) * 80,
        height: 48 + seededRand(i * 11 + 1) * 24,
        opacity: 0.04 + seededRand(i * 11 + 2) * 0.02,
        delay: i * 3,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 55%)" }}
      />
    );
  }

  return (
    <>
      {clouds.map((c) => (
        <motion.div
          key={c.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: c.top,
            width: c.width,
            height: c.height,
            opacity: c.opacity,
            background:
              "radial-gradient(ellipse at center, rgba(210,210,230,0.35) 0%, transparent 72%)",
          }}
          animate={{ x: ["-18%", "118%"], opacity: [0, c.opacity, c.opacity, 0] }}
          transition={{ duration: 20, delay: c.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

function FogAmbience({ reduced }: { reduced: boolean }) {
  const layers = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        top: `${8 + i * 24}%`,
        width: 140 + seededRand(i * 13) * 100,
        height: 80 + seededRand(i * 13 + 1) * 40,
        delay: i * 4,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(210,210,230,0.05)" }}
      />
    );
  }

  return (
    <>
      {layers.map((l) => (
        <motion.div
          key={l.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: l.top,
            left: "10%",
            width: l.width,
            height: l.height,
            opacity: 0.05,
            background: "rgba(220,220,235,0.35)",
            filter: "blur(40px)",
          }}
          animate={{ x: [0, 24, -12, 0], opacity: [0.03, 0.05, 0.04, 0.03] }}
          transition={{ duration: 24, delay: l.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function SnowAmbience({ reduced }: { reduced: boolean }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${seededRand(i * 17) * 96}%`,
        size: 1.5 + seededRand(i * 17 + 1) * 1.5,
        opacity: 0.08 + seededRand(i * 17 + 2) * 0.07,
        dur: 10 + seededRand(i * 17 + 3) * 8,
        delay: seededRand(i * 17 + 4) * 5,
        sway: 6 + seededRand(i * 17 + 5) * 10,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(210,220,255,0.06) 0%, transparent 60%)" }}
      />
    );
  }

  return (
    <>
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: f.left,
            top: "-4%",
            width: f.size,
            height: f.size,
            background: "rgba(240,248,255,0.85)",
            boxShadow: "0 0 6px rgba(220,235,255,0.35)",
            opacity: f.opacity,
          }}
          animate={{
            y: [0, 220],
            x: [0, f.sway, -f.sway * 0.5, 0],
            opacity: [0, f.opacity, f.opacity * 0.8, 0],
          }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

function NightEnhancement({ reduced }: { reduced: boolean }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        top: `${10 + seededRand(i * 19) * 62}%`,
        left: `${8 + seededRand(i * 19 + 1) * 84}%`,
        delay: seededRand(i * 19 + 2) * 3,
        dur: 2.5 + seededRand(i * 19 + 3) * 2,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(90,110,220,0.06) 0%, transparent 55%)",
        }}
      />
    );
  }

  return (
    <>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 25% 15%, rgba(88,96,220,0.08) 0%, transparent 58%), radial-gradient(ellipse at 80% 70%, rgba(60,80,180,0.06) 0%, transparent 52%)",
        }}
        animate={{ opacity: [0.05, 0.08, 0.05], x: [0, 12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ top: s.top, left: s.left, width: 1.5, height: 1.5 }}
          animate={{ opacity: [0.15, 0.45, 0.15], scale: [1, 1.25, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function AmbienceLayer({ kind, reduced }: { kind: AmbientKind; reduced: boolean }) {
  switch (kind) {
    case "rain":
      return <RainAmbience reduced={reduced} />;
    case "clear":
      return <ClearAmbience reduced={reduced} />;
    case "cloudy":
      return <CloudyAmbience reduced={reduced} />;
    case "fog":
      return <FogAmbience reduced={reduced} />;
    case "snow":
      return <SnowAmbience reduced={reduced} />;
    default:
      return null;
  }
}

export function HeroWeatherAmbient({
  weatherCondition,
  weatherCode,
  isDay,
}: HeroWeatherAmbientProps) {
  const reduced = useReducedMotion() ?? false;
  const kind = resolveAmbientKind(weatherCondition, weatherCode);
  const tint = TINTS[kind];

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tint } as CSSProperties}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : TRANSITION}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={kind}
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : TRANSITION}
        >
          <AmbienceLayer kind={kind} reduced={reduced} />
        </motion.div>
      </AnimatePresence>

      {!isDay ? <NightEnhancement reduced={reduced} /> : null}
    </div>
  );
}
