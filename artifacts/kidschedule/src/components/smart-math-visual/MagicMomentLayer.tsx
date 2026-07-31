import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import type { MathWorldTheme } from "./world-themes";

type MagicKind = "butterfly" | "meteor" | "crystal_spark";

type MagicMomentLayerProps = {
  theme: MathWorldTheme;
  enabled?: boolean;
};

const KINDS: MagicKind[] = ["butterfly", "meteor", "crystal_spark"];

/**
 * One unforgettable surprise over many quiet minutes — never a parade.
 */
export function MagicMomentLayer({ theme, enabled = true }: MagicMomentLayerProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const [event, setEvent] = useState<{ kind: MagicKind; key: number } | null>(null);

  useEffect(() => {
    if (!enabled || reduced || budget.particles === 0) return;
    let cancelled = false;
    const timers = new Set<number>();
    const track = (id: number) => {
      timers.add(id);
      return id;
    };

    const schedule = () => {
      // 50–90s between moments; often skip for rest
      const wait = 50000 + Math.random() * 40000;
      track(
        window.setTimeout(() => {
          if (cancelled) return;
          if (Math.random() > 0.4) {
            const kind = KINDS[Math.floor(Math.random() * KINDS.length)]!;
            setEvent({ kind, key: Date.now() });
            track(
              window.setTimeout(() => {
                if (!cancelled) setEvent(null);
              }, 2800),
            );
          }
          schedule();
        }, wait),
      );
    };

    // First possible surprise after a long settle — never immediate
    track(window.setTimeout(schedule, 35000 + Math.random() * 15000));

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, [enabled, reduced, budget.particles]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {event.kind === "butterfly" && (
              <motion.span
                className="absolute"
                style={{ top: "32%", left: "-4%" }}
                animate={{ x: ["0%", "110%"], y: [0, -12, 8, 0] }}
                transition={{ duration: 3.2, ease: "easeInOut" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 8,
                    borderRadius: "50% 50% 40% 40%",
                    background: `linear-gradient(135deg, ${theme.accent}, ${theme.particle})`,
                    opacity: 0.85,
                  }}
                />
              </motion.span>
            )}

            {event.kind === "meteor" && (
              <motion.span
                className="absolute h-px w-20"
                style={{
                  top: "16%",
                  left: "8%",
                  background: `linear-gradient(90deg, transparent, ${theme.accent})`,
                }}
                animate={{ x: ["0%", "100%"], y: [0, 36], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.3, ease: "easeOut" }}
              />
            )}

            {event.kind === "crystal_spark" && (
              <motion.div
                className="absolute left-1/2 top-[36%] h-16 w-16 -translate-x-1/2 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
                }}
                animate={{ scale: [0.5, 1.2, 0.7], opacity: [0, 0.55, 0] }}
                transition={{ duration: 1.5 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
