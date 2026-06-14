import { describe, expect, it } from "vitest";
import { resolveHouseholdSize } from "@/features/nutrition/lib/grocery-household-size";

describe("grocery-household-size", () => {
  it("defaults to 2 adults plus children capped at 8", () => {
    expect(resolveHouseholdSize(0)).toBe(2);
    expect(resolveHouseholdSize(1)).toBe(3);
    expect(resolveHouseholdSize(2)).toBe(4);
    expect(resolveHouseholdSize(6)).toBe(8);
  });
});
