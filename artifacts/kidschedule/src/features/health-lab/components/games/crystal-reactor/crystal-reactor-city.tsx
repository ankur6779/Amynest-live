import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CityStage } from "./crystal-reactor-constants";

export const CrystalReactorCity = memo(function CrystalReactorCity({
  stage,
  reduced,
}: {
  stage: CityStage;
  reduced: boolean;
}) {
  const lit = stage !== "dark";
  const glow = stage === "glow" || stage === "towers" || stage === "metropolis";
  const towers = stage === "towers" || stage === "metropolis";
  const metropolis = stage === "metropolis";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={cn(
          "absolute inset-0 transition-[background] duration-[1.2s]",
          lit ? "bg-gradient-to-b from-slate-950/80 via-indigo-950/60 to-violet-950/50" : "bg-gradient-to-b from-black/90 via-slate-950/80 to-black/90",
        )}
      />

      {/* skyline */}
      <div className="absolute inset-x-0 bottom-0 flex h-32 items-end justify-center gap-1 px-2 sm:h-40">
        {[28, 42, 22, 50, 35, 48, 30, 55, 38, 45, 32, 40].map((h, i) => (
          <div
            key={i}
            className={cn(
              "w-[7%] max-w-[28px] rounded-t-sm transition-all duration-700",
              lit ? "bg-gradient-to-t from-cyan-900/80 to-violet-700/60" : "bg-slate-800/70",
            )}
            style={{ height: `${h}%` }}
          >
            {lit && !reduced && (
              <motion.div
                className="mx-auto mt-1 h-1 w-[60%] rounded-full bg-cyan-300/70"
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.5 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.08 }}
              />
            )}
          </div>
        ))}
      </div>

      {glow && !reduced && (
        <div className="absolute inset-x-0 bottom-24 h-20 bg-gradient-to-t from-cyan-500/15 to-transparent" />
      )}

      {towers &&
        !reduced &&
        [...Array(3)].map((_, i) => (
          <motion.div
            key={`tower-${i}`}
            className="absolute bottom-[28%] text-2xl"
            style={{ left: `${20 + i * 30}%` }}
            animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
          >
            🏙️
          </motion.div>
        ))}

      {metropolis &&
        !reduced &&
        [...Array(4)].map((_, i) => (
          <motion.span
            key={`vehicle-${i}`}
            className="absolute text-lg"
            style={{ top: `${18 + i * 8}%`, left: `${5 + i * 22}%` }}
            animate={{ x: [-30, 120, -30] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.6 }}
          >
            🚀
          </motion.span>
        ))}

      {metropolis && !reduced && (
        <motion.div
          className="absolute bottom-[38%] left-1/2 -translate-x-1/2 text-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🗼
        </motion.div>
      )}
    </div>
  );
});
