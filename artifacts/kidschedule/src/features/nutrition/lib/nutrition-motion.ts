/**
 * Nutrition Hub motion tokens — Framer Motion presets.
 */

import type { Transition, Variants } from "framer-motion";
import { TRANSITION, DURATION, EASE_WARM } from "@/lib/experience-system";

export const NUTRITION_TRANSITION = {
  micro: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  warm: TRANSITION.warm,
  score: { duration: 0.55, ease: EASE_WARM } satisfies Transition,
  feedback: TRANSITION.springGentle,
  unlock: { duration: DURATION.long, ease: EASE_WARM } satisfies Transition,
} as const;

export const nutritionFadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const nutritionScaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

export const nutritionWinReveal: Variants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0 },
};

export const nutritionPulse = {
  animate: {
    scale: [1, 1.04, 1],
    opacity: [0.7, 1, 0.7],
  },
  transition: {
    duration: 2.4,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export const nutritionTapFeedback = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: NUTRITION_TRANSITION.micro,
};
