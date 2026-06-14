import { describe, expect, it } from "vitest";
import {
  resolveLwwWinner,
  shouldApplyServerToLocal,
  shouldPushLocalToServer,
} from "@/features/nutrition/lib/nutrition-sync-merge";

describe("nutrition-sync-merge LWW rules", () => {
  it("local wins when strictly newer", () => {
    expect(resolveLwwWinner(5000, 4000)).toBe("local");
    expect(shouldPushLocalToServer(5000, 4000, true)).toBe(true);
    expect(shouldApplyServerToLocal(5000, 4000, true)).toBe(false);
  });

  it("server wins when newer or equal (deterministic tie-break)", () => {
    expect(resolveLwwWinner(4000, 5000)).toBe("server");
    expect(resolveLwwWinner(5000, 5000)).toBe("server");
    expect(shouldApplyServerToLocal(4000, 5000, true)).toBe(true);
    expect(shouldApplyServerToLocal(5000, 5000, true)).toBe(true);
  });

  it("does not push empty local checklist", () => {
    expect(shouldPushLocalToServer(9000, 1000, false)).toBe(false);
  });

  it("does not apply empty server checklist", () => {
    expect(shouldApplyServerToLocal(0, 9000, false)).toBe(false);
  });
});
