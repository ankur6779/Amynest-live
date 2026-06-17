import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BalloonGlowTier } from "./balloon-journey-constants";
import type { BalloonPhysicsSnapshot } from "./use-balloon-physics";

const GLOW_STYLES: Record<
  BalloonGlowTier,
  { shadow: string; aura?: string; trail?: boolean }
> = {
  low: {
    shadow: "0 8px 28px rgba(244,63,94,0.45)",
  },
  mid: {
    shadow: "0 8px 36px rgba(251,113,133,0.65), 0 0 40px rgba(244,63,94,0.35)",
    aura: "rgba(251,113,133,0.25)",
  },
  high: {
    shadow: "0 8px 44px rgba(251,191,36,0.55), 0 0 60px rgba(244,63,94,0.45)",
    aura: "rgba(251,191,36,0.35)",
  },
  space: {
    shadow: "0 8px 48px rgba(167,139,250,0.65), 0 0 80px rgba(56,189,248,0.45)",
    aura: "rgba(167,139,250,0.4)",
    trail: true,
  },
};

export const BalloonJourneyBalloon = memo(function BalloonJourneyBalloon({
  physics,
  glowTier,
  goldenMode,
  holding,
  reduced,
  baseWidth = 72,
  baseHeight = 92,
}: {
  physics: BalloonPhysicsSnapshot;
  glowTier: BalloonGlowTier;
  goldenMode: boolean;
  holding: boolean;
  reduced: boolean;
  baseWidth?: number;
  baseHeight?: number;
}) {
  const glow = GLOW_STYLES[glowTier];
  const w = baseWidth + physics.momentum * 24;
  const h = baseHeight + physics.momentum * 28;

  return (
    <motion.div
      className="relative flex flex-col items-center will-change-transform"
      style={{
        transform: `translate3d(${physics.swayX}px, ${physics.y}px, 0)`,
      }}
    >
      <motion.div
        className="relative"
        style={{
          width: w,
          height: h,
          transform: `rotate(${physics.rotate}deg) scaleX(${physics.scaleX}) scaleY(${physics.scaleY})`,
        }}
      >
        {glow.aura && !reduced && (
          <motion.div
            className="pointer-events-none absolute -inset-6 rounded-full blur-2xl"
            style={{ background: glow.aura }}
            animate={holding ? { opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] } : { opacity: 0.4 }}
            transition={{ duration: 1.6, repeat: Infinity }}
            aria-hidden
          />
        )}

        {glow.trail && !reduced && holding && (
          <motion.div
            className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-1 -translate-x-1/2 rounded-full opacity-70"
            style={{
              background: "linear-gradient(180deg, rgba(167,139,250,0.8), transparent)",
            }}
            animate={{ scaleY: [0.6, 1.2, 0.6], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            aria-hidden
          />
        )}

        {goldenMode && !reduced && (
          <motion.div
            className="pointer-events-none absolute -inset-4 rounded-full opacity-60"
            style={{ background: "conic-gradient(from 0deg, red, orange, yellow, green, blue, violet, red)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            borderRadius: "50% 50% 50% 50% / 58% 58% 42% 42%",
            background: goldenMode
              ? "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.6) 0%, transparent 42%), linear-gradient(155deg, #fde68a 0%, #fbbf24 38%, #f59e0b 72%, #d97706 100%)"
              : "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 18%, transparent 42%), radial-gradient(circle at 70% 75%, rgba(190,24,93,0.35) 0%, transparent 55%), linear-gradient(155deg, #fda4af 0%, #fb7185 38%, #f43f5e 72%, #e11d48 100%)",
            boxShadow: glow.shadow,
          }}
        />

        <div
          className="pointer-events-none absolute left-[18%] top-[14%] rounded-full bg-white/45 blur-[0.5px]"
          style={{ width: w * 0.22, height: h * 0.28 }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[30%] top-[22%] rounded-full bg-white/25"
          style={{ width: w * 0.1, height: h * 0.12 }}
          aria-hidden
        />

        <div
          className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-[38%] rotate-45 rounded-sm bg-rose-700 shadow-sm"
          style={{ borderRadius: "2px 2px 6px 2px" }}
          aria-hidden
        />
      </motion.div>

      <BalloonRope
        width={Math.max(24, w * 0.35)}
        height={52 + physics.momentum * 16}
        angle={physics.ropeAngle}
        curve={physics.ropeCurve}
        holding={holding}
        reduced={reduced}
      />
    </motion.div>
  );
});

function BalloonRope({
  width,
  height,
  angle,
  curve,
  holding,
  reduced,
}: {
  width: number;
  height: number;
  angle: number;
  curve: number;
  holding: boolean;
  reduced: boolean;
}) {
  const cx = 20 + curve;
  const sway = reduced ? 0 : angle * 8;
  const path = `M20 0 C${cx + sway} ${height * 0.25}, ${20 - sway} ${height * 0.55}, ${20 + sway * 0.5} ${height * 0.85} C${22 + curve} ${height * 0.95}, ${18 - curve * 0.5} ${height}, 20 ${height - 2}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 40 ${height}`}
      className={cn("-mt-1 text-rose-200/85 transition-transform duration-75", holding && "text-rose-100")}
      style={{ transform: `rotate(${angle}deg)`, transformOrigin: "top center" }}
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
