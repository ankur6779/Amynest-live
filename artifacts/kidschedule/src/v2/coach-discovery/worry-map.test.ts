import { describe, expect, it } from "vitest";
import { isCoachDiscoveryEligible, resolveCoachDiscoveryOffer } from "./worry-map";

describe("Coach discovery worry map", () => {
  it("does not earn a card for speech or something_else", () => {
    expect(
      resolveCoachDiscoveryOffer({ worry: "speech_talking", ageBand: "preschool_3_5" }),
    ).toBeNull();
    expect(
      resolveCoachDiscoveryOffer({ worry: "something_else", ageBand: "preschool_3_5" }),
    ).toBeNull();
    expect(isCoachDiscoveryEligible({ worry: "speech_talking" })).toBe(false);
  });

  it("maps behavior → tantrums (toddler category for young ages)", () => {
    const preschool = resolveCoachDiscoveryOffer({
      worry: "behavior",
      ageBand: "preschool_3_5",
    });
    expect(preschool?.goalId).toBe("toddler-tantrums");
    expect(preschool?.challengeLabel).toMatch(/behaviour|tantrum/i);

    const older = resolveCoachDiscoveryOffer({
      worry: "behavior",
      ageBand: "child_6_8",
    });
    expect(older?.goalId).toBe("manage-tantrums");
  });

  it("maps sleep, feeding, learning, mornings", () => {
    expect(
      resolveCoachDiscoveryOffer({ worry: "sleep", ageBand: "preschool_3_5" })
        ?.goalId,
    ).toBe("improve-sleep-patterns");
    expect(
      resolveCoachDiscoveryOffer({ worry: "feeding", ageBand: "preschool_3_5" })
        ?.goalId,
    ).toBe("encourage-independent-eating");
    expect(
      resolveCoachDiscoveryOffer({
        worry: "learning_school",
        ageBand: "child_6_8",
      })?.goalId,
    ).toBe("boost-concentration");
    expect(
      resolveCoachDiscoveryOffer({ worry: "mornings", ageBand: "child_6_8" })
        ?.goalId,
    ).toBe("boost-concentration");
  });
});
