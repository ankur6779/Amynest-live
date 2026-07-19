import { describe, expect, it } from "vitest";
import { reminderCopyForGap } from "./abacus-reminder-banner";

describe("abacus reminder copy", () => {
  it("returns null when active today", () => {
    expect(reminderCopyForGap(0)).toBeNull();
  });

  it("escalates messaging by gap", () => {
    expect(reminderCopyForGap(1)).toMatch(/waiting/i);
    expect(reminderCopyForGap(3)).toMatch(/streak/i);
    expect(reminderCopyForGap(7)).toMatch(/easier/i);
  });
});
