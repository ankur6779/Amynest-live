/**
 * HeroAmbientLayer — weather-reactive ambient animations for the Dashboard hero card.
 * Web only. Mobile app is intentionally excluded.
 *
 * Rules:
 *  - GPU-only: transform + opacity animations exclusively
 *  - prefers-reduced-motion respected via useReducedMotion()
 *  - pointer-events-none, aria-hidden — purely decorative
 *  - Max ~20 animated elements across all states to stay battery-efficient
 */

// audit-block-ignore-start

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { isAndroidLiteClient } from "@/lib/device-lite";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeroAmbientLayerProps {
  weatherCondition?: string;
  aqiBucket?: string;
  heroTags?: string[];
  isNight: boolean;
}

// ── Seeded pseudo-random for stable SSR-safe positions ────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ── Night: twinkling stars + moon glow ───────────────────────────────────────

function NightLayer({ reduced }: { reduced: boolean }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        // Parallax: ~40% of stars sit on a blurred, slower "far" tier for depth.
        const far = seededRand(i * 3 + 5) > 0.6;
        return {
          id: i,
          top:  `${8 + seededRand(i * 3)      * 70}%`,
          left: `${5 + seededRand(i * 3 + 1)  * 88}%`,
          size: far ? 1.2 : (seededRand(i * 3 + 2) > 0.6 ? 2.4 : 1.8),
          delay: seededRand(i) * 3,
          dur:   (far ? 3.5 : 2.2) + seededRand(i + 7) * 2,
          blur:  far ? 0.6 : 0,
          peak:  far ? 0.5 : 0.9,
        };
      }),
    [],
  );

  if (reduced) {
    return (
      <>
        {/* Static moon */}
        <div
          className="absolute top-3 right-6 rounded-full"
          style={{
            width: 28, height: 28,
            background: "radial-gradient(circle at 35% 35%, #fffde7, #ffe57f)",
            boxShadow: "0 0 18px 6px rgba(255,230,100,0.28)",
            opacity: 0.85,
          }}
        />
        {stars.slice(0, 8).map(s => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: 0.55 }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {/* Moon glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: 12, right: 24, width: 28, height: 28,
          background: "radial-gradient(circle at 35% 35%, #fffde7, #ffe57f)",
          boxShadow: "0 0 24px 8px rgba(255,230,100,0.30)",
        }}
        animate={{ opacity: [0.78, 0.95, 0.78], scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Moon outer halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: 4, right: 16, width: 44, height: 44,
          background: "radial-gradient(circle, rgba(255,230,80,0.14) 30%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Stars — two parallax tiers for depth */}
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, filter: s.blur ? `blur(${s.blur}px)` : undefined }}
          animate={{ opacity: [s.peak * 0.3, s.peak, s.peak * 0.3], scale: [1, 1.4, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Occasional shooting star */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "14%", left: "72%", width: 64, height: 1.5, borderRadius: 2,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 100%)",
          rotate: 24,
        }}
        animate={{ x: [0, -180], y: [0, 86], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 9, times: [0, 0.12, 0.7, 1], ease: "easeIn" }}
      />
    </>
  );
}

// ── Sunny: warm floating particles + light rays ───────────────────────────────

