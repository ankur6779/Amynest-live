import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import type { Atmosphere } from "./atmosphere";
import type { MathWorldTheme } from "./world-themes";

type PixarLightingProps = {
  theme: MathWorldTheme;
  atmosphere: Atmosphere;
  celebrate?: boolean;
  /** Still light — no roaming shafts during learning */
  quiet?: boolean;
};

/** Ambient bloom + rim — cinematic, restrained. */
export function PixarLighting({
  theme,
  atmosphere,
  celebrate = false,
  quiet = false,
}: PixarLightingProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  if (!budget.enableGradients) return null;

  const shaftOp = quiet ? atmosphere.shaftOpacity * 0.45 : atmosphere.shaftOpacity;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      <div className="absolute inset-0" style={{ background: atmosphere.skyTint }} />

      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 55% at 50% 0%, ${atmosphere.sunGlow}, transparent 70%)`,
          mixBlendMode: "screen",
        }}
        animate={
          reduced || quiet
            ? { opacity: quiet ? 0.4 : 0.55 }
            : { opacity: celebrate ? [0.65, 0.9, 0.65] : [0.45, 0.65, 0.45] }
        }
        transition={
          reduced || quiet
            ? undefined
            : { duration: celebrate ? 1.6 : 10, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${quiet ? 40 : 60}px ${atmosphere.rimLight}, inset 0 -40px 80px ${theme.fog}`,
        }}
      />

      {/* Still shafts in focus; soft opacity breathe only at rest */}
      {!reduced && (
        <div
          className="absolute -top-8 left-[22%] h-[130%] w-14 origin-top rotate-[14deg]"
          style={{
            background: `linear-gradient(180deg, ${atmosphere.sunGlow}, transparent 70%)`,
            opacity: shaftOp,
            filter: budget.blurPx > 0 ? "blur(8px)" : undefined,
          }}
        />
      )}

      {!reduced && !quiet && (
        <motion.div
          className="absolute top-[14%] h-20 w-20 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)`,
            mixBlendMode: "soft-light",
          }}
          animate={{ left: ["15%", "55%", "15%"], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {budget.enableShadows && (
        <div
          className="absolute bottom-0 left-1/2 h-14 w-[65%] -translate-x-1/2 rounded-[100%]"
          style={{
            background: "radial-gradient(ellipse, rgba(0,0,0,0.32), transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      )}
    </div>
  );
}
