import { describe, expect, it } from "vitest";
import {
  isNutritionLivingV1Enabled,
  isNutritionQuietTab,
  NUTRITION_QUIET_PATHS,
  NUTRITION_QUIET_TABS,
  recommendNutritionAction,
} from "./living-room";

describe("nutrition living-room", () => {
  it("exposes five quiet Care paths", () => {
    expect(NUTRITION_QUIET_PATHS).toHaveLength(5);
    expect(NUTRITION_QUIET_TABS).toEqual([
      "today",
      "plan",
      "learn",
      "track",
      "family",
    ]);
  });

  it("guards quiet tabs for deepen hierarchy", () => {
    expect(isNutritionQuietTab("today")).toBe(true);
    expect(isNutritionQuietTab("grocery")).toBe(false);
  });

  it("recommends tonight's meal in the evening", () => {
    const r = recommendNutritionAction(18);
    expect(r.tab).toBe("today");
    expect(r.title).toBe("Tonight's meal");
  });

  it("recommends today's meal in the morning", () => {
    const r = recommendNutritionAction(8);
    expect(r.tab).toBe("today");
    expect(r.title).toBe("Today's meal");
  });

  it("recommends week plan mid-day", () => {
    const r = recommendNutritionAction(13);
    expect(r.tab).toBe("plan");
  });

  it("living flag defaults ON", () => {
    expect(isNutritionLivingV1Enabled()).toBe(true);
  });
});
