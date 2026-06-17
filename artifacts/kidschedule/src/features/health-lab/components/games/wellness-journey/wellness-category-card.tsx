import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { WellnessCategoryKey } from "./wellness-journey-constants";

function CategoryAnimation({ type }: { type: WellnessCategoryKey }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className="text-2xl opacity-80" aria-hidden>✨</span>;
  }

  switch (type) {
    case "balance":
      return (
        <motion.span className="text-2xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden>
          🏝️
        </motion.span>
      );
    case "focus":
      return (
        <motion.span className="text-2xl" animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} aria-hidden>
          💎
        </motion.span>
      );
    case "coordination":
      return (
        <motion.span className="text-2xl" animate={{ y: [0, -10, 0], x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity }} aria-hidden>
          🚀
        </motion.span>
      );
    case "calmness":
      return (
        <motion.span className="text-2xl" animate={{ x: [0, 8, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} aria-hidden>
          🏃
        </motion.span>
      );
    case "breathing":
      return (
        <motion.span className="text-2xl" animate={{ y: [0, -5, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden>
          ☁️
        </motion.span>
      );
    default:
      return null;
  }
}

export const WellnessCategoryCard = memo(function WellnessCategoryCard({
  label,
  emoji,
  value,
  island,
  categoryKey,
  delay = 0,
}: {
  label: string;
  emoji: string;
  value: number;
  island: string;
  categoryKey: WellnessCategoryKey;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const pct = Math.min(100, value);

  return (
    <motion.div
      className={cn(
        "health-lab-timer-glass relative overflow-hidden rounded-2xl border border-white/10 p-4",
        "bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
      )}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 opacity-30" aria-hidden>
        <CategoryAnimation type={categoryKey} />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg" aria-hidden>
            {emoji}
          </p>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-[10px] text-white/45">{island}</p>
        </div>
        <p className="font-mono text-xl font-bold tabular-nums text-cyan-200">{value || "—"}</p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8 }}
        />
      </div>
      <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-white/40">Level progress {pct}%</p>
    </motion.div>
  );
});
