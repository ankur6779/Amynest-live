import { describe, expect, it } from "vitest";
import { buildWorkingSignals, decideFirstExperienceNextThing } from "./decide-next";

describe("decideFirstExperienceNextThing", () => {
  it("uses only provided signals and local clock — school morning for 5–7", () => {
    const now = new Date("2026-08-06T07:15:00");
    const next = decideFirstExperienceNextThing({
      childName: "Noah",
      ageBand: "5-7",
      todayContext: "school",
      now,
    });
    expect(next.title.toLowerCase()).toContain("noah");
    expect(next.basedOn.some((b) => b.includes("5-7"))).toBe(true);
    expect(next.basedOn.some((b) => /school/i.test(b))).toBe(true);
    expect(next.id).toBe("school-morning-launch");
  });

  it("does not invent a child name when blank", () => {
    const next = decideFirstExperienceNextThing({
      childName: "   ",
      ageBand: "0-2",
      todayContext: "home",
      now: new Date("2026-08-06T20:00:00"),
    });
    expect(next.title.toLowerCase()).toContain("your child");
  });

  it("buildWorkingSignals stays factual observations — never engineering status", () => {
    const lines = buildWorkingSignals({
      childName: "Aria",
      ageBand: "2-4",
      todayContext: "unsure",
      now: new Date("2026-08-06T15:00:00"),
    });
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.join(" ")).toMatch(/Aria/);
    expect(lines.join(" ")).toMatch(/2-4 stage/);
    expect(lines.join(" ")).toMatch(/Morning has settled into the house/i);
    expect(lines.join(" ")).toMatch(/still open/i);
    expect(lines.join(" ")).not.toMatch(/I understand/i);
    expect(lines.join(" ")).not.toMatch(/\bUsing\b/i);
    expect(lines.join(" ")).not.toMatch(/The clock reads/i);
    expect(lines.join(" ")).not.toMatch(/early evening/i);
    expect(lines.some((l) => /comes into focus/i.test(l))).toBe(true);
  });
});
