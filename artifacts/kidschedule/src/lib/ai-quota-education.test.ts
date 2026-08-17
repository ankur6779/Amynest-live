import { describe, expect, it } from "vitest";
import {
  AI_QUOTA_COPY,
  aiQuotaUsedRatio,
  resolveAiQuotaEducationState,
  shouldShowAiQuotaEducation,
} from "./ai-quota-education";

describe("ai quota education", () => {
  it("shows remaining education at 70% used for the adult 10/day pool", () => {
    expect(aiQuotaUsedRatio(3, 10)).toBe(0.7);
    expect(shouldShowAiQuotaEducation(3, 10, false)).toBe(true);
    expect(shouldShowAiQuotaEducation(4, 10, false)).toBe(false);
    expect(shouldShowAiQuotaEducation(2, 10, false)).toBe(true);
  });

  it("treats remaining 1 of 3 as education (infant pool)", () => {
    expect(aiQuotaUsedRatio(1, 3)).toBeCloseTo(2 / 3, 5);
    expect(shouldShowAiQuotaEducation(1, 3, false)).toBe(true);
    expect(resolveAiQuotaEducationState(0, 3, false)).toBe("exhausted");
  });

  it("never educates premium or exhausted as education", () => {
    expect(shouldShowAiQuotaEducation(0, 10, false)).toBe(false);
    expect(resolveAiQuotaEducationState(0, 10, false)).toBe("exhausted");
    expect(shouldShowAiQuotaEducation(1, 10, true)).toBe(false);
    expect(resolveAiQuotaEducationState(0, 10, true)).toBe("ok");
  });

  it("parent copy never names ai_query or forces a paywall verb", () => {
    const joined = `${AI_QUOTA_COPY.education} ${AI_QUOTA_COPY.resetHint}`.toLowerCase();
    expect(joined).not.toContain("ai_query");
    expect(joined).not.toMatch(/upgrade now|don't miss|limited time/);
    expect(joined).toMatch(/unlimited amy help|returns tomorrow/);
  });
});
