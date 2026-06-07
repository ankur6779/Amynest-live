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
});
