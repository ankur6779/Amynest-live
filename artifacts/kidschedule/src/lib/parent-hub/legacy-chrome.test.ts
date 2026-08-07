import { describe, expect, it } from "vitest";
import {
  PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME,
  roomsV1AllowsQuietChildIdentity,
} from "./legacy-chrome";

describe("Pack 4.9 Rooms V1 legacy chrome contract", () => {
  it("forbids every pre-room marketing surface", () => {
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.pageHeader).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.patentStrip).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.askAmyMarketingChip).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.infantTrialBanner).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.journeyPulse).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.xpCoinsLevelsStreak).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.todaysPathUnlockStrip).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.peekAheadMarketing).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.rewardModal).toBe(false);
    expect(PARENT_HUB_ROOMS_V1_PRE_ROOM_CHROME.purplePremiumPageWash).toBe(false);
  });

  it("allows quiet child identity only for multi-child", () => {
    expect(roomsV1AllowsQuietChildIdentity(0)).toBe(false);
    expect(roomsV1AllowsQuietChildIdentity(1)).toBe(false);
    expect(roomsV1AllowsQuietChildIdentity(2)).toBe(true);
  });
});
