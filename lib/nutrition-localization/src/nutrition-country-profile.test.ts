import { describe, expect, it } from "vitest";
import {
  getNutritionCountryProfile,
  resolveNutritionCountryProfile,
  resolveEffectiveFoodStyle,
  getSeasonForProfile,
  normalizeCountryCode,
} from "./nutrition-country-profile";

describe("nutrition-country-profile", () => {
  it("normalizes country aliases", () => {
    expect(normalizeCountryCode("UK")).toBe("GB");
    expect(normalizeCountryCode("United States")).toBe("US");
    expect(normalizeCountryCode("UAE")).toBe("AE");
  });

  it("falls back global not India when country unknown", () => {
    const profile = resolveNutritionCountryProfile({ country: null, region: null, language: "en" });
    expect(profile.country).toBe("GLOBAL");
  });

  it("does not map Hindi UI language to India when country is set", () => {
    const profile = resolveNutritionCountryProfile({ country: "US", language: "hi" });
    expect(profile.country).toBe("US");
    expect(profile.defaultFoodStyle).toBe("western");
  });

  it("does not map hinglish UI language to India when country is unset", () => {
    const profile = resolveNutritionCountryProfile({ country: null, language: "hinglish" });
    expect(profile.country).toBe("GLOBAL");
  });

  it("Singapore December maps to tropical summer", () => {
    const sg = getNutritionCountryProfile("SG");
    expect(sg.seasonModel).toBe("tropical_equatorial");
    expect(getSeasonForProfile(sg, new Date("2026-12-15"))).toBe("summer");
  });

  it("Singapore seasonal tips are tropical not Indian monsoon", () => {
    const sg = getNutritionCountryProfile("SG");
    const tips = sg.seasonalTips.monsoon.join(" ").toLowerCase();
    expect(tips).not.toMatch(/turmeric|khichdi|monsoon appetites/);
    expect(tips).toMatch(/wet season|humid/);
  });

  it("India users keep Indian defaults via country", () => {
    const profile = resolveNutritionCountryProfile({ country: "IN" });
    expect(profile.defaultFoodStyle).toBe("indian");
    expect(profile.portionTerminology).toBe("katori");
  });

  it("resolveEffectiveFoodStyle respects explicit Indian choice globally", () => {
    const us = getNutritionCountryProfile("US");
    expect(resolveEffectiveFoodStyle(us, "north_indian")).toBe("north_indian");
  });
});
