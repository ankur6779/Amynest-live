import type { TargetAndTransition, Transition } from "framer-motion";

const SPRING: Transition = { type: "spring", stiffness: 420, damping: 16 };

export const OBJECT_MOTION_VARIANTS: Record<string, TargetAndTransition> = {
  jump: {
    y: [0, -14, -4, 0],
    scale: [1, 1.08, 1],
    transition: { duration: 0.45, ease: "easeOut" },
  },
  smile: {
    scale: [1, 1.14, 1.02, 1],
    rotate: [0, 4, -2, 0],
    transition: { duration: 0.5 },
  },
  bounce: {
    y: [0, -10, 0, -4, 0],
    transition: SPRING,
  },
  wobble: {
    rotate: [-10, 10, -6, 6, 0],
    transition: { duration: 0.55 },
  },
  spin: {
    rotate: [0, 360],
    transition: { duration: 0.7, ease: "easeInOut" },
  },
  bloom: {
    scale: [0.85, 1.18, 1],
    opacity: [0.85, 1, 1],
    transition: { duration: 0.55, ease: "easeOut" },
  },
  sparkle: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"],
    transition: { duration: 0.5 },
  },
  hop: {
    y: [0, -12, 0],
    x: [0, 2, -2, 0],
    transition: SPRING,
  },
  twinkle: {
    scale: [1, 1.15, 0.95, 1.1, 1],
    opacity: [1, 0.75, 1, 0.85, 1],
    transition: { duration: 0.65 },
  },
  burst: {
    scale: [1, 1.35, 1],
    opacity: [1, 1, 0.9],
    transition: { duration: 0.4 },
  },
};

export function motionDurationMs(name: string): number {
  const variant = OBJECT_MOTION_VARIANTS[name];
  if (!variant?.transition) return 500;
  const t = variant.transition;
  if (typeof t === "object" && "duration" in t && typeof t.duration === "number") {
    return t.duration * 1000;
  }
  return 500;
}
