/**
 * Founder Final Emotional Finish — presentation tokens only.
 * Exits · icons · scroll · weight. Constitution-backed (P0.1).
 */

import {
  V2_ELEVATION,
  V2_NAV,
  V2_SCROLL_CLEARANCE,
} from "./constitution";

/** Gentle exit / dismiss labels — never mechanical. */
export const V2_EXIT = {
  notRightNow: "Not right now",
  backToToday: "Back to today",
  skipForNow: "Skip for now",
  backToSuggestions: "Back to suggestions",
  chooseAgain: "Choose again",
  continueToToday: "Continue to Today",
} as const;

/**
 * One Lucide family — consistent optical size + stroke.
 * Use strokeWidth={V2_ICON_STROKE} on Lucide components.
 */
export const V2_ICON_STROKE = 1.75;

export const V2_ICON = {
  /** Nav — Constitution 22 optical */
  nav: V2_NAV.icon,
  /** Header actions (20) — --v2-icon-ui */
  md: "h-[length:var(--v2-icon-ui)] w-[length:var(--v2-icon-ui)] shrink-0",
  /** Inline with text (Back + label) */
  sm: "h-4 w-4 shrink-0",
  /** Status / success marks in panels */
  lg: "h-7 w-7 shrink-0",
  /** Offline / alert marks */
  xl: "h-8 w-8 shrink-0",
} as const;

/** Calm scroll shells — no slippery bounce, soft settle. */
export const V2_SCROLL =
  "overscroll-y-contain scroll-smooth [scrollbar-gutter:stable]";

/** Bottom padding — Constitution clearance (64 + safe-area). */
export const V2_SCROLL_PAD = V2_SCROLL_CLEARANCE;

/**
 * Mission / Coach composition weight (P0.6 Law of Three).
 * Mission stays full presence; Coach is peer that recedes.
 * No ring · no decorative shadow (materials unchanged).
 */
export const V2_WEIGHT_MISSION = V2_ELEVATION.none;

/** Coach = Soft Plate peer — visually quieter than Mission. */
export const V2_WEIGHT_COACH = "opacity-80";

/** Hope empty-state copy — never "nothing here". */
export const V2_HOPE_EMPTY =
  "You're just getting started. Amy will build this with you.";
