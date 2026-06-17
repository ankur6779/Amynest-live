import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { StabilityVisualTier } from "./sky-island-constants";

const TIER_STYLES: Record<
  StabilityVisualTier,
  { ring: string; glow: string; bg: string; label: string; pulse?: boolean; shake?: boolean }
> = {
  perfect: {
    ring: "stroke-emerald-400",
    glow: "rgba(52,211,153,0.65)",
    bg: "from-emerald-500/25 to-teal-500/15",
    label: "Perfect!",
    pulse: true,
  },
  slight: {
    ring: "stroke-amber-300",
    glow: "rgba(251,191,36,0.55)",
    bg: "from-amber-500/20 to-orange-500/12",
    label: "Steady",
    pulse: true,
  },
  wobble: {
    ring: "stroke-orange-400",
    glow: "rgba(251,146,60,0.6)",
    bg: "from-orange-500/22 to-amber-500/12",
    label: "Careful",
    pulse: true,
  },
  danger: {
    ring: "stroke-rose-400",
    glow: "rgba(251,113,133,0.65)",
    bg: "from-rose-500/25 to-orange-500/15",
    label: "Hold on!",
    pulse: true,
    shake: true,
  },
};

export const SkyIslandStabilityMeter = memo(function SkyIslandStabilityMeter({
  tier,
  stability,
  className,
}: {
  tier: StabilityVisualTier;
  stability: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const style = TIER_STYLES[tier];
  const size = 108;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, stability / 100));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full blur-xl"
          style={{ background: style.glow }}
          animate={
            style.pulse
              ? { opacity: [0.35, 0.75, 0.35], scale: [1, 1.08, 1] }
              : { opacity: 0.4 }
          }
          transition={{ duration: tier === "danger" ? 0.45 : 1.4, repeat: Infinity }}
          aria-hidden
        />
      )}

      {tier === "perfect" && !reduced && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-sm"
              style={{ top: `${8 + i * 28}%`, left: `${10 + i * 30}%` }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              aria-hidden
            >
              ✨
            </motion.span>
          ))}
        </>
      )}

      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={style.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${style.glow})` }}
        />
      </svg>

      <div
        className={cn(
          "absolute flex flex-col items-center justify-center rounded-full bg-gradient-to-br",
          style.bg,
          style.shake && !reduced && "health-lab-island-meter-shake",
        )}
        style={{ width: size - strokeWidth * 3, height: size - strokeWidth * 3 }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/90">{style.label}</span>
        <span className="font-mono text-xl font-bold tabular-nums text-white">{Math.round(stability)}%</span>
      </div>
    </div>
  );
});
