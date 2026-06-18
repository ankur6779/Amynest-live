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
    ? { y: [0, -14, 0, -10, 0], rotate: [-10, 10, -8, 8, 0], scale: [1, 1.1, 1, 1.08, 1] }
    : undefined;
  const freezeAnim = !reduced ? { scale: [1, 1.08, 1.02], rotate: [0, -2, 0] } : undefined;
  const celebrateAnim = !reduced
    ? { y: [0, -14, -4, -12, 0], rotate: [0, 10, -10, 0], scale: [1, 1.12, 1] }
    : undefined;

  const anim =
    mode === "dance" ? danceAnim : mode === "freeze" ? freezeAnim : mode === "celebrate" ? celebrateAnim : {};

  return (
    <motion.div
      className={cn("relative flex flex-col items-center", className)}
      animate={anim}
      transition={{
        duration: mode === "freeze" ? 0.35 : mode === "celebrate" ? 0.9 : 0.75,
        repeat: mode === "idle" ? 0 : Infinity,
        ease: "easeInOut",
      }}
    >
      {!reduced && (
        <motion.div
          className={cn(
            "pointer-events-none absolute -inset-8 rounded-full blur-2xl",
            mode === "freeze"
              ? "bg-cyan-400/35"
              : mode === "dance"
                ? "bg-gradient-to-r from-pink-400/35 via-violet-500/30 to-cyan-400/30"
                : "bg-violet-500/25",
          )}
          animate={{ opacity: [0.35, 0.85, 0.35], scale: [1, 1.15, 1] }}
          transition={{ duration: mode === "freeze" ? 0.5 : mode === "dance" ? 0.7 : 2.5, repeat: Infinity }}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-2 sm:h-32 sm:w-32",
          mode === "freeze"
            ? "border-cyan-300/50 bg-gradient-to-br from-cyan-400/35 via-indigo-500/30 to-violet-600/25 shadow-[0_0_50px_rgba(34,211,238,0.55)]"
            : mode === "dance"
              ? "border-pink-300/45 bg-gradient-to-br from-pink-400/40 via-violet-500/35 to-cyan-400/30 shadow-[0_0_55px_-8px_rgba(236,72,153,0.65)] health-lab-pulse-go"
              : "border-white/25 bg-gradient-to-br from-pink-400/30 via-violet-500/25 to-cyan-400/20 shadow-[0_16px_48px_-12px_rgba(139,92,246,0.55)]",
        )}
        role="img"
        aria-label="Amy, your crystal garden guide"
      >
        <motion.span
          className="text-5xl sm:text-6xl"
          animate={mode === "dance" && !reduced ? { rotate: [-5, 5, -3, 3, 0] } : {}}
          transition={{ duration: 0.5, repeat: mode === "dance" ? Infinity : 0 }}
          aria-hidden
        >
          🧑‍🔬
        </motion.span>

        <div className="absolute top-[26%] flex gap-[20%]" aria-hidden>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-900/80"
              animate={mode === "dance" && !reduced ? { scaleY: [1, 0.1, 1] } : {}}
              transition={{ duration: 0.12, repeat: mode === "dance" ? Infinity : 0, repeatDelay: 0.35 }}
            />
          ))}
        </div>

        {mode === "dance" && !reduced && (
          <>
            <motion.span
              className="absolute -left-4 top-1/2 text-2xl"
              animate={{ rotate: [0, 30, -20, 0], y: [0, -6, 0], x: [0, -4, 0] }}
              transition={{ duration: 0.45, repeat: Infinity }}
              aria-hidden
            >
              👏
            </motion.span>
            <motion.span
              className="absolute -right-4 top-1/2 text-2xl"
              animate={{ rotate: [0, -30, 20, 0], y: [0, -6, 0], x: [0, 4, 0] }}
              transition={{ duration: 0.45, repeat: Infinity, delay: 0.12 }}
              aria-hidden
            >
              👏
            </motion.span>
            {["🎵", "🎶"].map((note, i) => (
              <motion.span
                key={note}
                className="absolute text-sm"
                style={{ top: i === 0 ? "-8%" : "auto", bottom: i === 1 ? "-6%" : "auto", left: i === 0 ? "10%" : "auto", right: i === 1 ? "10%" : "auto" }}
                animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5], rotate: [0, 12, -12, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }}
                aria-hidden
              >
                {note}
              </motion.span>
            ))}
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
        <motion.div
          className="mt-2 flex items-center gap-2"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <motion.span
            className="text-lg"
            animate={{ rotate: [0, -15, 15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            aria-hidden
          >
            🎵
          </motion.span>
          <motion.p
            className="text-base font-black tracking-wide text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] sm:text-lg"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            Dance!
          </motion.p>
          <motion.span
            className="text-lg"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
            aria-hidden
          >
            💃
          </motion.span>
        </motion.div>
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
