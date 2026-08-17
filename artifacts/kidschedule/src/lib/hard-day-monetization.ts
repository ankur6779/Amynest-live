/**
 * P0-7 Hard-Day Monetization — experience-layer helpers.
 *
 * Locked Founder decisions (policy §14):
 *   D1 = YES (Hard-Day Law binding)
 *   D2 = both (raise emotional free floor + bypass SubItemGate for MFHO)
 *   D3 = soft-continue message only (Ask Amy quota exhaust)
 *   D4 = Experience-only (no quota / entitlement integer changes for AI)
 *   D5 = Keep infant free AI floor + rewrite copy
 *   D6 = YES force PREMIUM_VOICE on hard-day paths regardless of living flag
 *   D7 = Hard-day only (suppress PTM season FOMO on Help/PTM surfaces)
 *   D8 = proceed
 *
 * Does NOT change RevenueCat, entitlements, DB, API, or AI logic.
 */

import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";

/** Emotional Support hard-day cards — MFHO requires all four free (D2 raise floor). */
export const HARD_DAY_EMOTIONAL_SECTION_ID = "hub_emotional" as const;

export const HARD_DAY_EMOTIONAL_CARD_COUNT = 4;

/** Hub sections where SubItemGate must never block Meaningful First Help. */
export const HARD_DAY_SUBITEM_MFHO_SECTIONS = [
  HARD_DAY_EMOTIONAL_SECTION_ID,
] as const;

export function isHardDaySubItemMfhoSection(sectionId: string): boolean {
  return (HARD_DAY_SUBITEM_MFHO_SECTIONS as readonly string[]).includes(sectionId);
}

/** Ask Amy soft-continue copy — message only, no Upgrade/Zap theatre (D3 + D6). */
export const ASK_AMY_SOFT_CONTINUE = {
  adultMessage:
    "We've shared several questions today. Amy can keep supporting you whenever you're ready.",
  infantMessage:
    "We've shared several baby questions today. Amy can keep supporting you whenever you're ready.",
  inputPlaceholder: "Amy is here whenever you're ready to continue",
  notNowLabel: "Not now",
  resetHint: "Amy's extra help returns tomorrow.",
} as const;

export function askAmySoftContinueMessage(isInfantContext: boolean): string {
  return isInfantContext
    ? ASK_AMY_SOFT_CONTINUE.infantMessage
    : ASK_AMY_SOFT_CONTINUE.adultMessage;
}

/** D6 — locked CTA voice on hard-day modules regardless of living flag. */
export function hardDayPremiumContinueCta(): string {
  return PREMIUM_VOICE.continueCta;
}

export function hardDayPremiumInvitation(): string {
  return PREMIUM_VOICE.invitation;
}
