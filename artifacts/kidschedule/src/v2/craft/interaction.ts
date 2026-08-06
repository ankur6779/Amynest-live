/**
 * Wave B — Interaction craft tokens.
 * Certainty, not excitement. Containers move; text does not.
 * Durations / press scale — Design Constitution §2 / §8 (P0.1).
 */

import type { Transition } from "framer-motion";
import {
  V2_DURATION_MS,
  V2_EASE,
  V2_GLOW,
  V2_PRESS_SCALE,
  V2_RADIUS,
} from "./constitution";

/** Motion hierarchy (ms) — Constitution micro · ui · page · ritual. */
export const V2_MOTION_MS = {
  /** Tap / press / release — micro */
  tap: V2_DURATION_MS.micro,
  /** Card enter / press settle — ui */
  card: V2_DURATION_MS.ui,
  /** Sheet open / dismiss — page band */
  sheet: V2_DURATION_MS.page,
  /** Page / step crossfade */
  page: V2_DURATION_MS.page,
  /** Ritual landings */
  ritual: V2_DURATION_MS.ritual,
} as const;

export const V2_DURATION = {
  tap: V2_MOTION_MS.tap / 1000,
  card: V2_MOTION_MS.card / 1000,
  sheet: V2_MOTION_MS.sheet / 1000,
  page: V2_MOTION_MS.page / 1000,
  ritual: V2_MOTION_MS.ritual / 1000,
} as const;

const EASE = V2_EASE as unknown as [number, number, number, number];

/** Framer transitions — containers only. One easing family. */
export const V2_TRANSITION = {
  tap: { duration: V2_DURATION.tap, ease: EASE } satisfies Transition,
  card: { duration: V2_DURATION.card, ease: EASE } satisfies Transition,
  sheet: { duration: V2_DURATION.sheet, ease: EASE } satisfies Transition,
  page: { duration: V2_DURATION.page, ease: EASE } satisfies Transition,
  ritual: { duration: V2_DURATION.ritual, ease: EASE } satisfies Transition,
} as const;

/** Focus from lighting preset — not a kit primary ring invent. */
const FOCUS_RING = "v2-focus-light";

const DISABLED =
  "disabled:pointer-events-none disabled:opacity-40 disabled:saturate-75";

const PRESS_TRANSFORM = `active:scale-[${V2_PRESS_SCALE}]`;

const D_MICRO = "duration-[length:var(--v2-duration-micro)]";
const D_UI = "duration-[length:var(--v2-duration-ui)]";

/** Primary — Bloom press + light escaping warm surface. */
export const V2_PRESS_PRIMARY = [
  "touch-manipulation select-none",
  `transition-transform ${D_MICRO} ease-out`,
  PRESS_TRANSFORM,
  "hover:brightness-[0.98]",
  V2_GLOW.bloom,
  FOCUS_RING,
  DISABLED,
].join(" ");

/** Secondary — Soft Plate peer (unequal). Light fill hover — no kit border. */
export const V2_PRESS_SECONDARY = [
  "touch-manipulation select-none",
  `transition-[transform,background-color] ${D_MICRO} ease-out`,
  PRESS_TRANSFORM,
  "hover:bg-[var(--v2-fill-hover-soft)]",
  FOCUS_RING,
  DISABLED,
].join(" ");

/** Tertiary / ghost — Atmosphere breath. */
export const V2_PRESS_GHOST = [
  "touch-manipulation select-none",
  `transition-[transform,opacity,color,background-color] ${D_MICRO} ease-out`,
  PRESS_TRANSFORM,
  "hover:bg-[var(--v2-fill-hover-mist)]",
  FOCUS_RING,
  DISABLED,
].join(" ");

/** Interactive Soft Plate row — denser fill hover, never border invent. */
export const V2_PRESS_CARD = [
  "touch-manipulation select-none",
  `transition-[transform,background-color] ${D_UI} ease-out`,
  PRESS_TRANSFORM,
  "hover:bg-[var(--v2-fill-hover-soft)]",
  FOCUS_RING,
  DISABLED,
].join(" ");

/** Chip — micro certainty. */
export const V2_PRESS_CHIP = [
  "touch-manipulation select-none",
  `transition-transform ${D_MICRO} ease-out`,
  PRESS_TRANSFORM,
  FOCUS_RING,
].join(" ");

/** Tab item — quiet press (chrome; no Bloom glow). */
export const V2_PRESS_TAB = [
  "touch-manipulation select-none",
  `transition-colors ${D_MICRO} ease-out`,
  "active:opacity-80",
  FOCUS_RING,
].join(" ");

/** Field focus — preset focus light on Soft Plate field (compose with V2_FIELD). */
export const V2_INPUT = [
  V2_RADIUS.field,
  `transition-[box-shadow,background-color] ${D_UI} ease-out`,
  FOCUS_RING,
].join(" ");

/** Busy / loading container. */
export const V2_BUSY = `aria-busy:opacity-80 aria-busy:pointer-events-none transition-opacity ${D_UI} ease-out`;
