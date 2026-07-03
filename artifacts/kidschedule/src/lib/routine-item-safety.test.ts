import { describe, it, expect } from "vitest";
import {
  buildEmergencyRoutineFallback,
  safeSimplifyForHandler,
  sanitizeRoutineItems,
} from "./routine-item-safety";

describe("sanitizeRoutineItems", () => {
  it("drops invalid rows and coerces required fields", () => {
    const out = sanitizeRoutineItems([
      null,
      { activity: "Breakfast", time: "8:00 AM", duration: 20, category: "meal" },
      { activity: "", time: "9:00 AM" },
      { activity: "Play", duration: "45" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].activity).toBe("Breakfast");
    expect(out[1].duration).toBe(45);
    expect(out[1].time).toBe("9:00 AM");
  });
});

describe("safeSimplifyForHandler", () => {
  it("never throws on malformed items", () => {
    const out = safeSimplifyForHandler(
      [{ activity: "Breakfast", time: "bad-time", duration: 10, category: "meal" }],
      "grandparent",
    );
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("buildEmergencyRoutineFallback", () => {
  it("returns a full-day backup schedule", () => {
    const out = buildEmergencyRoutineFallback("Ava");
    expect(out.length).toBeGreaterThanOrEqual(5);
    expect(out.some((i) => i.activity.includes("Ava"))).toBe(true);
  });
});
