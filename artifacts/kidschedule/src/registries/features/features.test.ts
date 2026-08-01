import { describe, expect, it } from "vitest";
import {
  V2_FEATURE_REGISTRY,
  assertFeatureRegistryValid,
  getFeatureEntry,
  isHeroEligible,
  listFeaturesByDiscoveryStage,
  listWedgeEligibleFeatures,
  validateFeatureRegistry,
} from "./index";

describe("Feature Registry (S0-T03)", () => {
  it("loads and validates schema", () => {
    expect(V2_FEATURE_REGISTRY.length).toBeGreaterThan(15);
    expect(validateFeatureRegistry()).toEqual([]);
    expect(() => assertFeatureRegistryValid()).not.toThrow();
  });

  it("marks speech as heroEligible / wedgeEligible", () => {
    const speech = getFeatureEntry("speech_coach");
    expect(speech).toBeDefined();
    expect(speech!.discoveryStage).toBe("hero");
    expect(speech!.wedgeEligible).toBe(true);
    expect(isHeroEligible(speech!)).toBe(true);

    const talkingAmy = getFeatureEntry("talking_amy");
    expect(talkingAmy?.wedgeEligible).toBe(true);
    expect(listWedgeEligibleFeatures().map((f) => f.id).sort()).toEqual([
      "speech_coach",
      "talking_amy",
    ]);
  });

  it("keeps Games / Nutrition discoverable (treasury), not hero", () => {
    expect(getFeatureEntry("games")?.discoveryStage).toBe("discoverable");
    expect(getFeatureEntry("nutrition")?.discoveryStage).toBe("discoverable");
    expect(getFeatureEntry("birth_sky")?.discoveryStage).toBe("discoverable");
    expect(getFeatureEntry("games")?.navOwner).toBe("for_child");
    expect(getFeatureEntry("games")?.wedgeEligible).toBe(false);
  });

  it("keeps abacus / spelling / olympiad hidden", () => {
    for (const id of ["abacus", "spelling", "olympiad"] as const) {
      expect(getFeatureEntry(id)?.discoveryStage).toBe("hidden");
      expect(getFeatureEntry(id)?.navOwner).toBe("none");
    }
  });

  it("archives dashboard-as-home experience", () => {
    const dashboard = getFeatureEntry("dashboard_home");
    expect(dashboard?.discoveryStage).toBe("archived");
    expect(listFeaturesByDiscoveryStage("archived").map((f) => f.id)).toContain(
      "dashboard_home",
    );
  });

  it("names treasury shell For [Child], not All Tools", () => {
    const treasury = getFeatureEntry("for_child");
    expect(treasury?.id).toBe("for_child");
    expect(treasury?.navOwner).toBe("for_child");
    expect(treasury?.purpose.toLowerCase()).toContain("treasury");
  });
});
