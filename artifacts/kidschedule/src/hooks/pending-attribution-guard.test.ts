import { describe, it, expect, beforeEach } from "vitest";
import {
  PENDING_GIFT_KEY,
  PENDING_REFERRAL_KEY,
  capturePendingGiftCode,
  capturePendingReferralCode,
  clearPendingGiftCode,
  readPendingGiftCodeForUser,
  readPendingReferralCodeForUser,
} from "@/hooks/use-referrals";
import { clearUserSessionCaches } from "@/lib/user-session-cache";

describe("pending gift/referral account-switch guard", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("does not auto-redeem a signed-out capture after the deep link leaves the URL", () => {
    window.history.replaceState({}, "", "/?gift=GIFT-AAAA");
    capturePendingGiftCode(null);
    window.history.replaceState({}, "", "/home");

    expect(readPendingGiftCodeForUser("uid-b")).toBeNull();
    expect(localStorage.getItem(PENDING_GIFT_KEY)).toBeNull();
  });

  it("redeems a signed-out capture only while ?gift= remains on the page", () => {
    window.history.replaceState({}, "", "/?gift=GIFT-BBBB");
    capturePendingGiftCode(null);
    expect(readPendingGiftCodeForUser("uid-a")).toBe("GIFT-BBBB");
  });

  it("blocks a gift captured for A from auto-redeeming under B", () => {
    window.history.replaceState({}, "", "/?gift=GIFT-CCCC");
    capturePendingGiftCode("uid-a");
    window.history.replaceState({}, "", "/");

    expect(readPendingGiftCodeForUser("uid-b")).toBeNull();
    expect(localStorage.getItem(PENDING_GIFT_KEY)).toBeNull();
  });

  it("allows the capturing uid to redeem after navigation away from ?gift=", () => {
    window.history.replaceState({}, "", "/?gift=GIFT-DDDD");
    capturePendingGiftCode("uid-a");
    window.history.replaceState({}, "", "/billing");

    expect(readPendingGiftCodeForUser("uid-a")).toBe("GIFT-DDDD");
  });

  it("clears pending gift and referral on account-switch session wipe", () => {
    window.history.replaceState({}, "", "/?gift=GIFT-EEEE&ref=REF123");
    capturePendingGiftCode("uid-a");
    capturePendingReferralCode("uid-a");
    expect(localStorage.getItem(PENDING_GIFT_KEY)).toBeTruthy();
    expect(localStorage.getItem(PENDING_REFERRAL_KEY)).toBeTruthy();

    clearUserSessionCaches();

    expect(localStorage.getItem(PENDING_GIFT_KEY)).toBeNull();
    expect(localStorage.getItem(PENDING_REFERRAL_KEY)).toBeNull();
  });

  it("migrates legacy plain-string gift storage as unsigned", () => {
    localStorage.setItem(PENDING_GIFT_KEY, "GIFT-LEGACY");
    window.history.replaceState({}, "", "/");
    expect(readPendingGiftCodeForUser("uid-a")).toBeNull();
    clearPendingGiftCode();
  });

  it("blocks referral captured for A from attributing under B", () => {
    window.history.replaceState({}, "", "/?ref=REF999");
    capturePendingReferralCode("uid-a");
    window.history.replaceState({}, "", "/");
    expect(readPendingReferralCodeForUser("uid-b")).toBeNull();
  });
});
