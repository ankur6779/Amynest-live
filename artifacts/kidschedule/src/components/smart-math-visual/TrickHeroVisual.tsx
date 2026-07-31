import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MathTrick } from "@workspace/math-tricks";
import { getMathTrickMeta } from "@workspace/math-tricks";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { AliveNumber } from "./AliveNumber";
import { worldForTrick } from "./world-themes";

type TrickHeroVisualProps = {
  trick: MathTrick;
  /** Larger hero stage vs compact card preview */
  size?: "hero" | "card";
  className?: string;
};

function parseExampleTokens(example: string): string[] {
  // Pull first arithmetic-looking chunk, e.g. "6 + 6 = 12"
  const m = example.match(/[\d×xX÷+\-−=]+(?:\s*[\d×xX÷+\-−=]+\s*)+/);
  if (!m) return example.split(/\s+/).slice(0, 5);
  return m[0].replace(/[xX]/g, "×").split(/\s+/).filter(Boolean).slice(0, 7);
}

/** Soft breathing orb / block for ambient life without advancing lesson steps. */
function LivingOrb({
  color,
  delay,
  size = 18,
}: {
  color: string;
  delay: number;
  size?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: size > 20 ? 8 : "50%",
        background: `linear-gradient(145deg, ${color}, ${color}99)`,
        boxShadow: `0 4px 14px ${color}55, inset 0 1px 0 rgba(255,255,255,0.4)`,
        transformOrigin: "50% 100%",
      }}
      animate={
        reduced
          ? undefined
          : {
              y: [0, -6, 0],
              scaleX: [1, 0.94, 1.06, 1],
              scaleY: [1, 1.08, 0.94, 1],
              opacity: [0.85, 1, 0.85],
            }
      }
      transition={{ duration: 2.4 + delay, delay, repeat: Infinity, ease: "easeInOut" }}
      whileHover={reduced ? undefined : { y: -3, scale: 1.08 }}
    />
  );
}

/**
 * Ambient hero animation for EVERY trick.
 * Does not use AnimatedMathScene autoplay (preserves analytics / voice gates).
 * Pure visual storytelling from existing trick fields.
 */
export function TrickHeroVisual({ trick, size = "card", className = "" }: TrickHeroVisualProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const meta = getMathTrickMeta(trick.id);
  const world = worldForTrick(trick);
  const tokens = useMemo(() => parseExampleTokens(trick.example), [trick.example]);
  const isHero = size === "hero";
  const orbCount = meta.visual === "fingers" ? 6 : meta.visual === "numberline" ? 5 : 8;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        minHeight: isHero ? 168 : 112,
        background: budget.enableGradients
          ? `radial-gradient(ellipse at 50% 30%, ${world.glow}, transparent 55%), linear-gradient(155deg, ${world.sky[0]}cc, ${world.sky[1]}ee)`
          : "rgba(0,0,0,0.25)",
        border: `1px solid ${world.accent}22`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 28px rgba(0,0,0,0.2)`,
      }}
      aria-hidden
    >
      {/* Soft parallax glow */}
      {!reduced && budget.enableGradients && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 40% 30%, ${world.glow}, transparent 60%)`,
          }}
          animate={{ opacity: [0.5, 0.85, 0.5], x: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div
        className={`relative z-10 flex h-full flex-col items-center justify-center gap-3 px-3 ${
          isHero ? "py-6" : "py-4"
        }`}
      >
        {/* Living object cluster */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: Math.min(orbCount, isHero ? 10 : 8) }, (_, i) => (
            <LivingOrb
              key={i}
              color={i % 2 === 0 ? trick.color : world.accent}
              delay={i * 0.12}
              size={isHero ? (meta.visual === "fingers" ? 16 : 20) : 14}
            />
          ))}
        </div>

        {/* Animated equation */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {tokens.map((tok, i) =>
            /^\d+$/.test(tok) ? (
              <AliveNumber
                key={`${tok}-${i}`}
                value={tok}
                size={isHero ? 32 : 22}
                delay={0.15 + i * 0.07}
                color={world.accent}
              />
            ) : (
              <motion.span
                key={`${tok}-${i}`}
                className="font-black"
                style={{
                  fontSize: isHero ? 26 : 18,
                  color: "rgba(255,255,255,0.45)",
                }}
                initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...TRANSITION.springGentle, delay: 0.15 + i * 0.07 }}
              >
                {tok}
              </motion.span>
            ),
          )}
        </div>

        {/* Number-line hop cue */}
        {meta.visual === "numberline" && meta.numberLine && (
          <div className="mt-1 w-full max-w-[240px] px-2">
            <div
              className="relative h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <motion.div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full"
                style={{
                  background: world.accent,
                  boxShadow: `0 0 12px ${world.glow}`,
                }}
                animate={
                  reduced
                    ? { left: "60%" }
                    : { left: ["12%", "72%", "12%"] }
                }
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        )}

        {/* World label — tiny, non-clutter */}
        {isHero && (
          <motion.p
            className="text-[10px] font-bold tracking-wide"
            style={{ color: `${world.accent}99` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {world.label}
          </motion.p>
        )}
      </div>
    </div>
  );
}
