import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CelebrationLayerProps {
  active: boolean;
  /** Particle budget (already tier-adjusted by the caller). */
  particles: number;
  reduced: boolean;
  color?: string;
}

const CONFETTI = ["⭐", "✨", "🌟", "💫", "🎉"];

/**
 * Soft, non-overstimulating success burst. Particles rise and fade once; there
 * is no looping motion. Honours the device particle budget and reduced-motion.
 */
export function CelebrationLayer({ active, particles, reduced, color }: CelebrationLayerProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: Math.max(0, particles) }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        glyph: CONFETTI[i % CONFETTI.length],
        delay: Math.random() * 0.25,
        size: 14 + Math.random() * 14,
        drift: (Math.random() - 0.5) * 60,
      })),
    [particles],
  );

  return (
    <AnimatePresence>
      {active && !reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {/* Warm glow wash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle at 50% 60%, ${color ?? "rgba(245,158,11,0.35)"}, transparent 65%)`,
            }}
          />
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute"
              style={{ left: `${p.left}%`, bottom: "30%", fontSize: p.size }}
              initial={{ opacity: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], y: -90, x: p.drift, scale: [0.4, 1.1, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
            >
              {p.glyph}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
