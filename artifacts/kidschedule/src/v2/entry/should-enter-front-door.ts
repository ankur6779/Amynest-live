/**
 * Sprint 1 · S1-T06 — when may the app route into Front Door?
 * Both flags required. Defaults OFF → production path unchanged.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Front Door UI + route mount. */
export function isNewFrontDoorEnabled(): boolean {
  return isV2FlagEnabled("new_front_door");
}

/**
 * Unsigned / new-install entry may use Front Door only when both
 * `new_front_door` and `guest_mode_v2` are on.
 */
export function shouldEnterFrontDoor(): boolean {
  return isNewFrontDoorEnabled() && isV2FlagEnabled("guest_mode_v2");
}
