import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { ConfettiCelebration } from "@/components/math-playground/effects/ConfettiCelebration";

type MagicCelebrationProps = {
  active: boolean;
  /** Remount key for replay */
  burstKey?: number;
  color?: string;
};

/**
 * Premium success — soft glow wave + magic dust + object dance.
 * Reuses playground CelebrationLayer via ConfettiCelebration (budget-aware).
 */
export function MagicCelebration({
  active,
  burstKey = 0,
  color = "hsl(var(--brand-amber-300))",
}: MagicCelebrationProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const dust = useMemo(
    () =>
      Array.from({ length: Math.min(budget.particles, 10) }, (_, i) => ({
        id: i,
        x: 20 + ((i * 13) % 60),
        delay: i * 0.04,
      })),
    [budget.particles],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <ConfettiCelebration active={active} color={color} />

      {/* Glow wave */}
      <AnimatePresence>
        <motion.div
          key={`glow-${burstKey}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.55, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.4 : 1.1 }}
          style={{
            background: `radial-gradient(circle at 50% 60%, ${color}55, transparent 65%)`,
          }}
        />
      </AnimatePresence>

      {/* Magic dust ribbons */}
      {!reduced &&
        dust.map((d) => (
          <motion.span
            key={`${burstKey}-${d.id}`}
            className="absolute bottom-[18%] rounded-full"
            style={{
              left: `${d.x}%`,
              width: 5,
              height: 5,
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
            initial={{ opacity: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], y: -72 - (d.id % 4) * 10, scale: [0.4, 1.2, 0.2] }}
            transition={{ duration: 0.9, delay: d.delay, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}
