import { describe, expect, it } from "vitest";
import { buildShortBranchChildDraft } from "./onboarding-short-branch";

const t = ((key: string, opts?: { years?: string }) => {
  if (key === "screens.onboarding.age_reply_years" && opts?.years) {
    return `${opts.years} years`;
  }
  return key;
}) as never;

describe("buildShortBranchChildDraft", () => {
  it("builds an at-home child with smart wake/sleep defaults", () => {
    const { child, reply } = buildShortBranchChildDraft({
      name: "Aarav",
      years: 4,
      months: 0,
      countryCode: "IN",
      t,
    });

    expect(child.name).toBe("Aarav");
    expect(child.educationStage).toBe("at_home");
    expect(child.wakeUpTime).toBeTruthy();
    expect(child.sleepTime).toBeTruthy();
    expect(child.isSchoolGoing).toBe(false);
    expect(reply).toContain("4");
  });

  it("adds infant defaults under 24 months", () => {
    const { child } = buildShortBranchChildDraft({
      name: "Baby",
      years: 0,
      months: 8,
      countryCode: "IN",
      t,
    });

    expect(child.ageGroup).toBe("infant");
    expect(child.feedingType).toBe("mixed");
    expect(child.sleepPattern).toBe("irregular");
  });
});
