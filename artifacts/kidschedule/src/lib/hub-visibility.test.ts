import { describe, expect, it } from "vitest";
import {
  checkBandMatch,
  checkMonthRules,
  isHubSectionVisible,
  shouldShowExploreSection,
  shouldBypassHubMonthGates,
  shouldShowPreviousStageSection,
  getPreviousStageTileIds,
  PREVIOUS_STAGE_INFANT_TILE_IDS,
  isHealthLabPreviewAge,
  isHealthLabEligibleAge,
  HEALTH_LAB_MIN_AGE_MONTHS,
  isGamingHubPreviewAge,
  GAMING_HUB_MIN_AGE_MONTHS,
  isHealthZoneFeature,
  isHealthZoneJourneyEligible,
  shouldApplyHealthZoneJourneyLock,
} from "./hub-visibility";

describe("isHubSectionVisible", () => {
  it("shows infant-hub only below 24 months", () => {
    expect(
      isHubSectionVisible({ id: "infant-hub", bands: ["0-2"] }, "0-2", 12),
    ).toBe(true);
    expect(
      isHubSectionVisible({ id: "infant-hub", bands: ["0-2"] }, "2-4", 30),
    ).toBe(false);
  });

  it("unlocks all non-infant tiles at 24+ months", () => {
    expect(
      isHubSectionVisible(
        { id: "phonics", bands: ["2-4", "4-6"] },
        "10-12",
        120,
      ),
    ).toBe(true);
    expect(
      isHubSectionVisible(
        { id: "speech-coach", bands: ["0-2", "2-4"] },
        "12-15",
        150,
      ),
    ).toBe(true);
  });

  it("keeps infant band + month rules below 24 months", () => {
    expect(
      isHubSectionVisible(
        { id: "phonics", bands: ["2-4", "4-6"] },
        "0-2",
        6,
      ),
    ).toBe(false);
    expect(
      isHubSectionVisible(
        { id: "phonics", bands: ["2-4", "4-6"] },
        "2-4",
        18,
      ),
    ).toBe(true);
    expect(
      isHubSectionVisible(
        { id: "ptm-prep", bands: ["4-6", "6-8"] },
        "2-4",
        18,
      ),
    ).toBe(false);
  });
});

describe("health zone journey gates", () => {
  it("applies journey lock only from 23 months for health zone features", () => {
    expect(isHealthZoneFeature("hub_nutrition")).toBe(true);
    expect(isHealthZoneFeature("hub_health_lab")).toBe(true);
    expect(isHealthZoneFeature("hub_abacus")).toBe(false);
    expect(isHealthZoneJourneyEligible(22)).toBe(false);
    expect(isHealthZoneJourneyEligible(23)).toBe(true);
    expect(shouldApplyHealthZoneJourneyLock("hub_health_lab", 22)).toBe(false);
    expect(shouldApplyHealthZoneJourneyLock("hub_health_lab", 23)).toBe(true);
    expect(shouldApplyHealthZoneJourneyLock("hub_abacus", 30)).toBe(false);
  });
});

describe("health lab age gates", () => {
  it("treats under 23 months as preview", () => {
    expect(isHealthLabPreviewAge(22)).toBe(true);
    expect(isHealthLabPreviewAge(0)).toBe(true);
    expect(isHealthLabPreviewAge(23)).toBe(false);
  });

  it("unlocks full access from 23 months up to max age", () => {
    expect(isHealthLabEligibleAge(22)).toBe(false);
    expect(isHealthLabEligibleAge(23)).toBe(true);
    expect(isHealthLabEligibleAge(155)).toBe(true);
    expect(isHealthLabEligibleAge(156)).toBe(false);
    expect(HEALTH_LAB_MIN_AGE_MONTHS).toBe(23);
  });
});

describe("gaming hub age gates", () => {
  it("treats under 23 months as preview", () => {
    expect(isGamingHubPreviewAge(22)).toBe(true);
    expect(isGamingHubPreviewAge(0)).toBe(true);
    expect(isGamingHubPreviewAge(23)).toBe(false);
    expect(GAMING_HUB_MIN_AGE_MONTHS).toBe(23);
  });
});

describe("checkMonthRules", () => {
  it("bypasses max caps when bypass is true", () => {
    expect(checkMonthRules("speech-coach", 150, true)).toBe(true);
    expect(checkMonthRules("event-prep", 200, true)).toBe(true);
  });
});

describe("shouldShowExploreSection", () => {
  it("is off at 24+ months", () => {
    expect(shouldShowExploreSection(24, "2-4", "4-6")).toBe(false);
    expect(shouldShowExploreSection(12, "0-2", "2-4")).toBe(true);
  });
});

describe("shouldBypassHubMonthGates", () => {
  it("matches explore section visibility", () => {
    expect(shouldBypassHubMonthGates(12, "0-2", "2-4")).toBe(true);
    expect(shouldBypassHubMonthGates(24, "2-4", "4-6")).toBe(false);
  });
});

describe("checkBandMatch", () => {
  it("treats alwaysCurrent as matching any band", () => {
    expect(checkBandMatch({ id: "amy-ai", alwaysCurrent: true }, "12-15")).toBe(
      true,
    );
  });
});

describe("shouldShowPreviousStageSection", () => {
  it("is on for 2+ parents outside band 0-2", () => {
    expect(shouldShowPreviousStageSection(30, "2-4")).toBe(true);
    expect(shouldShowPreviousStageSection(48, "4-6")).toBe(true);
  });

  it("is off for infants and band 0-2", () => {
    expect(shouldShowPreviousStageSection(12, "0-2")).toBe(false);
    expect(shouldShowPreviousStageSection(24, "0-2")).toBe(false);
  });
});

describe("getPreviousStageTileIds", () => {
  const mockSections = [
    { id: "infant-hub", bands: ["0-2"] as const },
    { id: "new-parent-tips", alwaysCurrent: true },
    { id: "story-hub", bands: ["0-2", "2-4", "4-6", "6-8"] as const },
    { id: "phonics", bands: ["2-4", "4-6"] as const },
  ];

  it("includes infant-only tiles for a 2-4 band child", () => {
    const ids = getPreviousStageTileIds(mockSections, "2-4", 30);
    expect(ids).toContain("infant-hub");
    expect(ids).toContain("new-parent-tips");
    expect(ids).not.toContain("story-hub");
    expect(ids).not.toContain("phonics");
  });

  it("returns empty below 24 months", () => {
    expect(getPreviousStageTileIds(mockSections, "0-2", 12)).toEqual([]);
  });

  it("lists curated infant tile ids", () => {
    expect(PREVIOUS_STAGE_INFANT_TILE_IDS).toContain("infant-hub");
    expect(PREVIOUS_STAGE_INFANT_TILE_IDS).toContain("new-parent-tips");
  });
});