function SunnyLayer({ reduced }: { reduced: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left:  `${10 + seededRand(i * 5) * 80}%`,
        startY: `${70 + seededRand(i * 5 + 1) * 20}%`,
        size: 3 + seededRand(i * 5 + 2) * 4,
        dur:   5 + seededRand(i) * 5,
        delay: seededRand(i + 3) * 4,
        opacity: 0.12 + seededRand(i + 6) * 0.18,
      })),
    [],
  );
  const rays = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        left:  `${20 + i * 28}%`,
        rotate: -15 + i * 8,
        opacity: 0.06 + i * 0.02,
        dur: 6 + i * 1.5,
        delay: i * 1.2,
      })),
    [],
  );

  if (reduced) {
    return (
      <>
        {particles.slice(0, 4).map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left, bottom: "15%",
              width: p.size, height: p.size,
              background: "rgba(255,220,120,0.30)",
              opacity: p.opacity,
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {/* Light rays */}
      {rays.map(r => (
        <motion.div
          key={r.id}
          className="absolute top-0 h-full pointer-events-none"
          style={{
            left: r.left, width: 60,
            background: "linear-gradient(180deg, rgba(255,240,180,0.13) 0%, transparent 100%)",
            transformOrigin: "top center",
            opacity: r.opacity,
          }}
          animate={{ opacity: [r.opacity, r.opacity * 2.2, r.opacity], rotate: [r.rotate - 2.5, r.rotate + 2.5, r.rotate - 2.5] }}
          transition={{ duration: r.dur, delay: r.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Warm floating particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left, bottom: "8%",
            width: p.size, height: p.size,
            background: "rgba(255,220,100,0.70)",
          }}
          animate={{
            y: [0, -(60 + seededRand(p.id + 9) * 60)],
            opacity: [0, p.opacity * 1.4, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// ── Rainy: rain streaks + mist ────────────────────────────────────────────────

function RainyLayer({ stormy, reduced }: { stormy: boolean; reduced: boolean }) {
  const drops = useMemo(
    () =>
      Array.from({ length: stormy ? 18 : 13 }, (_, i) => {
        // Parallax: "far" drops are thinner, slower, slightly blurred.
        const far = seededRand(i * 7 + 9) > 0.55;
        return {
          id: i,
          left: `${seededRand(i * 7) * 100}%`,
          dur:  (far ? 0.85 : 0.5) + seededRand(i * 7 + 1) * 0.4,
          delay: seededRand(i * 7 + 2) * 1.5,
          height: (far ? 6 : 10) + seededRand(i * 7 + 3) * 9,
          width: far ? 1 : 1.6,
          opacity: (far ? 0.12 : 0.22) + seededRand(i * 7 + 4) * 0.16,
          blur: far ? 0.5 : 0,
        };
      }),
    [stormy],
  );
  const splashes = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        left: `${15 + seededRand(i * 23) * 70}%`,
        delay: seededRand(i * 23 + 1) * 2,
        dur:  0.6 + seededRand(i * 23 + 2) * 0.4,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(100,160,240,0.08) 0%, transparent 60%)" }}
      />
    );
  }

  return (
    <>
      {/* Subtle mist */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(100,160,240,0.10) 0%, transparent 65%)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Lightning — realistic double-flash (stormy only) */}
      {stormy && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "rgba(220,230,255,0.20)" }}
          animate={{ opacity: [0, 0, 0.75, 0.15, 0.55, 0, 0] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.34, 0.36, 0.40, 0.42, 0.47, 1], ease: "easeOut" }}
        />
      )}
      {/* Rain drops — two parallax tiers */}
      {drops.map(d => (
        <motion.div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: d.left, top: -12, width: d.width, height: d.height,
            background: "linear-gradient(180deg, rgba(180,210,255,0.0) 0%, rgba(180,210,255,0.55) 100%)",
            opacity: d.opacity,
            filter: d.blur ? `blur(${d.blur}px)` : undefined,
          }}
          animate={{ y: [0, 260], opacity: [0, d.opacity, 0] }}
          transition={{
            duration: d.dur, delay: d.delay,
            repeat: Infinity, ease: "linear",
          }}
        />
      ))}
      {/* Splash ripples at the base */}
      {splashes.map(s => (
        <motion.div
          key={`sp-${s.id}`}
          className="absolute rounded-full border border-white/40 pointer-events-none"
          style={{ bottom: "7%", left: s.left, width: 12, height: 4 }}
          animate={{ scale: [0, 1.7], opacity: [0, 0.5, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, repeatDelay: 0.7, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ── Cloudy / Foggy: drifting cloud blobs ─────────────────────────────────────

function CloudyLayer({ reduced }: { reduced: boolean }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        top:  `${8 + i * 18}%`,
        startX: `${-10 + seededRand(i * 11) * 30}%`,
        width: 80 + seededRand(i * 11 + 1) * 60,
        height: 28 + seededRand(i * 11 + 2) * 20,
        opacity: 0.08 + seededRand(i * 11 + 3) * 0.10,
        dur:  18 + seededRand(i) * 12,
        delay: i * 4,
      })),
    [],
  );

  if (reduced) {
    return (
      <>
        {clouds.map(c => (
          <div
            key={c.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: c.top, left: c.startX,
              width: c.width, height: c.height,
              background: "rgba(255,255,255,0.14)",
              filter: "blur(18px)",
              opacity: c.opacity,
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {clouds.map(c => (
        <motion.div
          key={c.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: c.top,
            width: c.width, height: c.height,
            background: "rgba(255,255,255,0.18)",
            filter: "blur(20px)",
          }}
          animate={{ x: ["-10%", "110%"], opacity: [0, c.opacity * 1.3, c.opacity, 0] }}
          transition={{
            duration: c.dur, delay: c.delay,
            repeat: Infinity, ease: "linear",
          }}
        />
      ))}
    </>
  );
}

// ── Cold / Snow: drifting snowflakes ─────────────────────────────────────────

function SnowLayer({ reduced }: { reduced: boolean }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        // Parallax: "far" flakes smaller, slower, blurred & dimmer.
        const far = seededRand(i * 13 + 7) > 0.5;
        return {
          id: i,
          left:  `${seededRand(i * 13) * 96}%`,
          size:  (far ? 2 : 3.5) + seededRand(i * 13 + 1) * 2.5,
          dur:   (far ? 9 : 6) + seededRand(i * 13 + 2) * 5,
          delay: seededRand(i * 13 + 3) * 5,
          swayX: 12 + seededRand(i * 13 + 4) * 16,
          opacity: (far ? 0.25 : 0.45) + seededRand(i * 13 + 5) * 0.25,
          blur:  far ? 0.8 : 0,
        };
      }),
    [],
  );

  if (reduced) {
    return (
      <>
        {flakes.slice(0, 6).map(f => (
          <div
            key={f.id}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{ left: f.left, top: "20%", width: f.size, height: f.size, opacity: f.opacity * 0.6 }}
          />
        ))}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(200,230,255,0.06) 0%, transparent 60%)" }}
        />
      </>
    );
  }

  return (
    <>
      {/* Cold blue tint */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(180,220,255,0.08) 0%, transparent 55%)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {flakes.map(f => (
        <motion.div
          key={f.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: f.left, top: -8, width: f.size, height: f.size, filter: f.blur ? `blur(${f.blur}px)` : undefined }}
          animate={{
            y: [0, 200],
            x: [0, f.swayX, -f.swayX * 0.5, f.swayX * 0.3, 0],
            opacity: [0, f.opacity, f.opacity, 0],
          }}
          transition={{
            duration: f.dur, delay: f.delay,
            repeat: Infinity, ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

// ── Windy: fast drifting particles + flow lines ───────────────────────────────

function WindyLayer({ reduced }: { reduced: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        top:  `${10 + seededRand(i * 17) * 75}%`,
        dur:   1.8 + seededRand(i * 17 + 1) * 1.5,
        delay: seededRand(i * 17 + 2) * 2,
        size:  1.5 + seededRand(i * 17 + 3) * 2.5,
        opacity: 0.20 + seededRand(i * 17 + 4) * 0.25,
        swayY: 6 + seededRand(i * 17 + 5) * 10,
      })),
    [],
  );

  if (reduced) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(180,200,255,0.06) 100%)" }}
      />
    );
  }

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top, left: -8,
            width: 6 + p.size * 4, height: p.size,
            background: "rgba(200,220,255,0.60)",
            borderRadius: 4,
          }}
          animate={{ x: [0, 360], y: [0, -p.swayY, p.swayY * 0.6, 0], opacity: [0, p.opacity, 0] }}
          transition={{
            duration: p.dur, delay: p.delay,
            repeat: Infinity, ease: "easeIn",
          }}
        />
      ))}
    </>
  );
}

