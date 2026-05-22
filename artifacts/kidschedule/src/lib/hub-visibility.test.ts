import { describe, expect, it } from "vitest";
import {
  checkBandMatch,
  checkMonthRules,
  isHubSectionVisible,
  shouldShowExploreSection,
  shouldBypassHubMonthGates,
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
