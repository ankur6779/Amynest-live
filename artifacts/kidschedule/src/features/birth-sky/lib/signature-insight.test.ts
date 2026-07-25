import { describe, expect, it } from "vitest";
import { buildCosmicPortrait } from "./signature-insight";

describe("buildCosmicPortrait", () => {
  it("returns a stable signature paragraph for the same chart", () => {
    const a = buildCosmicPortrait({
      childName: "Ankur",
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Virgo",
      daySky: false,
    });
    const b = buildCosmicPortrait({
      childName: "Ankur",
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Virgo",
      daySky: false,
    });
    expect(a.signatureParagraph).toBe(b.signatureParagraph);
    expect(a.qualities).toHaveLength(3);
    expect(a.parentingReminders).toHaveLength(3);
    expect(a.signatureParagraph.toLowerCase()).toContain("ankur");
    expect(a.amyReflection.toLowerCase()).not.toMatch(/will become|destined|fated/);
  });
});
