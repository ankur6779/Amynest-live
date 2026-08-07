/**
 * Pack 4.9 — Legacy chrome contract for Rooms V1.
 * Presentation law only. No entitlement / journey backend changes.
 *
 * Absolute: nothing product-marketing may appear before the four rooms.
 */

export const PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME = {
  pageHeader: false,
  patentStrip: false,
  askAmyMarketingChip: false,
  infantTrialBanner: false,
  journeyPulse: false,
  xpCoinsLevelsStreak: false,
  todaysPathUnlockStrip: false,
  peekAheadMarketing: false,
  rewardModal: false,
  purplePremiumPageWash: false,
} as const;

/** True only when a quiet multi-child identity strip may precede rooms. */
export function roomsV1AllowsQuietChildIdentity(childCount: number): boolean {
  return childCount > 1;
}
