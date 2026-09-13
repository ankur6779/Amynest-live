import { describe, expect, it } from "vitest";
import { buildTodayCarePaths, homeDoorIdsForAge } from "./care-paths";

describe("age-aware Home care paths", () => {
  it("hides the launchpad before a plan exists", () => {
    expect(homeDoorIdsForAge("infant", 6, "before_plan")).toEqual([]);
    expect(buildTodayCarePaths({ stage: "before_plan", ageYears: 4 }).map((p) => p.id)).toEqual(
      [],
    );
  });

  it("gives infants Care + Amy + Speech after the plan is visible", () => {
    const ids = homeDoorIdsForAge("infant", 6, "plan_visible");
    expect(ids).toEqual(["routines", "amy", "care", "speech-coach"]);
    expect(ids).not.toContain("play");
    expect(ids).not.toContain("rooms");
    expect(ids.length).toBeLessThanOrEqual(5);
  });

  it("gives 12–23m toddlers Care and Play after the plan is visible", () => {
    const ids = homeDoorIdsForAge("toddler", 18, "plan_visible");
    expect(ids).toContain("care");
    expect(ids).toContain("play");
    expect(ids).toContain("routines");
    expect(ids).not.toContain("rooms");
  });

  it("gives school-age Grow + Play and unlocks Rooms after first action", () => {
    const visible = homeDoorIdsForAge("early_school", 84, "plan_visible");
    expect(visible).toEqual(["routines", "grow", "play", "amy", "speech-coach"]);
    const acted = homeDoorIdsForAge("early_school", 84, "first_action");
    expect(acted).toContain("rooms");
    expect(acted[0]).toBe("routines");
    expect(acted.length).toBeLessThanOrEqual(5);
  });

  it("never advertises Rooms before the Rooms tab is allowed", () => {
    for (const stage of ["before_plan", "plan_visible"] as const) {
      expect(homeDoorIdsForAge("preschool", 48, stage)).not.toContain("rooms");
    }
    expect(homeDoorIdsForAge("preschool", 48, "first_action")).toContain("rooms");
  });

  it("maps Play to /games and Care/Grow into Rooms hashes", () => {
    const paths = buildTodayCarePaths({
      stage: "plan_visible",
      ageYears: 4,
      ageMonths: 0,
    });
    expect(paths.find((p) => p.id === "play")?.href).toBe("/games");
    expect(paths.find((p) => p.id === "grow")?.href).toBe("/parenting-hub#understand");
    expect(paths.every((p) => p.href !== "/pricing")).toBe(true);
  });
});
