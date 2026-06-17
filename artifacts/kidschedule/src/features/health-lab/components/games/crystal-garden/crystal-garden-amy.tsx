import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

export const CrystalGardenAmy = memo(function CrystalGardenAmy({
  mode,
  className,
}: {
  mode: "dance" | "freeze" | "celebrate" | "idle";
  className?: string;
}) {
  const reduced = useReducedMotion();

  const danceAnim = !reduced
    ? { y: [0, -8, 0], rotate: [-6, 6, -4, 4, 0], scale: [1, 1.05, 1] }
    : undefined;
  const freezeAnim = !reduced ? { scale: [1, 1.08, 1.02], rotate: [0, -2, 0] } : undefined;
  const celebrateAnim = !reduced
    ? { y: [0, -12, -4, -10, 0], rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }
    : undefined;

  const anim =
    mode === "dance" ? danceAnim : mode === "freeze" ? freezeAnim : mode === "celebrate" ? celebrateAnim : {};

  return (
    <motion.div
      className={cn("relative flex flex-col items-center", className)}
      animate={anim}
      transition={{
        duration: mode === "freeze" ? 0.35 : mode === "celebrate" ? 0.9 : 1.4,
        repeat: mode === "idle" ? 0 : Infinity,
        ease: "easeInOut",
      }}
    >
      {!reduced && (
        <motion.div
          className={cn(
            "pointer-events-none absolute -inset-6 rounded-full blur-2xl",
            mode === "freeze" ? "bg-cyan-400/35" : "bg-violet-500/25",
          )}
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: mode === "freeze" ? 0.5 : 2.5, repeat: Infinity }}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-2 sm:h-32 sm:w-32",
          mode === "freeze"
            ? "border-cyan-300/50 bg-gradient-to-br from-cyan-400/35 via-indigo-500/30 to-violet-600/25 shadow-[0_0_50px_rgba(34,211,238,0.55)]"
            : "border-white/25 bg-gradient-to-br from-pink-400/30 via-violet-500/25 to-cyan-400/20 shadow-[0_16px_48px_-12px_rgba(139,92,246,0.55)]",
        )}
        role="img"
        aria-label="Amy, your crystal garden guide"
      >
        <span className="text-5xl sm:text-6xl" aria-hidden>
          🧑‍🔬
        </span>

        <div className="absolute top-[26%] flex gap-[20%]" aria-hidden>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-900/80"
              animate={mode === "dance" && !reduced ? { scaleY: [1, 0.15, 1] } : {}}
              transition={{ duration: 0.15, repeat: mode === "dance" ? Infinity : 0, repeatDelay: 2.5 }}
            />
          ))}
        </div>

        {mode === "dance" && !reduced && (
          <>
            <motion.span
              className="absolute -left-3 top-1/2 text-xl"
              animate={{ rotate: [0, 25, -15, 0], y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              aria-hidden
            >
              👏
            </motion.span>
            <motion.span
              className="absolute -right-3 top-1/2 text-xl"
              animate={{ rotate: [0, -25, 15, 0], y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
              aria-hidden
            >
              👏
            </motion.span>
          </>
        )}

        {mode === "freeze" && !reduced && (
          <motion.span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl"
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            aria-hidden
          >
            🪄
          </motion.span>
        )}
      </div>

      {mode === "dance" && !reduced && (
        <motion.p
          className="mt-2 text-sm font-bold text-amber-200"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          🎵 Dance!
        </motion.p>
      )}

      {mode === "freeze" && (
        <motion.p
          className="mt-2 text-xl font-black uppercase tracking-[0.2em] text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]"
          animate={!reduced ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.45, repeat: Infinity }}
        >
          FREEZE!
        </motion.p>
      )}
    </motion.div>
  );
});
