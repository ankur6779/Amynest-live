import { describe, it, expect, beforeEach } from "vitest";
import {
  clearUserSessionCaches,
  persistStoredSessionUid,
  readStoredSessionUid,
} from "@/lib/user-session-cache";
import { readOnboardingCache } from "@/lib/setup-status";
import { readCachedChildrenList } from "@/lib/dashboard-data-cache";

describe("clearUserSessionCaches", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears onboarding and dashboard children cache after account reset", () => {
    localStorage.setItem("onboardingComplete", "true");
    localStorage.setItem("amynest:dashboard:children:v1", JSON.stringify([{ id: 1, name: "A", age: 5 }]));
    localStorage.setItem("amynest:hub:activeChildId", "1");

    clearUserSessionCaches();

    expect(readOnboardingCache().onboardingComplete).toBe(false);
    expect(readCachedChildrenList()).toBeUndefined();
    expect(localStorage.getItem("amynest:hub:activeChildId")).toBeNull();
  });

  it("tracks session uid across logins on the same device", () => {
    persistStoredSessionUid("uid-a");
    expect(readStoredSessionUid()).toBe("uid-a");
    persistStoredSessionUid("uid-b");
    expect(readStoredSessionUid()).toBe("uid-b");
    clearUserSessionCaches();
    expect(readStoredSessionUid()).toBeNull();
  });

  it("does not delete the installation device id", () => {
    localStorage.setItem("amynest:device:id:v1", "install-device-keep");
    clearUserSessionCaches();
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install-device-keep");
  });

  it("clears pending gift and referral deep-link codes", () => {
    localStorage.setItem("amynest_pending_gift_code", JSON.stringify({ code: "GIFT-X", capturedForUid: "a" }));
    localStorage.setItem("amynest_pending_referral_code", JSON.stringify({ code: "REF-X", capturedForUid: "a" }));
    clearUserSessionCaches();
    expect(localStorage.getItem("amynest_pending_gift_code")).toBeNull();
    expect(localStorage.getItem("amynest_pending_referral_code")).toBeNull();
  });
});