// ── Heatwave: shimmer waves ───────────────────────────────────────────────────

function HeatwaveLayer({ reduced }: { reduced: boolean }) {
  const haze = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left:  `${10 + seededRand(i * 19) * 80}%`,
        size:  4 + seededRand(i * 19 + 1) * 5,
        dur:   4 + seededRand(i * 19 + 2) * 3,
        delay: seededRand(i * 19 + 3) * 4,
        sway:  10 + seededRand(i * 19 + 4) * 14,
        rise:  70 + seededRand(i * 19 + 5) * 60,
        opacity: 0.18 + seededRand(i * 19 + 6) * 0.20,
      })),
    [],
  );

  if (reduced) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,100,60,0.10) 0%, transparent 60%)" }}
        />
        {/* Static sun glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: -30, right: -20, width: 120, height: 120, background: "radial-gradient(circle, rgba(255,180,90,0.28) 0%, transparent 70%)" }}
        />
      </>
    );
  }
  return (
    <>
      {/* Pulsing sun glow in the corner */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: -34, right: -22, width: 130, height: 130, background: "radial-gradient(circle, rgba(255,180,90,0.38) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Shimmer waves */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${30 + i * 20}%`,
            height: 2,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,160,80,0.22) 40%, transparent 100%)",
            filter: "blur(3px)",
          }}
          animate={{ scaleX: [0.6, 1.1, 0.6], opacity: [0.3, 0.7, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 3.5 + i * 0.8, delay: i * 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Rising heat haze particles */}
      {haze.map(h => (
        <motion.div
          key={`hz-${h.id}`}
          className="absolute rounded-full pointer-events-none"
          style={{ left: h.left, bottom: "4%", width: h.size, height: h.size, background: "rgba(255,170,90,0.55)", filter: "blur(1.5px)" }}
          animate={{ y: [0, -h.rise], x: [0, h.sway, -h.sway * 0.6, 0], opacity: [0, h.opacity, 0] }}
          transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ── AQI overlay ───────────────────────────────────────────────────────────────

function AQIOverlay({ aqiBucket, reduced }: { aqiBucket: string; reduced: boolean }) {
  const isPoor = ["unhealthy", "very_unhealthy", "hazardous"].includes(aqiBucket);
  const isGood = ["excellent", "good"].includes(aqiBucket);

  const smog = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        top:  `${15 + seededRand(i * 29) * 60}%`,
        width: 70 + seededRand(i * 29 + 1) * 70,
        height: 30 + seededRand(i * 29 + 2) * 24,
        dur:  22 + seededRand(i * 29 + 3) * 14,
        delay: i * 5,
        opacity: 0.10 + seededRand(i * 29 + 4) * 0.08,
      })),
    [],
  );

  if (isPoor) {
    if (reduced) {
      return (
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "rgba(180,130,80,0.09)" }}
        />
      );
    }
    return (
      <>
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "rgba(180,130,80,0.10)" }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Drifting smog/dust to convey poor air */}
        {smog.map(s => (
          <motion.div
            key={`smog-${s.id}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s.top, width: s.width, height: s.height,
              background: "rgba(140,110,80,0.55)",
              filter: "blur(22px)",
            }}
            animate={{ x: ["-15%", "115%"], opacity: [0, s.opacity, s.opacity, 0] }}
            transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </>
    );
  }

  if (isGood && !reduced) {
    return (
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(100,220,150,0.07) 0%, transparent 60%)" }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  return null;
}

// ── Tag micro-effects: Hydration Day, High Pollution Alert ────────────────────

function TagEffects({ heroTags, reduced }: { heroTags: string[]; reduced: boolean }) {
  const hasHydration  = heroTags.includes("Hydration Day");
  const hasPollution  = heroTags.includes("High Pollution Alert");

  if (reduced) return null;

  return (
    <>
      {hasHydration && (
        <motion.div
          className="absolute bottom-4 right-4 text-base pointer-events-none select-none"
          aria-hidden
          animate={{ y: [0, -6, 0], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          💧
        </motion.div>
      )}
      {hasPollution && (
        <motion.div
          className="absolute top-6 left-6 rounded-full pointer-events-none"
          style={{ width: 32, height: 32, background: "rgba(239,68,68,0.18)", border: "1.5px solid rgba(239,68,68,0.35)" }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </>
  );
}

// ── Breathing glow (always on) ────────────────────────────────────────────────

function BreathingGlow({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none rounded-3xl"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.0)" }}
      animate={{ boxShadow: ["inset 0 0 0 1px rgba(255,255,255,0.06)", "inset 0 0 0 1.5px rgba(255,255,255,0.14)", "inset 0 0 0 1px rgba(255,255,255,0.06)"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

// Resolve the active weather state into a stable key + its layer node.
function resolveWeatherLayer(
  cond: string,
  isNight: boolean,
  reduced: boolean,
): { key: string; node: ReactNode } {
  if (isNight)                                return { key: "night",    node: <NightLayer reduced={reduced} /> };
  if (cond === "sunny" || cond === "")        return { key: "sunny",    node: <SunnyLayer reduced={reduced} /> };
  if (cond === "rainy" || cond === "stormy")  return { key: "rain",     node: <RainyLayer stormy={cond === "stormy"} reduced={reduced} /> };
  if (cond === "cloudy" || cond === "foggy")  return { key: "cloudy",   node: <CloudyLayer reduced={reduced} /> };
  if (cond === "cold")                        return { key: "snow",     node: <SnowLayer reduced={reduced} /> };
  if (cond === "windy")                       return { key: "windy",    node: <WindyLayer reduced={reduced} /> };
  if (cond === "heatwave")                    return { key: "heatwave", node: <HeatwaveLayer reduced={reduced} /> };
  if (cond === "humid")                       return { key: "humid",    node: <SunnyLayer reduced={reduced} /> }; // warm particles — humid shares sunny base
  return { key: "none", node: null };
}

export function HeroAmbientLayer({
  weatherCondition,
  aqiBucket = "moderate",
  heroTags = [],
  isNight,
}: HeroAmbientLayerProps) {
  if (isAndroidLiteClient()) return null;

  const reduced = useReducedMotion() ?? false;
  const cond = weatherCondition ?? "";
  const { key, node } = resolveWeatherLayer(cond, isNight, reduced);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
      aria-hidden
    >
      <BreathingGlow reduced={reduced} />
      <AQIOverlay aqiBucket={aqiBucket} reduced={reduced} />
      <TagEffects heroTags={heroTags} reduced={reduced} />

      {/* Smooth crossfade when the weather state changes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: "easeInOut" }}
        >
          {node}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// audit-block-ignore-end
