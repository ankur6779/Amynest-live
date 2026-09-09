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
    expect(next.title.toLowerCase()).toContain("plan for today");
    expect(next.basedOn.some((b) => /5-7 stage/i.test(b))).toBe(true);
    expect(next.basedOn.some((b) => /direction/i.test(b))).toBe(true);
    expect(next.basedOn.join(" ")).not.toMatch(/Local time|Age band you shared|Based on|Generated/i);
    expect(next.id).toBe("school-morning-launch");
    expect(next.blocks.length).toBeGreaterThanOrEqual(4);
    expect(next.blocks.length).toBeLessThanOrEqual(6);
    expect(next.blocks[0]?.id).toBe("school-morning-launch");
    expect(next.blocks.every((b) => b.title.toLowerCase().includes("noah"))).toBe(true);
    expect(next.blocks.map((b) => b.kind)).toEqual(
      expect.arrayContaining(["morning", "learning", "movement", "hard_moment", "bedtime"]),
    );
  });

  it("does not invent a child name when blank", () => {
    const next = decideFirstExperienceNextThing({
      childName: "   ",
      ageBand: "0-2",
      todayContext: "home",
      now: new Date("2026-08-06T20:00:00"),
    });
    expect(next.title.toLowerCase()).toContain("your child");
    expect(next.blocks.length).toBeGreaterThanOrEqual(4);
    expect(next.blocks.some((b) => b.kind === "sleep" || b.kind === "feeding")).toBe(true);
  });

  it("personalizes preschool school-morning leave-ready as the first block", () => {
    const next = decideFirstExperienceNextThing({
      childName: "Aria",
      ageBand: "2-4",
      todayContext: "school",
      now: new Date("2026-08-06T07:30:00"),
    });
    expect(next.id).toBe("preschool-leave-ready");
    expect(next.blocks[0]?.title.toLowerCase()).toContain("aria");
    expect(next.blocks.some((b) => b.surface === "amy")).toBe(true);
  });

  it("applies a selected focus without inventing new engines", () => {
    const next = decideFirstExperienceNextThing({
      childName: "Noah",
      ageBand: "5-7",
      todayContext: "home",
      focusGoal: "improve_focus",
      now: new Date("2026-08-06T10:00:00"),
    });
    expect(next.basedOn.some((b) => /focus/i.test(b))).toBe(true);
    const learning = next.blocks.find((b) => b.kind === "learning");
    expect(learning?.detail.toLowerCase()).toMatch(/focus/);
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
