/**
 * HeroWeatherAmbient V2 — premium weather micro-animations for the dashboard hero.
 * GPU-only: transform + opacity. No Lottie, canvas, video, or SVG filters.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, type CSSProperties, type ReactNode } from "react";

export interface HeroWeatherAmbientProps {
  weatherCondition?: string;
  weatherCode?: number;
  isDay: boolean;
}

type AmbientKind =
  | "heatwave"
  | "sunny"
  | "rain"
  | "cloudy"
  | "fog"
  | "snow"
  | "night"
  | "neutral";

const LUX_EASE = [0.22, 1, 0.36, 1] as const;
const TRANSITION = { duration: 0.8, ease: LUX_EASE };

const TINTS: Record<AmbientKind, string> = {
  heatwave:
    "linear-gradient(135deg, rgba(120,32,24,0.32) 0%, rgba(88,18,12,0.22) 100%)",
  sunny:
    "linear-gradient(135deg, rgba(88,62,28,0.28) 0%, rgba(48,28,72,0.32) 100%)",
  rain: "linear-gradient(135deg, rgba(28,38,88,0.55) 0%, rgba(18,22,58,0.35) 100%)",
  cloudy:
    "linear-gradient(135deg, rgba(58,52,78,0.38) 0%, rgba(38,32,68,0.28) 100%)",
  fog: "linear-gradient(135deg, rgba(72,72,88,0.34) 0%, rgba(48,42,72,0.26) 100%)",
  snow: "linear-gradient(135deg, rgba(72,82,110,0.34) 0%, rgba(42,38,72,0.28) 100%)",
  night:
    "linear-gradient(135deg, rgba(40,24,72,0.42) 0%, rgba(22,14,48,0.32) 100%)",
  neutral:
    "linear-gradient(135deg, rgba(48,32,88,0.22) 0%, rgba(28,18,58,0.18) 100%)",
};

const GPU: CSSProperties = { willChange: "transform" };

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function resolveAmbientKind(
  condition?: string,
  code?: number,
  isDay = true,
): AmbientKind {
  if (!isDay) return "night";

  const c = (condition ?? "").toLowerCase();
  if (c === "heatwave") return "heatwave";
  if (c === "sunny" || c === "humid") return "sunny";
  if (c === "rainy" || c === "stormy") return "rain";
  if (c === "cloudy" || c === "windy") return "cloudy";
  if (c === "foggy") return "fog";
  if (c === "cold") return "snow";

  if (code != null) {
    if (
      [51, 52, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
        code,
      )
    ) {
      return "rain";
    }
    if (code === 45 || code === 48) return "fog";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
    if (code >= 2 && code <= 3) return "cloudy";
    if (code === 0 || code === 1) return "sunny";
  }

  return "neutral";
}

// ── Parallax depth tiers (max 8px movement) ───────────────────────────────────

type Depth = "background" | "ambient" | "particle";

const DEPTH_DRIFT: Record<Depth, number> = {
  background: 3,
  ambient: 5,
  particle: 8,
};

const DEPTH_DURATION: Record<Depth, number> = {
  background: 28,
  ambient: 22,
  particle: 18,
};

function ParallaxLayer({
  depth,
  reduced,
  children,
}: {
  depth: Depth;
  reduced: boolean;
  children: ReactNode;
}) {
  const drift = DEPTH_DRIFT[depth];
  const duration = DEPTH_DURATION[depth];

  if (reduced) {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={GPU}
      aria-hidden
      animate={{
        x: [-drift * 0.35, drift * 0.35, -drift * 0.35],
        y: [-drift * 0.25, drift * 0.25, -drift * 0.25],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// ── Global aurora — brand colours, all weather states ─────────────────────────

function AmbientAuroraLayer({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        ...GPU,
        background:
          "linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(236,72,153,0.04) 38%, rgba(56,189,248,0.045) 68%, rgba(168,85,247,0.035) 100%)",
      }}
      animate={{
        x: [-10, 8, -10],
        y: [-6, 8, -6],
        opacity: [0.03, 0.06, 0.03],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Heatwave / hot ────────────────────────────────────────────────────────────

function HeatwaveAmbience({ reduced }: { reduced: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${8 + seededRand(i * 23) * 84}%`,
        size: 2 + seededRand(i * 23 + 1) * 2.5,
        dur: 10 + seededRand(i * 23 + 2) * 10,
        delay: seededRand(i * 23 + 3) * 8,
        rise: 50 + seededRand(i * 23 + 4) * 40,
        sway: 6 + seededRand(i * 23 + 5) * 10,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute -top-8 -right-8 h-36 w-36 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,170,90,0.12) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <>
      <ParallaxLayer depth="background" reduced={reduced}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`shimmer-${i}`}
            className="absolute inset-0 pointer-events-none"
            style={{
              ...GPU,
              background: `linear-gradient(${88 + i * 8}deg, transparent 18%, rgba(255,130,70,0.04) 42%, rgba(255,200,110,0.05) 52%, transparent 78%)`,
            }}
            animate={{
              x: [-16, 16, -16],
              y: [0, -4, 0],
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{
              duration: 9 + i * 1.2,
              delay: i * 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </ParallaxLayer>

      <ParallaxLayer depth="ambient" reduced={reduced}>
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            ...GPU,
            top: -28,
            right: -18,
            width: 128,
            height: 128,
            background:
              "radial-gradient(circle, rgba(255,175,90,0.22) 0%, transparent 68%)",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.42, 0.58, 0.42] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="particle" reduced={reduced}>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              ...GPU,
              left: p.left,
              bottom: "6%",
              width: p.size,
              height: p.size,
              background: "rgba(255,210,120,0.75)",
              opacity: 0.08,
            }}
            animate={{
              y: [0, -p.rise],
              x: [0, p.sway, -p.sway * 0.5, 0],
              opacity: [0, 0.08, 0],
            }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </ParallaxLayer>
    </>
  );
}

// ── Sunny ─────────────────────────────────────────────────────────────────────

function SunnyAmbience({ reduced }: { reduced: boolean }) {
  const dust = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: `${8 + seededRand(i * 7) * 84}%`,
        size: 2 + seededRand(i * 7 + 1) * 2,
        opacity: 0.04 + seededRand(i * 7 + 2) * 0.03,
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
        style={{
          background: "radial-gradient(circle, rgba(255,210,140,0.10) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <>
      <ParallaxLayer depth="background" reduced={reduced}>
        <motion.div
          className="absolute -top-12 -right-12 h-56 w-56 rounded-full pointer-events-none"
          style={{
            ...GPU,
            background:
              "radial-gradient(circle, rgba(255,215,150,0.12) 0%, rgba(255,190,100,0.05) 42%, transparent 68%)",
          }}
          animate={{ opacity: [0.07, 0.11, 0.07], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-0 pointer-events-none"
            style={{
              ...GPU,
              right: `${4 + i * 6}%`,
              width: 48 + i * 12,
              height: "72%",
              transformOrigin: "top right",
              background: `linear-gradient(180deg, rgba(255,235,180,${0.05 + i * 0.015}) 0%, transparent 100%)`,
              opacity: 0.05 + i * 0.01,
            }}
            animate={{
              opacity: [0.04, 0.07, 0.04],
              rotate: [-4 + i * 2, 4 - i * 2, -4 + i * 2],
            }}
            transition={{
              duration: 10 + i * 2,
              delay: i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...GPU,
            background:
              "linear-gradient(112deg, transparent 38%, rgba(255,225,170,0.045) 50%, transparent 62%)",
          }}
          animate={{ x: ["-18%", "18%"], opacity: [0, 0.05, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="particle" reduced={reduced}>
        {dust.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              ...GPU,
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
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </ParallaxLayer>
    </>
  );
}

// ── Rain ──────────────────────────────────────────────────────────────────────

function RainAmbience({ reduced }: { reduced: boolean }) {
  const streaks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: `${seededRand(i * 5) * 100}%`,
        height: 24 + seededRand(i * 5 + 1) * 32,
        opacity: 0.05,
        dur: 5 + seededRand(i * 5 + 2) * 3,
        delay: seededRand(i * 5 + 3) * 2.5,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(165deg, rgba(120,160,220,0.06) 0%, transparent 70%)",
        }}
      />
    );
  }

  return (
    <>
      <ParallaxLayer depth="background" reduced={reduced}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...GPU,
            background:
              "linear-gradient(118deg, transparent 32%, rgba(255,255,255,0.05) 50%, transparent 68%)",
          }}
          animate={{ x: ["-10%", "10%"], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="ambient" reduced={reduced}>
        {streaks.map((s) => (
          <motion.div
            key={s.id}
            className="absolute pointer-events-none"
            style={{
              ...GPU,
              left: s.left,
              top: "-8%",
              width: 1.5,
              height: s.height,
              opacity: s.opacity,
              transform: "rotate(16deg)",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(190,210,255,0.7) 100%)",
            }}
            animate={{ y: ["0%", "130%"], opacity: [0, s.opacity, 0] }}
            transition={{
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </ParallaxLayer>

      <ParallaxLayer depth="particle" reduced={reduced}>
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            ...GPU,
            bottom: "14%",
            left: "42%",
            width: 100,
            height: 100,
            background:
              "radial-gradient(circle, rgba(160,190,255,0.1) 0%, transparent 70%)",
          }}
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.05, 0] }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
        />
      </ParallaxLayer>
    </>
  );
}

// ── Cloudy ────────────────────────────────────────────────────────────────────

function CloudyAmbience({ reduced }: { reduced: boolean }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        top: `${10 + i * 24}%`,
        width: 120 + seededRand(i * 11) * 90,
        height: 44 + seededRand(i * 11 + 1) * 28,
        opacity: 0.04 + seededRand(i * 11 + 2) * 0.015,
        delay: i * 4,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 55%)",
        }}
      />
    );
  }

  return (
    <>
      <ParallaxLayer depth="background" reduced={reduced}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...GPU,
            background:
              "linear-gradient(90deg, rgba(200,200,220,0.04) 0%, transparent 45%, rgba(180,180,210,0.035) 100%)",
          }}
          animate={{ x: [-6, 6, -6], opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="ambient" reduced={reduced}>
        {clouds.map((c) => (
          <motion.div
            key={c.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              ...GPU,
              top: c.top,
              width: c.width,
              height: c.height,
              opacity: c.opacity,
              background:
                "radial-gradient(ellipse at center, rgba(210,210,230,0.35) 0%, transparent 72%)",
            }}
            animate={{ x: ["-20%", "120%"], opacity: [0, c.opacity, c.opacity, 0] }}
            transition={{
              duration: 20,
              delay: c.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </ParallaxLayer>
    </>
  );
}

// ── Fog / mist ────────────────────────────────────────────────────────────────

function FogAmbience({ reduced }: { reduced: boolean }) {
  const layers = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        top: `${6 + i * 26}%`,
        width: 140 + seededRand(i * 13) * 100,
        height: 72 + seededRand(i * 13 + 1) * 36,
        delay: i * 5,
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
    <ParallaxLayer depth="ambient" reduced={reduced}>
      {layers.map((l) => (
        <motion.div
          key={l.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            ...GPU,
            top: l.top,
            left: "8%",
            width: l.width,
            height: l.height,
            opacity: 0.05,
            background: "rgba(220,220,235,0.35)",
            filter: "blur(40px)",
          }}
          animate={{ x: [0, 28, -14, 0], opacity: [0.04, 0.05, 0.045, 0.04] }}
          transition={{
            duration: 25,
            delay: l.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </ParallaxLayer>
  );
}

// ── Snow ──────────────────────────────────────────────────────────────────────

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
        style={{
          background: "linear-gradient(135deg, rgba(210,220,255,0.06) 0%, transparent 60%)",
        }}
      />
    );
  }

  return (
    <ParallaxLayer depth="particle" reduced={reduced}>
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            ...GPU,
            left: f.left,
            top: "-4%",
            width: f.size,
            height: f.size,
            background: "rgba(240,248,255,0.85)",
            opacity: f.opacity,
          }}
          animate={{
            y: [0, 220],
            x: [0, f.sway, -f.sway * 0.5, 0],
            opacity: [0, f.opacity, f.opacity * 0.8, 0],
          }}
          transition={{
            duration: f.dur,
            delay: f.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </ParallaxLayer>
  );
}

// ── Night ─────────────────────────────────────────────────────────────────────

function NightAmbience({ reduced }: { reduced: boolean }) {
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
      <ParallaxLayer depth="background" reduced={reduced}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...GPU,
            background:
              "radial-gradient(ellipse at 22% 18%, rgba(88,96,220,0.08) 0%, transparent 58%), radial-gradient(ellipse at 78% 72%, rgba(60,80,180,0.06) 0%, transparent 52%)",
          }}
          animate={{ opacity: [0.05, 0.08, 0.05], x: [0, 8, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="ambient" reduced={reduced}>
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            ...GPU,
            top: "18%",
            left: "62%",
            width: 88,
            height: 88,
            background:
              "radial-gradient(circle, rgba(120,100,220,0.08) 0%, transparent 70%)",
            opacity: 0.04,
          }}
          animate={{
            x: [0, 12, -8, 0],
            y: [0, -6, 4, 0],
            opacity: [0.03, 0.04, 0.035, 0.03],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </ParallaxLayer>

      <ParallaxLayer depth="particle" reduced={reduced}>
        {stars.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{
              ...GPU,
              top: s.top,
              left: s.left,
              width: 1.5,
              height: 1.5,
            }}
            animate={{ opacity: [0.12, 0.4, 0.12], scale: [1, 1.25, 1] }}
            transition={{
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </ParallaxLayer>
    </>
  );
}

function AmbienceLayer({ kind, reduced }: { kind: AmbientKind; reduced: boolean }) {
  switch (kind) {
    case "heatwave":
      return <HeatwaveAmbience reduced={reduced} />;
    case "sunny":
      return <SunnyAmbience reduced={reduced} />;
    case "rain":
      return <RainAmbience reduced={reduced} />;
    case "cloudy":
      return <CloudyAmbience reduced={reduced} />;
    case "fog":
      return <FogAmbience reduced={reduced} />;
    case "snow":
      return <SnowAmbience reduced={reduced} />;
    case "night":
      return <NightAmbience reduced={reduced} />;
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
  const kind = resolveAmbientKind(weatherCondition, weatherCode, isDay);
  const tint = TINTS[kind];

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
      aria-hidden
    >
      <ParallaxLayer depth="background" reduced={reduced}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: tint } as CSSProperties}
          animate={{ opacity: 1 }}
          transition={reduced ? { duration: 0 } : TRANSITION}
        />
      </ParallaxLayer>

      <AmbientAuroraLayer reduced={reduced} />

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
    </div>
  );
}
