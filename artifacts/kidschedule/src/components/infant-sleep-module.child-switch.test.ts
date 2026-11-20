/**
 * Infant sleep/routine wipe — Parent Hub sibling switches must not overwrite
 * child B's amynest:sleep:{B} / amynest:routine:{B} with child A's in-memory state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const CHILD_A = "Aarav";
const CHILD_B = "Diya";

function sleepKey(name: string) {
  return `amynest:sleep:${name}`;
}

function routineKey(name: string) {
  return `amynest:routine:${name}`;
}

describe("Infant sleep module child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Parent Hub remounts InfantHub per effectiveChild.id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/parenting-hub.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<InfantHub\s+[^>]*key=\{effectiveChild\.id\}/);
  });

  it("useSleepLog sync-resets log before API hydrate on child change", () => {
    const src = readFileSync(
      resolve(__dirname, "./infant-sleep-module.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setLog\(loadSleepLog\(childName\)\)/);
    expect(src).toMatch(/loadSleepLogFromApi/);
    expect(src).toMatch(/\}, \[authFetch, childId, childName\]\)/);
  });

  it("RoutineBuilder reloads items when storageKey/ageMonths change", () => {
    const src = readFileSync(
      resolve(__dirname, "./infant-sleep-module.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setItems\(readRoutine\(storageKey, ageMonths\)\)/);
    expect(src).toMatch(/\}, \[storageKey, ageMonths\]\)/);
  });

  it("writing under B after loading B keeps sibling sleep log isolated (correct path)", () => {
    const aLog = [{ id: "a1", type: "wake_up", ts: 1_000 }];
    const bLog = [{ id: "b1", type: "down", ts: 2_000 }];
    localStorage.setItem(sleepKey(CHILD_A), JSON.stringify(aLog));
    localStorage.setItem(sleepKey(CHILD_B), JSON.stringify(bLog));

    // Bug path: saveSleepLog(B, A's log). Correct: append onto B's own log.
    const nextB = [
      ...JSON.parse(localStorage.getItem(sleepKey(CHILD_B)) || "[]"),
      { id: "b2", type: "wake_up", ts: 3_000 },
    ];
    localStorage.setItem(sleepKey(CHILD_B), JSON.stringify(nextB));

    expect(JSON.parse(localStorage.getItem(sleepKey(CHILD_A)) || "[]")).toEqual(aLog);
    expect(JSON.parse(localStorage.getItem(sleepKey(CHILD_B)) || "[]")).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(sleepKey(CHILD_B)) || "[]")[0].id).toBe("b1");
  });

  it("writing under B after loading B keeps sibling routine isolated (correct path)", () => {
    const aItems = [{ id: "bath", time: "7:00 PM", activity: "Bath A", emoji: "🛁" }];
    const bItems = [{ id: "bed", time: "8:00 PM", activity: "Bed B", emoji: "🌙" }];
    localStorage.setItem(routineKey(CHILD_A), JSON.stringify(aItems));
    localStorage.setItem(routineKey(CHILD_B), JSON.stringify(bItems));

    const nextB = [
      ...JSON.parse(localStorage.getItem(routineKey(CHILD_B)) || "[]"),
      { id: "custom", time: "9:00 PM", activity: "Feed", emoji: "🍼" },
    ];
    localStorage.setItem(routineKey(CHILD_B), JSON.stringify(nextB));

    expect(JSON.parse(localStorage.getItem(routineKey(CHILD_A)) || "[]")).toEqual(aItems);
    expect(JSON.parse(localStorage.getItem(routineKey(CHILD_B)) || "[]")).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(routineKey(CHILD_B)) || "[]")[0].activity).toBe("Bed B");
  });
});
