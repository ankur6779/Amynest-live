/**
 * Nest Presence motion variants — Constitution §8.
 * One easing family. Containers move; text does not invent second curves.
 * Replaces experience-system fadeIn / fadeUp for Nest surfaces.
 */

import type { Variants } from "framer-motion";
import { V2_FADE_RISE_PX } from "./constitution";

/** Opacity-only enter — page / ritual crossfade. */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Soft rise enter — ≤8px (Constitution fade rise). */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: V2_FADE_RISE_PX },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -Math.min(6, V2_FADE_RISE_PX) },
};
