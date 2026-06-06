import { describe, it, expect } from "vitest";
import { infantFormNormalizationPatches } from "@/lib/child-form-hydration";

/**
 * Regression: infant profile edits must not call setValue when values are already
 * normalized — unconditional setValue + form.watch caused "Maximum update depth"
 * on /children/:id (commits 4086c81c, 38ebddca).
 */
describe("child form infant normalization", () => {
  it("skips educationStage setValue when already at_home", () => {
    expect(
      infantFormNormalizationPatches(true, {
        educationStage: "at_home",
        scheduleKnown: false,
      }),
    ).toBeNull();
  });

  it("sets educationStage only when infant profile still has school stage", () => {
    expect(
      infantFormNormalizationPatches(true, {
        educationStage: "school",
        scheduleKnown: true,
      }),
    ).toEqual({ educationStage: "at_home", scheduleKnown: false });
  });

  it("does not patch non-infant profiles", () => {
    expect(
      infantFormNormalizationPatches(false, {
        educationStage: "school",
        scheduleKnown: true,
      }),
    ).toBeNull();
  });
});
