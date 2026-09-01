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
    localStorage.setItem(
      "amynest:learning-sync:v1:uid-a",
      JSON.stringify({
        queue: [{ clientId: "x", childId: 1, activityId: "a", section: "phonics", correct: true, at: "t", attempts: 0, nextAttemptAt: 0 }],
        recent: [],
        diag: {},
      }),
    );

    clearUserSessionCaches();

    expect(readOnboardingCache().onboardingComplete).toBe(false);
    expect(readCachedChildrenList()).toBeUndefined();
    expect(localStorage.getItem("amynest:hub:activeChildId")).toBeNull();
    // Per-user learning queue must survive account switch so pending XP is not burned.
    expect(localStorage.getItem("amynest:learning-sync:v1:uid-a")).toContain("phonics");
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
});
