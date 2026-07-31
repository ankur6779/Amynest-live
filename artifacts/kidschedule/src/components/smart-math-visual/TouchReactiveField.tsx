import { motion, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import type { MathWorldTheme } from "./world-themes";

type TouchReactiveFieldProps = {
  theme: MathWorldTheme;
  /** Normalized 0–1 pointer position inside the world */
  pointer: { x: number; y: number } | null;
};

/** Soft glow that follows touch/cursor — particles lean away subtly via CSS vars on parent. */
export function TouchReactiveField({ theme, pointer }: TouchReactiveFieldProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const sx = useSpring(pointer?.x ?? 0.5, { stiffness: 120, damping: 22 });
  const sy = useSpring(pointer?.y ?? 0.55, { stiffness: 120, damping: 22 });
  const left = useTransform(sx, (v) => `${v * 100}%`);
  const top = useTransform(sy, (v) => `${v * 100}%`);
  const opacity = useSpring(pointer ? 0.55 : 0, { stiffness: 180, damping: 24 });

  if (reduced || !budget.enableGradients) return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-[4] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left,
        top,
        opacity,
        background: `radial-gradient(circle, ${theme.glow}, transparent 68%)`,
        mixBlendMode: "screen",
      }}
      aria-hidden
    />
  );
}
