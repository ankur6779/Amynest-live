import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { AliveNumber } from "./AliveNumber";
import { AmyIcon } from "@/components/amy-icon";
import { MATH_WORLDS, type MathWorldTheme } from "./world-themes";

type CinematicEntryProps = {
  theme?: MathWorldTheme;
  /** Optional equation preview from today's first trick example */
  equationHint?: string;
  onComplete: () => void;
  /** Skip entirely when reduced motion */
  forceSkip?: boolean;
};

/**
 * ~2s silent cinematic entrance — no splash, no audio, no loading feel.
 * Living world → light → particles → numbers → blocks → equation → Amy wave → done.
 */
export function CinematicEntry({
  theme = MATH_WORLDS.sunny_meadow,
  equationHint,
  onComplete,
  forceSkip = false,
}: CinematicEntryProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const [phase, setPhase] = useState(0);

  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (forceSkip || reduced) {
      onComplete();
      return;
    }
    const times = [0, 280, 560, 900, 1200, 1500, 1850];
    const timers = times.map((ms, i) => window.setTimeout(() => setPhase(i), ms));
    const exitTimer = window.setTimeout(() => setExiting(true), 2100);
    const doneTimer = window.setTimeout(() => onComplete(), 2550);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [forceSkip, reduced, onComplete]);

  if (forceSkip || reduced) return null;

  const eqParts = (equationHint ?? "6 + 6 = 12").split(/\s+/).slice(0, 5);

  return (
    <AnimatePresence>
      {!exiting && (
      <motion.div
        key="smt-cinematic"
        className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden rounded-3xl"
        style={{
          background: budget.enableGradients
            ? `linear-gradient(165deg, ${theme.sky[0]}, ${theme.sky[1]}, ${theme.sky[2]})`
            : theme.sky[1],
        }}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        aria-hidden
      >
        {/* Soft light spreads */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${theme.glow}, transparent 60%)`,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: phase >= 1 ? 0.9 : 0, scale: phase >= 1 ? 1.15 : 0.6 }}
          transition={{ duration: 0.7 }}
        />

        {/* Particles awaken */}
        {phase >= 2 &&
          Array.from({ length: Math.min(budget.particles, 8) }, (_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${15 + i * 10}%`,
                top: `${25 + (i % 4) * 12}%`,
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                background: theme.particle,
                boxShadow: `0 0 8px ${theme.particle}`,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0, 1, 0.4], y: [8, -10, -4] }}
              transition={{ duration: 1.2, delay: i * 0.05 }}
            />
          ))}

        {/* Floating numbers drift in */}
        {phase >= 3 && (
          <div className="relative z-10 mb-4 flex items-center gap-3">
            {eqParts.map((part, i) =>
              /^\d+$/.test(part) ? (
                <AliveNumber key={i} value={part} size={36} delay={i * 0.08} color={theme.accent} />
              ) : (
                <motion.span
                  key={i}
                  className="font-black text-2xl"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...TRANSITION.springGentle, delay: i * 0.08 }}
                >
                  {part}
                </motion.span>
              ),
            )}
          </div>
        )}

        {/* Blocks assemble */}
        {phase >= 4 && (
          <div className="relative z-10 mb-6 flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                className="h-5 w-5 rounded-md"
                style={{
                  background: `linear-gradient(145deg, ${theme.accent}, ${theme.accent}99)`,
                  boxShadow: budget.enableShadows
                    ? `0 4px 12px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`
                    : undefined,
                }}
                initial={{ opacity: 0, y: 24, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...TRANSITION.spring, delay: i * 0.05 }}
              />
            ))}
          </div>
        )}

        {/* Glow travels */}
        {phase >= 5 && (
          <motion.div
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.8, 0.2], scale: [0.4, 1.4, 1.6] }}
            transition={{ duration: 0.7 }}
          />
        )}

        {/* Amy soft wave */}
        {phase >= 6 && (
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: [0, -6, 6, 0] }}
            transition={{ ...TRANSITION.springGentle }}
          >
            <AmyIcon size={56} bounce ring speaking={false} />
          </motion.div>
        )}
      </motion.div>
      )}
    </AnimatePresence>
  );
}
