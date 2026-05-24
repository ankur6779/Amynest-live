import { describe, expect, it } from "vitest";
import {
  MAX_FREE_HUB_TILE_OPENS,
  SPEECH_COACH_SESSION_FEATURE,
  getMaxFreeOpens,
  isFeatureQuotaExhausted,
} from "@/lib/feature-usage-limits";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";

describe("getMaxFreeOpens", () => {
  it("allows two lifetime opens for Parent Hub tiles", () => {
    expect(getMaxFreeOpens("hub_articles")).toBe(2);
    expect(getMaxFreeOpens("hub_speech")).toBe(2);
    expect(MAX_FREE_HUB_TILE_OPENS).toBe(2);
  });

  it("allows three shared Speech Coach sessions", () => {
    expect(getMaxFreeOpens(SPEECH_COACH_SESSION_FEATURE)).toBe(
      HUB_CONTENT_QUOTAS.speechCoachSessions,
    );
    expect(getMaxFreeOpens("hub_speech_pronounce")).toBe(3);
  });

  it("keeps nutrition at one lifetime use", () => {
    expect(getMaxFreeOpens("nutrition_week_plan")).toBe(1);
    expect(getMaxFreeOpens("nutrition_family_ai")).toBe(1);
  });
});

describe("isFeatureQuotaExhausted", () => {
  it("locks hub tiles only after two opens", () => {
    expect(isFeatureQuotaExhausted(0, "hub_tips")).toBe(false);
    expect(isFeatureQuotaExhausted(1, "hub_tips")).toBe(false);
    expect(isFeatureQuotaExhausted(2, "hub_tips")).toBe(true);
  });

  it("locks speech sessions after three uses", () => {
    expect(isFeatureQuotaExhausted(2, SPEECH_COACH_SESSION_FEATURE)).toBe(false);
    expect(isFeatureQuotaExhausted(3, SPEECH_COACH_SESSION_FEATURE)).toBe(true);
  });

  it("locks single-use features after one open", () => {
    expect(isFeatureQuotaExhausted(0, "nutrition_week_plan")).toBe(false);
    expect(isFeatureQuotaExhausted(1, "nutrition_week_plan")).toBe(true);
  });
});
