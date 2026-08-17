import { describe, expect, it } from "vitest";
import { getSectionLifetimeLimit } from "@workspace/parent-hub-journey";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { shouldShowPtmSeasonFomoOnHardDayPath } from "@/lib/hub-support-utils";
import {
  ASK_AMY_SOFT_CONTINUE,
  HARD_DAY_EMOTIONAL_CARD_COUNT,
  HARD_DAY_EMOTIONAL_SECTION_ID,
  askAmySoftContinueMessage,
  hardDayPremiumContinueCta,
  hardDayPremiumInvitation,
  isHardDaySubItemMfhoSection,
} from "./hard-day-monetization";

describe("P0-7 hard-day monetization", () => {
  it("D2 raises Emotional Support free floor to all hard-day cards", () => {
    expect(HARD_DAY_EMOTIONAL_CARD_COUNT).toBe(4);
    expect(getSectionLifetimeLimit(HARD_DAY_EMOTIONAL_SECTION_ID)).toBe(4);
    expect(isHardDaySubItemMfhoSection("hub_emotional")).toBe(true);
    expect(isHardDaySubItemMfhoSection("hub_articles")).toBe(false);
  });

  it("D3 soft-continue messages never sell help itself", () => {
    const adult = askAmySoftContinueMessage(false);
    const infant = askAmySoftContinueMessage(true);
    for (const text of [adult, infant, ASK_AMY_SOFT_CONTINUE.inputPlaceholder, ASK_AMY_SOFT_CONTINUE.resetHint]) {
      expect(text.toLowerCase()).not.toMatch(/upgrade|unlock|zap|fomo|don't miss|limited access/);
      expect(text.toLowerCase()).toMatch(/ready|support|continue|amy|tomorrow/);
    }
  });

  it("D5 infant soft-continue keeps continuity voice (no free-baby-questions sell)", () => {
    const infant = askAmySoftContinueMessage(true);
    expect(infant.toLowerCase()).not.toMatch(/3 free|free baby questions|unlock free/);
  });

  it("D6 hard-day Premium voice matches PREMIUM_VOICE", () => {
    expect(hardDayPremiumContinueCta()).toBe(PREMIUM_VOICE.continueCta);
    expect(hardDayPremiumInvitation()).toBe(PREMIUM_VOICE.invitation);
  });

  it("D7 suppresses PTM season FOMO on hard-day Help path", () => {
    expect(shouldShowPtmSeasonFomoOnHardDayPath()).toBe(false);
  });
});
