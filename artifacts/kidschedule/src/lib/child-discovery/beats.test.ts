import { describe, expect, it } from "vitest";
import { buildBeatOrder } from "./beats";

describe("discovery beat order", () => {
  it("skips rhythm confirm — wake/sleep are inferred for the first plan", () => {
    const order = buildBeatOrder({
      hasCountry: true,
      hasName: false,
      hasAge: false,
      todayContext: "home",
      years: 5,
      months: 0,
      rhythmConfirmed: false,
      focusResolved: false,
    });
    expect(order).not.toContain("rhythm");
    expect(order).toEqual([
      "arrival",
      "child-name",
      "child-age",
      "focus",
      "earned",
      "saving",
      "done",
    ]);
  });

  it("still asks infant feeding and sleep when they change today's plan", () => {
    const order = buildBeatOrder({
      hasCountry: true,
      hasName: true,
      hasAge: true,
      todayContext: "home",
      years: 0,
      months: 8,
      feedingType: null,
      sleepPattern: null,
      rhythmConfirmed: false,
      focusResolved: true,
    });
    expect(order).toContain("infant-feeding");
    expect(order).toContain("infant-sleep");
    expect(order).not.toContain("rhythm");
  });
});
