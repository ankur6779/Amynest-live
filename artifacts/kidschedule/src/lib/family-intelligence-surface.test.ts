import { describe, expect, it } from "vitest";
import {
  buildFamilyIntelligenceSurface,
  buildLearningPhaseSurface,
  pickRoutineForIntelligence,
  resolveFamilyIntelligenceSurface,
} from "./family-intelligence-surface";

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
    expect(surface?.headline).toContain("Amy remembers your rhythm");
  });

  it("frames difficult days with gentle support for generate mood", () => {
    const surface = buildFamilyIntelligenceSurface(
      ["Energy has been mixed - Amy front-loaded recovery-friendly pacing for today."],
      { mood: "lazy" },
    );

    const support = surface?.signals.find((signal) => signal.id === "supports");
    expect(support?.label).toBe("Hard days are handled gently");
    expect(support?.detail).toMatch(/gentler|recovery/i);
  });

  it("maps adaptive low mood on routine detail", () => {
    const surface = buildFamilyIntelligenceSurface(["School day — activities planned around your child's school hours."], {
      mood: "low",
    });

    const support = surface?.signals.find((signal) => signal.id === "supports");
    expect(support?.detail).toMatch(/gently|soft/i);
  });

  it("weaves energy profile into adaptation signal when enough samples exist", () => {
    const surface = buildFamilyIntelligenceSurface(["School day — activities planned around your child's school hours."], {
      energyProfile: { peakFocusStart: "09:00", peakFocusEnd: "11:00", sampleCount: 4 },
    });

    const adapt = surface?.signals.find((signal) => signal.id === "adapts");
    expect(adapt?.detail).toContain("09:00–11:00");
  });

  it("hides when there is no visible intelligence", () => {
    expect(buildFamilyIntelligenceSurface([])).toBeNull();
  });
});

describe("pickRoutineForIntelligence", () => {
  it("prefers today's routine over older dated routines", () => {
    const today = "2026-05-28";
    const picked = pickRoutineForIntelligence(
      [
        { id: 1, date: "2026-05-20", adaptations: ["Older plan"] },
        { id: 2, date: today, adaptations: ["Today's plan"] },
      ],
      today,
    );
    expect(picked?.id).toBe(2);
  });
});

describe("resolveFamilyIntelligenceSurface", () => {
  it("falls back to learning phase when routines exist without adaptations", () => {
    const surface = resolveFamilyIntelligenceSurface({
      routines: [{ id: 1, date: "2026-05-28", adaptations: [] }],
    });
    expect(surface?.signals[0]?.label).toBe("Amy is learning your family");
  });

  it("builds learning phase surface standalone", () => {
    const surface = buildLearningPhaseSurface();
    expect(surface.signals).toHaveLength(3);
    expect(surface.headline.length).toBeGreaterThan(10);
  });
});
