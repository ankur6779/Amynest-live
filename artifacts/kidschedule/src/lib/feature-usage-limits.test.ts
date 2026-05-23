import { describe, expect, it } from "vitest";
import {
  MAX_FREE_HUB_TILE_OPENS,
  getMaxFreeOpens,
  isFeatureQuotaExhausted,
} from "@/lib/feature-usage-limits";

describe("getMaxFreeOpens", () => {
  it("allows two lifetime opens for Parent Hub tiles", () => {
    expect(getMaxFreeOpens("hub_articles")).toBe(2);
    expect(getMaxFreeOpens("hub_speech")).toBe(2);
    expect(MAX_FREE_HUB_TILE_OPENS).toBe(2);
  });

  it("keeps nutrition and speech sub-sections at one", () => {
    expect(getMaxFreeOpens("nutrition_week_plan")).toBe(1);
    expect(getMaxFreeOpens("nutrition_family_ai")).toBe(1);
    expect(getMaxFreeOpens("hub_speech_dashboard")).toBe(1);
  });
});

describe("isFeatureQuotaExhausted", () => {
  it("locks hub tiles only after two opens", () => {
    expect(isFeatureQuotaExhausted(0, "hub_tips")).toBe(false);
    expect(isFeatureQuotaExhausted(1, "hub_tips")).toBe(false);
    expect(isFeatureQuotaExhausted(2, "hub_tips")).toBe(true);
  });

  it("locks single-use features after one open", () => {
    expect(isFeatureQuotaExhausted(0, "nutrition_week_plan")).toBe(false);
    expect(isFeatureQuotaExhausted(1, "nutrition_week_plan")).toBe(true);
  });
});
