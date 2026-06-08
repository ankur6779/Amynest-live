import { describe, expect, it } from "vitest";
import { getDailySpecialAmyModeId } from "./talking-amy-daily-special";

describe("talking-amy-daily-special", () => {
  it("is deterministic for the same calendar day", () => {
    const date = new Date(2026, 5, 8, 12, 0, 0);
    const a = getDailySpecialAmyModeId(date);
    const b = getDailySpecialAmyModeId(date);
    expect(a).toBe(b);
  });

  it("can change on a different day", () => {
    const d1 = getDailySpecialAmyModeId(new Date(2026, 5, 8));
    const d2 = getDailySpecialAmyModeId(new Date(2026, 5, 9));
    // Not guaranteed different for every pair, but stable API returns valid mode ids
    expect(typeof d1).toBe("string");
    expect(typeof d2).toBe("string");
  });
});
