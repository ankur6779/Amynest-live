import { describe, it, expect } from "vitest";
import {
  buildDayArcSegments,
  buildRevealHighlightChips,
  buildRoutineTrustRibbonSignals,
  buildShareCardMealSummary,
  buildShareCardTimeline,
  extractDinnerFoodChips,
  extractMealOptionPills,
  isDinnerAnchorItem,
  resolveRoutineCategoryVisual,
} from "./routine-detail-premium";

describe("routine-detail-premium", () => {
  it("resolves meal category to amber accent", () => {
    const v = resolveRoutineCategoryVisual("meal", "Breakfast");
    expect(v.badge).toMatch(/amber/);
    expect(v.accentBorder).toMatch(/amber/);
  });

  it("detects dinner anchor", () => {
    expect(isDinnerAnchorItem("meal", "Dinner")).toBe(true);
    expect(isDinnerAnchorItem("meal", "Lunch")).toBe(false);
  });

  it("extracts food chips from options notes", () => {
    const chips = extractDinnerFoodChips({
      notes: "Options: Dal | Roti | Salad",
    });
    expect(chips).toEqual(["Dal", "Roti"]);
  });

  it("builds trust ribbon from items and adaptations", () => {
    const signals = buildRoutineTrustRibbonSignals({
      items: [
        { category: "meal", activity: "Dinner" },
        { category: "sleep", activity: "Lights out" },
      ],
      adaptations: ["Heat-safe evening — outdoor moved after 18:30"],
    });
    expect(signals.some((s) => s.id === "dinner")).toBe(true);
    expect(signals.some((s) => s.id === "bedtime")).toBe(true);
    expect(signals.some((s) => s.id === "weather")).toBe(true);
  });

  it("share card timeline normalizes mixed time formats to 12h", () => {
    const rows = buildShareCardTimeline([
      { time: "16:25", activity: "Outdoor play", duration: 45 },
      { time: "7:00 AM", activity: "Wake up", duration: 20 },
      { time: "21:00", activity: "Lights out", duration: 0 },
    ]);
    expect(rows.map((r) => r.time)).toEqual(["4:25 PM", "7:00 AM", "9:00 PM"]);
    // No AM/PM-less 24h strings should remain in the shared output.
    expect(rows.every((r) => /(AM|PM)$/.test(r.time))).toBe(true);
  });

  it("extracts up to 3 meal option pills", () => {
    const pills = extractMealOptionPills({
      notes: "Options: Dal | Roti | Salad | Rice",
    });
    expect(pills).toEqual(["Dal", "Roti", "Salad"]);
  });

  it("builds day arc with morning, now, and milestone", () => {
    const segments = buildDayArcSegments({
      items: [
        { time: "7:00 AM", activity: "Wake up", category: "morning", status: "completed" },
        { time: "12:30 PM", activity: "Lunch", category: "meal", status: "pending" },
        { time: "7:30 PM", activity: "Dinner", category: "meal", status: "pending" },
        { time: "9:00 PM", activity: "Lights out", category: "sleep", status: "pending" },
      ],
      nowMins: 12 * 60 + 15,
      dateMode: "today",
      currentActivity: "Lunch",
    });
    expect(segments[0]?.label).toBe("Morning complete");
    expect(segments.some((s) => s.label.startsWith("Now:"))).toBe(true);
    expect(segments.some((s) => s.id === "dinner")).toBe(true);
  });

  it("builds reveal chips from adaptations only", () => {
    const chips = buildRevealHighlightChips([
      "UAE heat-safe evening",
      "Hyperactive pace",
      "Weekend mode",
      "Extra unused",
    ]);
    expect(chips).toHaveLength(3);
    expect(chips[0]).toContain("UAE");
  });

  it("builds share meal summary", () => {
    const meals = buildShareCardMealSummary([
      { category: "meal", activity: "Breakfast" },
      { category: "meal", activity: "Lunch" },
      { category: "play", activity: "Park" },
    ]);
    expect(meals).toEqual(["Breakfast", "Lunch"]);
  });
});
