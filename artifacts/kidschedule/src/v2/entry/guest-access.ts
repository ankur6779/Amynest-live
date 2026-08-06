/**
 * Phase 4B — Guest conversion glue (routing only).
 * No account-only APIs; local guest session + flag gates.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";
import { FrontDoorState } from "@/v2/front-door/state-machine";
import { getGuestSession, isGuestModeV2Enabled } from "@/v2/guest";
import { shouldEnterFrontDoor } from "./should-enter-front-door";
import {
  isAskAmyV2Enabled,
  isForChildV2Enabled,
  isTodayV2Enabled,
} from "./v2-shell-flags";

/** Guest may open Today / Mission when both guest + today flags are on. */
export function isGuestV2TodayAccessAllowed(): boolean {
  return isGuestModeV2Enabled() && isTodayV2Enabled();
}

/** Guest may open Ask Amy entry before authentication (trust before account). */
export function isGuestV2AskAmyAccessAllowed(): boolean {
  return isGuestModeV2Enabled() && isAskAmyV2Enabled();
}

/** Guest may open For Child preview before authentication (wonder before account). */
export function isGuestV2ForChildAccessAllowed(): boolean {
  return isGuestModeV2Enabled() && isForChildV2Enabled();
}

/** Front Door finished (worry chosen / COMPLETE). */
export function isGuestFrontDoorComplete(
  session = getGuestSession(),
): boolean {
  if (!session) return false;
  if (session.state === FrontDoorState.COMPLETE) return true;
  return Boolean(session.worry);
}

/**
 * Cold start / reopen: completed guest lands on Today (never COMPLETE loop).
 */
export function shouldLandGuestOnToday(): boolean {
  return (
    isGuestV2TodayAccessAllowed() &&
    shouldEnterFrontDoor() &&
    isGuestFrontDoorComplete()
  );
}

/** Unsigned entry should open Front Door only when not already complete. */
export function shouldShowGuestFrontDoor(): boolean {
  return shouldEnterFrontDoor() && !shouldLandGuestOnToday();
}

/** Guest may open Premium V2 shell (account-required gate inside page). */
export function isGuestV2PremiumAccessAllowed(): boolean {
  return isGuestModeV2Enabled() && isV2FlagEnabled("premium_v2");
}
