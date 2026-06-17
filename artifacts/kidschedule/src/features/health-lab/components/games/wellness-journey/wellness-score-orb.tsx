import { memo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getWellnessRank } from "./wellness-journey-constants";

export const WellnessScoreOrb = memo(function WellnessScoreOrb({
  score,
  totalXp,
}: {
  score: number;
  totalXp: number;
}) {
  const reduced = useReducedMotion();
  const rank = getWellnessRank(totalXp);

  return (
    <div className="relative flex flex-col items-center">
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute h-36 w-36 rounded-full blur-2xl"
          style={{ background: rank.glow }}
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          aria-hidden
        />
      )}

      <motion.div
        className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/25 bg-gradient-to-br from-violet-600/40 via-indigo-600/35 to-cyan-500/30 shadow-[0_0_40px_rgba(139,92,246,0.45)]"
        animate={reduced ? {} : { scale: [1, 1.04, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        <div className="text-center">
          <span className="text-2xl" aria-hidden>
            {rank.emoji}
          </span>
          <p className="font-mono text-3xl font-bold tabular-nums text-white">{score}</p>
        </div>

        {!reduced && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute text-xs text-cyan-200/80"
                style={{ top: `${10 + i * 25}%`, left: `${85 - i * 5}%` }}
                animate={{ opacity: [0, 1, 0], y: [0, -8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
                aria-hidden
              >
                ✦
              </motion.span>
            ))}
          </>
        )}
      </motion.div>

      <p className="mt-3 text-sm font-bold text-amber-200">{rank.label}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Wellness Rank</p>
    </div>
  );
});
