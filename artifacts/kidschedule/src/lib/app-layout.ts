import { safePathStartsWith } from "@/lib/safe-route";

/** Compact mobile header content row (px) — safe-area inset is additive. */
export const APP_HEADER_HEIGHT_FALLBACK_PX = 56;

/** Extra gap between fixed header and scroll content (px). */
export const APP_HEADER_CONTENT_GAP_PX = 8;

export const APP_HEADER_HEIGHT_CSS_VAR = "--app-header-height";

/** Use in fixed/absolute shells that must start below the mobile app header. */
export const APP_HEADER_HEIGHT_OFFSET = `var(${APP_HEADER_HEIGHT_CSS_VAR}, 3.5rem)`;

/** Bottom clearance above system nav / home indicator — use as `var(--app-bottom-clearance)` in CSS. */
export const APP_BOTTOM_CLEARANCE_CSS_VAR = "--app-bottom-clearance";

/**
 * Parenting Hub → Learning Zone modules use a full-screen flow like Phonics:
 * each page owns its header; the global AmyNest app bar is hidden on mobile.
 */
export const LEARNING_ZONE_ROUTE_PREFIXES = [
  "/phonics",
  "/smart-math-tricks",
  "/abacus",
  "/spelling",
  "/study",
  "/olympiad",
  "/event-prep",
] as const;

export function isLearningZoneRoute(path: string): boolean {
  return LEARNING_ZONE_ROUTE_PREFIXES.some((prefix) =>
    safePathStartsWith(path, prefix),
  );
}
