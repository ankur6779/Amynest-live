import { describe, it, expect, beforeEach } from "vitest";
import {
  LEGACY_BOOLEAN_UPDATED_AT,
  clearAllInfantMilestoneProgressStorage,
  legacyMilestoneProgressKey,
  loadMilestoneProgress,
  milestoneProgressKey,
  saveMilestoneProgress,
} from "@/lib/infant-milestone-progress";
import { clearUserSessionCaches } from "@/lib/user-session-cache";

describe("infant milestone progress storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates name-keyed legacy once and deletes the legacy key", () => {
    const childId = 42;
    const name = "Aarav";
    localStorage.setItem(
      legacyMilestoneProgressKey(name),
      JSON.stringify({
        b03_head_lift: { state: "achieved", updatedAt: 1_700_000_000_000 },
      }),
    );

    const loaded = loadMilestoneProgress(childId, name);
    expect(loaded.b03_head_lift?.state).toBe("achieved");
    expect(localStorage.getItem(milestoneProgressKey(childId))).toBeTruthy();
    expect(localStorage.getItem(legacyMilestoneProgressKey(name))).toBeNull();
  });

  it("does not let a second account inherit leftover legacy name progress", () => {
    const name = "Aarav";
    localStorage.setItem(
      legacyMilestoneProgressKey(name),
      JSON.stringify({
        b03_social_smile: { state: "achieved", updatedAt: 1_700_000_000_000 },
      }),
    );

    // First child (account A) adopts and clears legacy.
    loadMilestoneProgress(11, name);
    expect(localStorage.getItem(legacyMilestoneProgressKey(name))).toBeNull();

    // Second child (account B, same name) must start empty — no legacy left to steal.
    const other = loadMilestoneProgress(99, name);
    expect(other).toEqual({});
  });

  it("stamps boolean legacy rows with epoch 0 so server LWW wins", () => {
    const childId = 7;
    localStorage.setItem(
      milestoneProgressKey(childId),
      JSON.stringify({
        m0_lift_head: true,
        m0_coo: false,
      }),
    );

    const loaded = loadMilestoneProgress(childId);
    expect(loaded.b03_head_lift).toEqual({
      state: "achieved",
      updatedAt: LEGACY_BOOLEAN_UPDATED_AT,
    });
    expect(loaded.b03_coo).toEqual({
      state: "not_started",
      updatedAt: LEGACY_BOOLEAN_UPDATED_AT,
    });
    // Remains below any real server timestamp so mount sync will not overwrite peers.
    expect(LEGACY_BOOLEAN_UPDATED_AT).toBe(0);
  });

  it("clearAllInfantMilestoneProgressStorage removes child and legacy keys only", () => {
    localStorage.setItem(milestoneProgressKey(1), "{}");
    localStorage.setItem(legacyMilestoneProgressKey("Aarav"), "{}");
    localStorage.setItem("amynest:milestones_reached", "keep");
    localStorage.setItem("amynest:device:id:v1", "install");

    clearAllInfantMilestoneProgressStorage();

    expect(localStorage.getItem(milestoneProgressKey(1))).toBeNull();
    expect(localStorage.getItem(legacyMilestoneProgressKey("Aarav"))).toBeNull();
    expect(localStorage.getItem("amynest:milestones_reached")).toBe("keep");
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install");
  });

  it("clearUserSessionCaches wipes milestone leftovers on account switch", () => {
    saveMilestoneProgress(5, {
      b03_head_lift: { state: "achieved", updatedAt: 123 },
    });
    localStorage.setItem(legacyMilestoneProgressKey("Aarav"), "{}");
    localStorage.setItem("amynest:device:id:v1", "install-device-keep");

    clearUserSessionCaches();

    expect(localStorage.getItem(milestoneProgressKey(5))).toBeNull();
    expect(localStorage.getItem(legacyMilestoneProgressKey("Aarav"))).toBeNull();
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install-device-keep");
  });
});
