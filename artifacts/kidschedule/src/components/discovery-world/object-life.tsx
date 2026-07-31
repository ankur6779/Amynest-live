/**
 * Subtle object life — occasional blink / wiggle / breathe.
 * Maximum subtlety; gated by living-environment caps.
 */

import { memo, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { livingEnvironmentCaps } from "@/lib/sound-world-living-environment";
import { cn } from "@/lib/utils";
import { useSoundWorldAttention } from "./sound-world-attention";

type LifeKind = "breathe" | "wiggle" | "blink" | "bounce" | "wave";

function pickLife(seed: number): LifeKind {
  const kinds: LifeKind[] = ["breathe", "wiggle", "blink", "bounce", "wave"];
  return kinds[seed % kinds.length]!;
}

function lifeMotion(kind: LifeKind): {
  animate: Record<string, number | number[]>;
  transition: Record<string, unknown>;
} {
  switch (kind) {
    case "wiggle":
      return {
        animate: { rotate: [0, -2.5, 2.5, -1.5, 0] },
        transition: { duration: 0.7, ease: "easeInOut" },
      };
    case "blink":
      return {
        animate: { scaleY: [1, 0.15, 1] },
        transition: { duration: 0.28, ease: "easeInOut" },
      };
    case "bounce":
      return {
        animate: { y: [0, -3, 0] },
        transition: { duration: 0.45, ease: "easeOut" },
      };
    case "wave":
      return {
        animate: { rotate: [0, 6, -4, 0] },
        transition: { duration: 0.8, ease: "easeInOut" },
      };
    case "breathe":
    default:
      return {
        animate: { scale: [1, 1.03, 1] },
        transition: { duration: 1.1, ease: "easeInOut" },
      };
  }
}

type ObjectLifeProps = {
  children: ReactNode;
  className?: string;
  /** Stable per-item seed so neighbors don't sync */
  seed?: number;
};

export const ObjectLife = memo(function ObjectLife({
  children,
  className,
  seed = 0,
}: ObjectLifeProps) {
  const reduced = useReducedMotion();
  const caps = livingEnvironmentCaps(reduced);
  const { adaptive } = useSoundWorldAttention();
  const allowLife =
    caps.allowObjectLife && adaptive.animationIntensity !== "minimal";
  const [pulse, setPulse] = useState(0);
  const [kind, setKind] = useState<LifeKind>(() => pickLife(seed));

  useEffect(() => {
    if (!allowLife) return;
    // Natural cadence: 10–22s between micro-actions.
    const base = 10_000 + (seed % 12) * 1000;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setKind(pickLife(seed + pulse + Math.floor(Math.random() * 5)));
        setPulse((p) => p + 1);
        schedule();
      }, base + Math.random() * 4000);
    };
    // Stagger first pulse so grids don't animate together.
    timer = window.setTimeout(() => {
      setPulse(1);
      schedule();
    }, 2000 + (seed % 8) * 700);
    return () => window.clearTimeout(timer);
  }, [allowLife, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowLife) {
    return <div className={className}>{children}</div>;
  }

  const motionProps = pulse === 0 ? { scale: 1 } : lifeMotion(kind).animate;

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      animate={motionProps}
      transition={pulse === 0 ? undefined : lifeMotion(kind).transition}
    >
      {children}
    </motion.div>
  );
});
