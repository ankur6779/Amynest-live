import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { MathTrick } from "@workspace/math-tricks";
import { TRANSITION, PRESS_FEEDBACK } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";
import { TrickHeroVisual } from "./TrickHeroVisual";
import { MagicProgressPath, type PathNode } from "./MagicProgressPath";
import { worldForTrick } from "./world-themes";

type HeroLessonStageProps = {
  trick: MathTrick;
  childName?: string;
  progressNodes: PathNode[];
  ctaLabel: string;
  onCta: () => void;
  ready?: boolean;
  /** Fired as hero morphs into lesson (visual only) */
  onImmerse?: () => void;
};

/**
 * First-viewport hero — one scene, one sentence, progress, one CTA.
 * CTA morphs the stage (zoom / lift) before revealing the lesson — no hard cut.
 */
export function HeroLessonStage({
  trick,
  childName,
  progressNodes,
  ctaLabel,
  onCta,
  ready = true,
  onImmerse,
}: HeroLessonStageProps) {
  const reduced = useReducedMotion();
  const world = worldForTrick(trick);
  const [morphing, setMorphing] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };
  }, []);

  const handleCta = () => {
    if (morphing) return;
    setMorphing(true);
    onImmerse?.();
    const outer = window.setTimeout(() => {
      onCta();
      const inner = window.setTimeout(() => setMorphing(false), 600);
      timersRef.current.push(inner);
    }, reduced ? 80 : 420);
    timersRef.current.push(outer);
  };

  return (
    <motion.section
      layout
      className="relative space-y-4"
      initial={reduced || !ready ? false : { opacity: 0, y: 18 }}
      animate={
        ready
          ? {
              opacity: 1,
              y: morphing ? -8 : 0,
              scale: morphing ? 1.03 : 1,
            }
          : { opacity: 0, y: 18 }
      }
      transition={TRANSITION.warm}
    >
      {/* Soft organic platform — not a floating card */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-[1.75rem]"
        style={{
          background: `linear-gradient(165deg, ${world.sky[0]}99, transparent 80%)`,
          boxShadow: morphing
            ? `0 20px 50px ${world.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`
            : `0 12px 36px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
        animate={
          reduced
            ? undefined
            : morphing
              ? { filter: ["brightness(1)", "brightness(1.12)", "brightness(1.05)"] }
              : undefined
        }
      >
        <TrickHeroVisual trick={trick} size="hero" />

        {/* Light ribbon during morph */}
        {morphing && !reduced && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.5 }}
            style={{
              background: `radial-gradient(circle at 50% 40%, ${world.glow}, transparent 60%)`,
            }}
          />
        )}
      </motion.div>

      <div className="space-y-1.5 px-1 text-center">
        {childName?.trim() && (
          <p className="text-[11px] font-bold" style={{ color: `${world.accent}bb` }}>
            Hi {childName.trim()}
          </p>
        )}
        <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">
          {trick.title}
        </h2>
        <p className="mx-auto max-w-[20rem] text-sm font-bold leading-snug text-white/70">
          {trick.trick}
        </p>
      </div>

      <MagicProgressPath nodes={progressNodes} accent={world.accent} />

      <motion.button
        type="button"
        onClick={handleCta}
        className={`relative mx-auto flex w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl py-3.5 text-sm font-black text-[#1c0a00] ${PRESS_FEEDBACK}`}
        style={{
          background: `linear-gradient(135deg, ${world.accent}, #fbbf24)`,
          boxShadow: `0 8px 28px ${world.glow}`,
        }}
        animate={
          reduced
            ? undefined
            : {
                scale: [1, 1.015, 1],
                boxShadow: [
                  `0 6px 22px ${world.glow}`,
                  `0 8px 28px ${world.glow}`,
                  `0 6px 22px ${world.glow}`,
                ],
              }
        }
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="relative z-10">{ctaLabel}</span>
      </motion.button>
    </motion.section>
  );
}
