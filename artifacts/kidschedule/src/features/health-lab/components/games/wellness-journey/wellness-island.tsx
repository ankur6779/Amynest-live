import { memo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { WellnessCategoryKey } from "./wellness-journey-constants";

function IslandFeature({ type, level }: { type: WellnessCategoryKey; level: number }) {
  const reduced = useReducedMotion();
  const intensity = Math.min(1, level / 100);
  if (intensity <= 0) return null;

  const count = Math.max(1, Math.floor(intensity * 3));

  if (type === "balance") {
    return (
      <>
        {[...Array(count)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-lg"
            style={{ left: `${15 + i * 22}%`, bottom: `${25 + (i % 2) * 12}%` }}
            animate={reduced ? {} : { y: [0, -5, 0] }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            aria-hidden
          >
            🏝️
          </motion.span>
        ))}
      </>
    );
  }
  if (type === "focus") {
    return (
      <>
        {[...Array(count)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-base"
            style={{ left: `${20 + i * 18}%`, bottom: `${35 + i * 8}%` }}
            animate={reduced ? {} : { scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
            aria-hidden
          >
            💎
          </motion.span>
        ))}
      </>
    );
  }
  if (type === "coordination") {
    return (
      <motion.span
        className="absolute bottom-[40%] right-[18%] text-xl"
        animate={reduced ? {} : { y: [0, -12, 0], x: [0, 6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        aria-hidden
      >
        🚀
      </motion.span>
    );
  }
  if (type === "calmness") {
    return (
      <>
        {[...Array(count)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-base"
            style={{ left: `${10 + i * 20}%`, bottom: `${18 + i * 6}%` }}
            aria-hidden
          >
            🌲
          </motion.span>
        ))}
      </>
    );
  }
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-sm opacity-70"
          style={{ left: `${25 + i * 15}%`, bottom: `${45 + i * 5}%` }}
          animate={reduced ? {} : { y: [0, -8, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}
          aria-hidden
        >
          💧
        </motion.span>
      ))}
    </>
  );
}

export const WellnessIsland = memo(function WellnessIsland({
  scores,
}: {
  scores: Record<WellnessCategoryKey, number>;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-[1.5rem] border border-white/12 bg-gradient-to-b from-indigo-950/60 via-violet-950/40 to-emerald-950/30 backdrop-blur-md">
      {!reduced && (
        <div className="health-lab-aurora pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      )}

      {(Object.keys(scores) as WellnessCategoryKey[]).map((key) => (
        <IslandFeature key={key} type={key} level={scores[key]} />
      ))}

      <motion.div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center"
        animate={reduced ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <span className="text-3xl drop-shadow-lg" aria-hidden>
          🌍
        </span>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Your Wellness World
        </p>
      </motion.div>
    </div>
  );
});
