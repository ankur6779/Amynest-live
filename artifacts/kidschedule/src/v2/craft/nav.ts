/**
 * V2 navigation chrome — one whisper language (P0.3).
 * Bottom tabs · back · dismiss · progress. Presentation only.
 */

import { V2_ICON, V2_ICON_STROKE } from "./finish";
import { V2_PRESS_GHOST, V2_PRESS_TAB } from "./interaction";
import { V2_NAV, V2_SPACE } from "./constitution";

export { V2_ICON_STROKE };

/** Shared icon size for all nav chrome (22). */
export const V2_NAV_ICON = V2_ICON.nav;

/** Tab item base — press + column rhythm. */
export const V2_NAV_TAB_BASE = [
  "relative flex flex-1 flex-col items-center justify-center",
  V2_NAV.iconLabelGap,
  V2_SPACE.px1,
  V2_SPACE.py1,
  V2_PRESS_TAB,
].join(" ");

export function v2NavTabClass(active: boolean): string {
  return [
    V2_NAV_TAB_BASE,
    active ? V2_NAV.tabActive : V2_NAV.tabInactive,
  ].join(" ");
}

/**
 * Back control — icon + optional label, ghost tertiary.
 * One anatomy for Ask Amy / Mission / any V2 back.
 */
export const V2_NAV_BACK = [
  "inline-flex items-center",
  V2_SPACE[1],
  V2_SPACE.px1,
  V2_PRESS_GHOST,
  "text-muted-foreground",
].join(" ");

/** Sheet / modal dismiss — tertiary breath (Not right now). */
export const V2_NAV_DISMISS = [
  V2_PRESS_GHOST,
  "text-muted-foreground",
].join(" ");

/** Bottom bar shell classes. */
export const V2_NAV_BAR = `${V2_NAV.bar} ${V2_NAV.safeBottom}`;

/** Progress indicator (Front Door) — light, not Bloom. */
export const V2_NAV_PROGRESS_TRACK = V2_NAV.progressTrack;
export const V2_NAV_PROGRESS_FILL = V2_NAV.progressFill;
