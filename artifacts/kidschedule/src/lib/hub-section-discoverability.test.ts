import { describe, expect, it, beforeEach } from "vitest";
import {
  buildHubSectionPreviewDisplay,
  getHubDaypart,
  pickHubSectionHighlight,
  pickPrimaryHubSectionKey,
} from "@/lib/hub-section-discoverability";
import {
  clearHubSectionVisitsForTests,
  recordHubSectionVisit,
} from "@/lib/hub-section-visit-tracker";

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts && "count" in opts) return `${opts.count} ${key.split(".").pop()}`;
  return key;
}) as never;

const GROUP_KEYS = [
  "today",
  "learning",
  "creativity",
  "stories",
  "health",
  "parent",
  "support",
] as const;

describe("hub-section-discoverability", () => {
  beforeEach(() => {
    clearHubSectionVisitsForTests();
  });

  it("picks morning learning as primary without routine", () => {
    expect(pickPrimaryHubSectionKey("morning", false)).toBe("learning");
    expect(pickPrimaryHubSectionKey("morning", true)).toBe("today");
  });

  it("highlights last visited section as continue within 48h", () => {
    recordHubSectionVisit(1, "stories");
    const pick = pickHubSectionHighlight({
      childId: 1,
      groupKeys: GROUP_KEYS,
      hasTodayRoutine: false,
      learningSessionPending: false,
    });
    expect(pick).toEqual({ key: "stories", kind: "continue" });
  });

  it("builds dynamic learning subtitle with count and labels", () => {
    const preview = buildHubSectionPreviewDisplay({
      childId: 1,
      groupKey: "learning",
      groupKeys: GROUP_KEYS,
      visibleTileIds: ["phonics", "smart-math-tricks", "abacus"],
      hasTodayRoutine: false,
      learningSessionPending: false,
      recommendationCount: 0,
      t,
      daypart: getHubDaypart(new Date("2026-07-05T09:00:00")),
      primaryKey: "learning",
      highlight: null,
    });
    expect(preview.subtitle).toContain("activities");
    expect(preview.subtitle).toContain("Phonics");
    expect(preview.isPrimary).toBe(true);
  });
});
