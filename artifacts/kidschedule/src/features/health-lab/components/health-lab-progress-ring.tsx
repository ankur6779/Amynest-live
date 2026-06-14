import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

interface Props {
  progress: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  tone?: "rose" | "emerald" | "violet" | "amber" | "cyan";
  children?: React.ReactNode;
}

const TONE_COLORS = {
  rose: { ring: "stroke-rose-400", glow: "rgba(244,114,182,0.5)", bg: "from-rose-500/20 to-orange-500/10" },
  emerald: { ring: "stroke-emerald-400", glow: "rgba(52,211,153,0.5)", bg: "from-emerald-500/20 to-teal-500/10" },
  violet: { ring: "stroke-violet-400", glow: "rgba(167,139,250,0.5)", bg: "from-violet-500/20 to-fuchsia-500/10" },
  amber: { ring: "stroke-amber-400", glow: "rgba(251,191,36,0.5)", bg: "from-amber-500/20 to-orange-500/10" },
  cyan: { ring: "stroke-cyan-400", glow: "rgba(34,211,238,0.5)", bg: "from-cyan-500/20 to-violet-500/10" },
};

export function HealthLabProgressRing({
  progress,
  label,
  size = 120,
  strokeWidth = 8,
  className,
  tone = "rose",
  children,
}: Props) {
  const reduced = useReducedMotion();
  const colors = TONE_COLORS[tone];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ background: colors.glow }}
          aria-hidden
        />
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
          className={colors.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
        />
      </svg>
      <div
        className={cn(
          "absolute flex flex-col items-center justify-center rounded-full",
          `bg-gradient-to-br ${colors.bg}`,
        )}
        style={{ width: size - strokeWidth * 3, height: size - strokeWidth * 3 }}
      >
        {children ?? (
          <>
            <span className="font-mono text-2xl font-bold tabular-nums text-white">
              {Math.round(pct * 100)}%
            </span>
            {label && (
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Balance zone indicator ring */
export function HealthLabBalanceRing({
  zone,
  stability,
  className,
}: {
  zone: "balanced" | "wobbling" | "unstable";
  stability: number;
  className?: string;
}) {
  const tone = zone === "balanced" ? "emerald" : zone === "wobbling" ? "amber" : "rose";
  const zoneLabel = zone === "balanced" ? "Balanced" : zone === "wobbling" ? "Wobbling" : "Unstable";
  const zoneEmoji = zone === "balanced" ? "✅" : zone === "wobbling" ? "⚠️" : "❌";

  return (
    <HealthLabProgressRing
      progress={stability / 100}
      tone={tone}
      size={100}
      className={className}
    >
      <span className="text-lg" aria-hidden>{zoneEmoji}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/80">{zoneLabel}</span>
      <span className="font-mono text-xs tabular-nums text-white/60">{Math.round(stability)}%</span>
    </HealthLabProgressRing>
  );
}
