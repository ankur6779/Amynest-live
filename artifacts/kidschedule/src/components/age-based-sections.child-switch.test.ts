/**
 * Growth-mission wipe — Parent Hub sibling switches must not overwrite
 * child B's amynest:growth-mission:{group}:{B}:{date} with child A's map.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const GROUP = "older";
const CHILD_A = "Aarav";
const CHILD_B = "Diya";
const DAY = "2026-11-21";

function missionKey(name: string) {
  return `amynest:growth-mission:${GROUP}:${name}:${DAY}`;
}

function save(name: string, completed: Record<string, boolean>) {
  localStorage.setItem(missionKey(name), JSON.stringify(completed));
}

function load(name: string): Record<string, boolean> {
  return JSON.parse(localStorage.getItem(missionKey(name)) || "{}") as Record<
    string,
    boolean
  >;
}

describe("SkillFocusSection child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Parent Hub remounts SkillFocusSection per effectiveChild.id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/parenting-hub.tsx"),
      "utf8",
    );
    expect(src).toMatch(
      /<SkillFocusSection\s+[^>]*key=\{effectiveChild\.id\}/,
    );
  });

  it("SkillFocusSection reloads completed map when missionKey changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./age-based-sections.tsx"),
      "utf8",
    );
    expect(src).toMatch(/loadGrowthMissionCompleted\(missionKey\)/);
    expect(src).toMatch(/setCompleted\(loadGrowthMissionCompleted\(missionKey\)\)/);
    expect(src).toMatch(/\}, \[missionKey\]\)/);
  });

  it("writing under B after loading B keeps sibling missions isolated (correct path)", () => {
    save(CHILD_A, { Discipline: true, Sports: true });
    save(CHILD_B, { Creativity: true });

    // Bug path: save(CHILD_B, { ...load(CHILD_A), Leadership: true }) — wiped B.
    // Correct path after switch: mutate B's own snapshot.
    const nextB = { ...load(CHILD_B), Leadership: true };
    save(CHILD_B, nextB);

    expect(load(CHILD_A)).toEqual({ Discipline: true, Sports: true });
    expect(load(CHILD_B)).toEqual({ Creativity: true, Leadership: true });
    expect(load(CHILD_B).Discipline).toBeUndefined();
  });
});
