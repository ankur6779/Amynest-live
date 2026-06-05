import { describe, it, expect } from "vitest";
import {
  buildTimelineRenderEntries,
  getPinnedTimelineIndices,
} from "./routine-timeline-collapse";

const sampleItems = Array.from({ length: 12 }, (_, i) => ({
  time: i < 4 ? `${7 + i}:00 AM` : i < 8 ? `${12 + (i - 4)}:00 PM` : `${6 + (i - 8)}:30 PM`,
  activity: `Activity ${i + 1}`,
  category: i === 10 ? "meal" : i === 11 ? "sleep" : "play",
  status: "pending" as const,
}));

sampleItems[10] = { time: "7:00 PM", activity: "Dinner", category: "meal", status: "pending" };
sampleItems[11] = { time: "9:00 PM", activity: "Lights out", category: "sleep", status: "pending" };

describe("routine-timeline-collapse", () => {
  it("pins dinner, bedtime, current, and next pending items", () => {
    const pinned = getPinnedTimelineIndices(sampleItems, 2, 3);
    expect(pinned.has(2)).toBe(true);
    expect(pinned.has(3)).toBe(true);
    expect(pinned.has(10)).toBe(true);
    expect(pinned.has(11)).toBe(true);
  });

  it("collapses middle items when routine is long", () => {
    const displayItems = sampleItems.map((item, origIdx) => ({ item, origIdx }));
    const entries = buildTimelineRenderEntries({
      allItems: sampleItems,
      displayItems,
      currentIndex: 2,
      nextUpIndex: 3,
      fullyExpanded: false,
    });
    expect(entries.some((e) => e.kind === "collapse")).toBe(true);
    expect(entries.filter((e) => e.kind === "item").length).toBeLessThan(12);
  });

  it("shows all items when expanded", () => {
    const displayItems = sampleItems.map((item, origIdx) => ({ item, origIdx }));
    const entries = buildTimelineRenderEntries({
      allItems: sampleItems,
      displayItems,
      currentIndex: 2,
      nextUpIndex: 3,
      fullyExpanded: true,
    });
    expect(entries).toHaveLength(12);
    expect(entries.every((e) => e.kind === "item")).toBe(true);
  });
});
