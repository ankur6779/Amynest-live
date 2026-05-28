import { describe, expect, it } from "vitest";
import { buildFamilyIntelligenceSurface } from "./family-intelligence-surface";

describe("buildFamilyIntelligenceSurface", () => {
  it("surfaces memory from recent family days", () => {
    const surface = buildFamilyIntelligenceSurface([
      "Amy is building on 4 recent days with your family - familiar anchors stay, with small refreshes.",
      "Daily rhythm looks steadier - Amy is keeping familiar anchors while refreshing activities.",
    ]);

    expect(surface?.signals[0]).toMatchObject({
      id: "remembers",
      label: "Amy remembers your rhythm",
    });
    expect(surface?.signals[0]?.detail).toContain("4 recent family days");
  });

  it("frames difficult days with gentle support", () => {
    const surface = buildFamilyIntelligenceSurface(
      ["Energy has been mixed - Amy front-loaded recovery-friendly pacing for today."],
      { mood: "lazy" },
    );

    const support = surface?.signals.find((signal) => signal.id === "supports");
    expect(support?.label).toBe("Hard days are handled gently");
    expect(support?.detail).toContain("softens pacing");
  });

  it("hides when there is no visible intelligence", () => {
    expect(buildFamilyIntelligenceSurface([])).toBeNull();
  });
});
