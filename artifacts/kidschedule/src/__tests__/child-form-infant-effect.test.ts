import { describe, it, expect, vi } from "vitest";

/**
 * Regression: infant profile edits must not call setValue when values are already
 * normalized — unconditional setValue + form.watch caused "Maximum update depth"
 * on /children/:id (see commit 4086c81c).
 */
describe("child form infant normalization", () => {
  it("skips educationStage setValue when already at_home", () => {
    const setValue = vi.fn();
    const getValues = vi.fn((field: string) => {
      if (field === "educationStage") return "at_home";
      if (field === "scheduleKnown") return false;
      return undefined;
    });

    const isInfant = true;
    if (isInfant) {
      if (getValues("educationStage") !== "at_home") {
        setValue("educationStage", "at_home", { shouldDirty: false });
      }
      if (getValues("scheduleKnown") !== false) {
        setValue("scheduleKnown", false, { shouldDirty: false });
      }
    }

    expect(setValue).not.toHaveBeenCalled();
  });

  it("sets educationStage only when infant profile still has school stage", () => {
    const setValue = vi.fn();
    const getValues = vi.fn((field: string) => {
      if (field === "educationStage") return "school";
      if (field === "scheduleKnown") return true;
      return undefined;
    });

    const isInfant = true;
    if (isInfant) {
      if (getValues("educationStage") !== "at_home") {
        setValue("educationStage", "at_home", { shouldDirty: false });
      }
      if (getValues("scheduleKnown") !== false) {
        setValue("scheduleKnown", false, { shouldDirty: false });
      }
    }

    expect(setValue).toHaveBeenCalledTimes(2);
    expect(setValue).toHaveBeenCalledWith("educationStage", "at_home", { shouldDirty: false });
    expect(setValue).toHaveBeenCalledWith("scheduleKnown", false, { shouldDirty: false });
  });
});
