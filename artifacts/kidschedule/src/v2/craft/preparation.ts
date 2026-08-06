/**
 * Wave C — Calm preparation language.
 * Loading communicates preparation, not delay.
 * One Nest skeleton / pulse system. No decorative spinners.
 * No experience-system SKELETON_BASE (SaaS shimmer DELETE).
 *
 * Duration hierarchy:
 *   micro  — no loader when content is ready
 *   standard — skeleton / calm pulse
 *   long — meaningful preparation message (+ optional steps)
 */

/** Shared preparation copy — certainty, not apology. */
export const V2_PREPARE_COPY = {
  quiet: "Amy is quietly preparing…",
  continueWays: "Preparing ways to continue…",
  continuingCare: "Continuing with Amy…",
  restoreCare: "Looking for your previous care…",
  coachJourney: "Amy is shaping your coaching journey",
  signupBusy: "Saving your place with Amy…",
} as const;

/** Nest prepare skeleton — nest-presence-system.css .v2-prepare-skeleton */
const NEST_SKELETON = "v2-prepare-skeleton";

/** Calm pulse bar — never a spinner. Ladder widths only. */
export const V2_PULSE_BAR = `${NEST_SKELETON} h-[length:var(--v2-space-1)] w-[length:var(--v2-space-8)] shrink-0`;

/** Standard skeleton Soft Plate block. */
export const V2_PREPARE_BLOCK = `${NEST_SKELETON} w-full`;

/** Compact pulse for inline busy (purchase / restore). */
export const V2_PULSE_INLINE = `${NEST_SKELETON} h-[length:var(--v2-space-1)] w-[length:var(--v2-space-6)] shrink-0`;
