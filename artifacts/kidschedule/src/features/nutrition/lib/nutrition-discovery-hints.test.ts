import { describe, expect, it, beforeEach } from "vitest";
import {
  dismissDiscoveryHint,
  isHintDismissed,
  pickPrimaryDiscoveryHint,
  resolveDiscoveryHints,
} from "@/features/nutrition/lib/nutrition-discovery-hints";

describe("nutrition-discovery-hints", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const baseCtx = {
    activeTab: "plan" as const,
    childId: 1,
    ageGroupId: "school_6_10" as const,
    hasMealPlan: true,
    memoryEntryCount: 0,
    childrenCount: 1,
  };

  it("prioritizes meal memory hint when few entries", () => {
    const hint = pickPrimaryDiscoveryHint(baseCtx);
    expect(hint?.id).toBe("meal_memory");
  });

  it("shows grocery hint on plan when memory exists", () => {
    const hint = pickPrimaryDiscoveryHint({ ...baseCtx, memoryEntryCount: 5 });
    expect(hint?.id).toBe("grocery");
  });

  it("shows caregiver hint on family tab", () => {
    const hints = resolveDiscoveryHints({
      ...baseCtx,
      activeTab: "family",
      memoryEntryCount: 5,
    });
    expect(hints.some((h) => h.id === "caregiver_share")).toBe(true);
  });

  it("respects dismiss persistence", () => {
    dismissDiscoveryHint("grocery", 1);
    expect(isHintDismissed("grocery", 1)).toBe(true);
    const hints = resolveDiscoveryHints({ ...baseCtx, memoryEntryCount: 5 });
    expect(hints.some((h) => h.id === "grocery")).toBe(false);
  });
});
