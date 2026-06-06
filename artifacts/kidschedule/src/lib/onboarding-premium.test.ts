import { describe, expect, it } from "vitest";
import {
  buildLiveProfile,
  buildPreviewCards,
  buildWakeAmyMessages,
  getActiveMilestoneIndex,
  getSkipReassuranceKey,
  getValuePreviewKey,
  getTrustFooterMessage,
  getSmartWakeSleepDefaults,
  isSimpleOnboardingProfile,
} from "./onboarding-premium";

const t = ((key: string, opts?: Record<string, string>) => {
  if (opts) {
    return `${key}:${Object.values(opts).join(",")}`;
  }
  return key;
}) as import("i18next").TFunction;

describe("onboarding-premium", () => {
  it("maps steps to milestone indices", () => {
    expect(getActiveMilestoneIndex("child-name")).toBe(1);
    expect(getActiveMilestoneIndex("child-wake")).toBe(2);
    expect(getActiveMilestoneIndex("parent-goals")).toBe(3);
  });

  it("suggests age-based wake and sleep defaults", () => {
    expect(getSmartWakeSleepDefaults(0, 6).wakeLabel).toBe("7:00 AM");
    expect(getSmartWakeSleepDefaults(4, 0).sleepLabel).toBe("9:00 PM");
    expect(getSmartWakeSleepDefaults(8, 0).wakeLabel).toBe("6:30 AM");
  });

  it("builds preview cards when child name is known", () => {
    const cards = buildPreviewCards({ childName: "Aarav", t });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.textKey).toBe("preview_learning_name");
  });

  it("detects simple onboarding profiles", () => {
    expect(
      isSimpleOnboardingProfile({
        childCount: 1,
        ageYears: 4,
        educationStage: "nursery",
        scheduleKnown: false,
      }),
    ).toBe(true);
    expect(
      isSimpleOnboardingProfile({
        childCount: 2,
        ageYears: 4,
        educationStage: "nursery",
      }),
    ).toBe(false);
  });

  it("builds live profile rows as answers accumulate", () => {
    const rows = buildLiveProfile({
      childName: "Aarav",
      ageYears: 4,
      educationStage: "nursery",
      wakeLabel: "7 – 8 AM",
      parentGoal: "Better routines",
      t,
    });
    expect(rows.map((r) => r.id)).toEqual(["age", "stage", "wake", "goal"]);
    expect(rows.find((r) => r.id === "wake")?.text).toContain("7 – 8 AM");
  });

  it("uses child name in trust footer once known", () => {
    const msg = getTrustFooterMessage("child-dob", "Aarav", t);
    expect(msg).toContain("Aarav");
    expect(msg).toContain("trust_child_named");
  });

  it("shows value preview on key personalization steps", () => {
    expect(getValuePreviewKey("child-education-stage")).toBe("value_preview_stage");
    expect(getValuePreviewKey("child-wake")).toBe("value_preview_wake");
    expect(getValuePreviewKey("child-name")).toBeNull();
  });

  it("exposes skip reassurance keys for optional steps", () => {
    expect(getSkipReassuranceKey("child-birthday")).toBe("skip_reassurance_dob");
    expect(getSkipReassuranceKey("child-schedule-known")).toBe("skip_reassurance_schedule");
    expect(getSkipReassuranceKey("parent-allergies")).toBe("skip_reassurance_allergies");
    expect(getSkipReassuranceKey("child-wake")).toBeNull();
  });

  it("includes memory and fast-path hints in wake messages", () => {
    const msgs = buildWakeAmyMessages({
      childName: "Aarav",
      ageYears: 4,
      ageMonths: 0,
      educationStage: "nursery",
      scheduleKnown: false,
      childCount: 1,
      t,
    });
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs.some((m) => m.includes("memory_stage") || m.includes("screens.onboarding.memory_stage"))).toBe(true);
    expect(msgs.some((m) => m.includes("fast_path_hint"))).toBe(true);
  });
});
