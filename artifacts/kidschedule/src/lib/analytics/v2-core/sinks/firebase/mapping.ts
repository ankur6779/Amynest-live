/**
 * Registry event name → Firebase / GA4 DebugView event name.
 * Sprint 3C-5: custom North Stars keep registry names; sys_sign_up → sign_up.
 * Commerce / Ads GA4 names (begin_checkout, purchase) are NOT mapped here.
 */

/** Standard GA4 names owned by system mapping only (3C-5). */
export const FIREBASE_GA4_NAME_BY_REGISTRY: Readonly<Record<string, string>> = {
  sys_sign_up: "sign_up",
};

/**
 * Resolve Firebase DebugView event name for an allowlisted registry event.
 * Unknown registry names must never reach this (caller checks allowlist).
 */
export function mapRegistryEventToFirebaseName(eventName: string): string {
  return FIREBASE_GA4_NAME_BY_REGISTRY[eventName] ?? eventName;
}
