import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import type { AmyReactionDef } from "@workspace/math-playground-engagement";
import { useReducedMotion } from "@/lib/reduced-motion";

type ReactionMotion = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition?: Transition;
};

const REACTION_MOTION: Record<string, ReactionMotion> = {
  clap: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: [0.8, 1.1, 1], opacity: 1, rotate: [0, -8, 8, 0] },
    transition: { duration: 0.6 },
  },
  jump: {
    initial: { y: 0 },
    animate: { y: [0, -18, 0] },
    transition: { duration: 0.55, ease: "easeOut" },
  },
  spin: {
    initial: { rotate: 0 },
    animate: { rotate: 360 },
    transition: { duration: 0.7 },
  },
  dance: {
    initial: { x: 0 },
    animate: { x: [-6, 6, -4, 4, 0], rotate: [-5, 5, 0] },
    transition: { duration: 0.8 },
  },
  throw_stars: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  celebrate: {
    initial: { scale: 0.9 },
    animate: { scale: [0.9, 1.12, 1] },
    transition: { duration: 0.5 },
  },
  point: {
    initial: { x: 0 },
    animate: { x: [0, 8, 0] },
    transition: { duration: 0.45 },
  },
  wave: {
    initial: { rotate: 0 },
    animate: { rotate: [0, 14, -8, 10, 0] },
    transition: { duration: 0.7 },
  },
  demonstrate: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.06, 1] },
    transition: { duration: 0.55 },
  },
  encourage: {
    initial: { y: 0 },
    animate: { y: [0, -4, 0] },
    transition: { duration: 0.5, repeat: 1 },
  },
  blink: {
    initial: { opacity: 1 },
    animate: { opacity: [1, 0.6, 1] },
    transition: { duration: 0.35 },
  },
  sway: {
    initial: { rotate: 0 },
    animate: { rotate: [-3, 3, -2, 2, 0] },
    transition: { duration: 1.2, repeat: Infinity, repeatType: "mirror" },
  },
  smile: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 0.45 },
  },
  look_around: {
    initial: { x: 0 },
    animate: { x: [-4, 4, 0] },
    transition: { duration: 0.8 },
  },
};

interface AmyReactionOverlayProps {
  reaction: AmyReactionDef | null;
  reactionKey: number;
  accentColor?: string;
}

export function AmyReactionOverlay({
  reaction,
  reactionKey,
  accentColor = "hsl(var(--brand-amber-300))",
}: AmyReactionOverlayProps) {
  const reduced = useReducedMotion();
  if (!reaction || reduced) return null;

  const reactionMotion = REACTION_MOTION[reaction.kind] ?? REACTION_MOTION.celebrate;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${reaction.kind}-${reactionKey}`}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={reactionMotion.initial}
        animate={reactionMotion.animate}
        transition={reactionMotion.transition}
        aria-hidden
      >
        {reaction.particle === "stars" && <ParticleBurst emoji="⭐" count={5} color={accentColor} />}
        {reaction.particle === "sparkle" && <ParticleBurst emoji="✨" count={4} color={accentColor} />}
        {reaction.particle === "confetti" && <ParticleBurst emoji="🎉" count={3} color={accentColor} />}
      </motion.div>
    </AnimatePresence>
  );
}

function ParticleBurst({
  emoji,
  count,
  color,
}: {
  emoji: string;
  count: number;
  color: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="absolute text-sm"
          style={{ color }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.6],
            x: Math.cos((i / count) * Math.PI * 2) * 28,
            y: Math.sin((i / count) * Math.PI * 2) * 28 - 8,
          }}
          transition={{ duration: 0.7, delay: i * 0.04 }}
        >
          {emoji}
        </motion.span>
      ))}
    </>
  );
}
