import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetNutritionHubAnalyticsSession,
  trackNutritionHubOpen,
  trackNutritionTabOpen,
  trackTiffinGenerated,
} from "@/features/nutrition/lib/nutrition-hub-analytics";

const queueClientLog = vi.fn();

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: (...args: unknown[]) => queueClientLog(...args),
}));

describe("nutrition-hub-analytics session events", () => {
  beforeEach(() => {
    queueClientLog.mockClear();
    resetNutritionHubAnalyticsSession();
  });

  it("emits nutrition_hub_open with standard payload", () => {
    trackNutritionHubOpen(42);

    expect(queueClientLog).toHaveBeenCalledTimes(1);
    expect(queueClientLog).toHaveBeenCalledWith({
      type: "info",
      message: "[nutrition-hub] nutrition_hub_open",
      meta: { feature: "nutrition_hub", event: "nutrition_hub_open", childId: 42 },
    });
  });

  it("deduplicates nutrition_hub_open within the same session", () => {
    trackNutritionHubOpen(42);
    trackNutritionHubOpen(42);

    expect(queueClientLog).toHaveBeenCalledTimes(1);
  });

  it("emits tab open events for today, plan, track, and family", () => {
    trackNutritionTabOpen("today", 7);
    trackNutritionTabOpen("plan", 7);
    trackNutritionTabOpen("track", 7);
    trackNutritionTabOpen("family", 7);

    expect(queueClientLog).toHaveBeenCalledTimes(4);
    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[nutrition-hub] today_tab_open" }),
    );
    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[nutrition-hub] plan_tab_open" }),
    );
    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[nutrition-hub] track_tab_open" }),
    );
    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[nutrition-hub] family_tab_open" }),
    );
  });

  it("does not emit tab events for learn", () => {
    trackNutritionTabOpen("learn", 7);

    expect(queueClientLog).not.toHaveBeenCalled();
  });

  it("deduplicates the same tab open within the same session", () => {
    trackNutritionTabOpen("plan", 7);
    trackNutritionTabOpen("plan", 7);

    expect(queueClientLog).toHaveBeenCalledTimes(1);
    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[nutrition-hub] plan_tab_open" }),
    );
  });

  it("allows different tabs to each emit once per session", () => {
    trackNutritionTabOpen("today", 7);
    trackNutritionTabOpen("today", 7);
    trackNutritionTabOpen("track", 7);

    expect(queueClientLog).toHaveBeenCalledTimes(2);
  });

  it("emits tiffin_generated with dayCount", () => {
    trackTiffinGenerated(12, 5);

    expect(queueClientLog).toHaveBeenCalledWith({
      type: "info",
      message: "[nutrition-hub] tiffin_generated",
      meta: { feature: "nutrition_hub", event: "tiffin_generated", childId: 12, dayCount: 5 },
    });
  });

  it("deduplicates tiffin_generated within the same session for the same child", () => {
    trackTiffinGenerated(12, 5);
    trackTiffinGenerated(12, 5);

    expect(queueClientLog).toHaveBeenCalledTimes(1);
  });

  it("re-emits after session reset", () => {
    trackNutritionHubOpen(1);
    resetNutritionHubAnalyticsSession();
    trackNutritionHubOpen(1);

    expect(queueClientLog).toHaveBeenCalledTimes(2);
  });
});
