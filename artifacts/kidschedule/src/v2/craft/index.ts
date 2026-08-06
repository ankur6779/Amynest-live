/**
 * V2 craft facade — Nest Presence Design System (Phase 1).
 * Screens consume these exports only — no local visual magic.
 * experience-system SaaS tokens are NOT re-exported (dual system DELETE).
 */

import {
  V2_BLOOM_CTA,
  V2_ELEVATED_PLATE,
  V2_SHEET_GLASS,
  V2_SOFT_PLATE,
} from "./constitution";

export { fadeIn, fadeUp } from "./motion";

export {
  V2_ATMOSPHERE,
  V2_ATMOSPHERE_SCRIM,
  V2_BLUR,
  V2_BLOOM_CTA,
  V2_BORDER,
  V2_BUTTON,
  V2_CHIP,
  V2_DURATION_MS,
  V2_EASE,
  V2_ELEVATED_PLATE,
  V2_ELEVATION,
  V2_FADE_RISE_PX,
  V2_FIELD,
  V2_GHOST_CTA,
  V2_GLOW,
  V2_LAYOUT,
  V2_LIGHT,
  V2_MEASURE,
  V2_NAV,
  V2_ORB,
  V2_PRESS_SCALE,
  V2_RADIUS,
  V2_SCROLL_CLEARANCE,
  V2_SECONDARY_CTA,
  V2_SHELL,
  V2_SHELL_RITUAL,
  V2_SHEET_GLASS,
  V2_SOFT_PLATE,
  V2_SPACE,
  V2_SPACE_PX,
  V2_SURFACE_FILL,
  V2_TYPE,
  type V2LightPreset,
} from "./constitution";

/**
 * Surface ladder — four materials only (P0.4).
 * Legacy names alias Constitution Soft Plate / Elevated / Sheet Glass.
 */
/** Soft Plate — lists / prompts / support objects. */
export const V2_CARD = V2_SOFT_PLATE;

/** Soft Plate — Mission / Coach (flat; no extra shadow). */
export const V2_CARD_SOFT = V2_SOFT_PLATE;

/** Elevated Plate — rare lift (success / hero object). */
export const V2_CARD_PANEL = V2_ELEVATED_PLATE;

/** Sheet Glass — bottom sheet / dialog. */
export const V2_SHEET = V2_SHEET_GLASS;

/** Primary CTA — Bloom. */
export const V2_CTA = V2_BLOOM_CTA;

export {
  V2_BUSY,
  V2_DURATION,
  V2_INPUT,
  V2_MOTION_MS,
  V2_PRESS_CARD,
  V2_PRESS_CHIP,
  V2_PRESS_GHOST,
  V2_PRESS_PRIMARY,
  V2_PRESS_SECONDARY,
  V2_PRESS_TAB,
  V2_TRANSITION,
} from "./interaction";

export {
  V2_PREPARE_BLOCK,
  V2_PREPARE_COPY,
  V2_PULSE_BAR,
  V2_PULSE_INLINE,
} from "./preparation";

export {
  V2_EXIT,
  V2_HOPE_EMPTY,
  V2_ICON,
  V2_ICON_STROKE,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_WEIGHT_COACH,
  V2_WEIGHT_MISSION,
} from "./finish";

export {
  V2_NAV_BACK,
  V2_NAV_BAR,
  V2_NAV_DISMISS,
  V2_NAV_ICON,
  V2_NAV_PROGRESS_FILL,
  V2_NAV_PROGRESS_TRACK,
  V2_NAV_TAB_BASE,
  v2NavTabClass,
} from "./nav";

export {
  getV2SessionLightPreset,
  installV2Light,
  resetV2SessionLightForTests,
  resolveV2LightPreset,
  v2LitProps,
  V2_BLOOM_LIGHT,
  V2_FOCUS_LIGHT,
  V2_HERO_LIGHT,
  V2_LIGHT_FIELD,
  V2_ORB_EMIT,
  V2_SHEET_LIGHT,
} from "./lighting";

export {
  v2LawRole,
  V2_HIERARCHY_PEER,
  V2_HIERARCHY_RECEDE,
  V2_HIERARCHY_WHISPER,
  type V2LawRole,
} from "./hierarchy";

export { useReducedMotion } from "@/lib/reduced-motion";
export { v2HapticLight, v2HapticSuccess } from "./haptics";
