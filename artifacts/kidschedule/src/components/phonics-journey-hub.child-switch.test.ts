/**
 * Phonics journey habit/adaptive wipe — sibling chips on /phonics must not
 * overwrite child B's amynest:phonics-habit:{B} / amynest:phonics-adaptive:{B}
 * with child A's momentum / stage / lastTestScore during the switch window.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPhonicsAdaptiveState,
  savePhonicsAdaptiveState,
  syncAdaptiveWeeklySnapshot,
} from "@/lib/phonics-journey-adaptive";
import {
  loadPhonicsHabitState,
  savePhonicsHabitState,
  syncWeeklyBaseline,
  updateStageProgress,
} from "@/lib/phonics-journey-habit";

const CHILD_A = 101;
const CHILD_B = 202;

function weekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

describe("PhonicsJourneyHub child-switch isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remounts PhonicsJourneyHub per childId", () => {
    const src = readFileSync(resolve(__dirname, "./phonics-learning.tsx"), "utf8");
    expect(src).toMatch(/<PhonicsJourneyHub\s+[^>]*key=\{childId\}/);
  });

  it("clears curriculum in useLayoutEffect before passive syncs", () => {
    const src = readFileSync(
      resolve(__dirname, "../hooks/use-phonics-curriculum.ts"),
      "utf8",
    );
    expect(src).toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{/);
    expect(src).toMatch(/setData\(null\)/);
    expect(src).toMatch(/reqIdRef/);
  });

  it("reloads phonics progress in useLayoutEffect on childId change", () => {
    const src = readFileSync(
      resolve(__dirname, "../hooks/use-phonics-data.ts"),
      "utf8",
    );
    expect(src).toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{/);
    expect(src).toMatch(/setProgress\(loadLocalProgress\(childId/);
    expect(src).toMatch(
      /before PhonicsJourneyHub passive sync effects/,
    );
  });

  it("writing B's own momentum keeps sibling habit+adaptive isolated", () => {
    const aMomentum = {
      practiceDays: 5,
      wordsReviewed: 40,
      wordsMastered: 12,
      accuracyPct: 88,
    };
    const bMomentum = {
      practiceDays: 1,
      wordsReviewed: 3,
      wordsMastered: 0,
      accuracyPct: 40,
    };

    // Seed A (advanced) and B (early) durable state.
    savePhonicsHabitState(CHILD_A, {
      ...loadPhonicsHabitState(CHILD_A),
      lastStageOrder: 6,
      weekly: { weekKey: weekKey(), ...aMomentum },
    });
    savePhonicsAdaptiveState(CHILD_A, {
      lastRecordedTestScore: 95,
      priorWeekKey: weekKey(),
      priorWeekMastered: 12,
      priorWeekAccuracy: 88,
    });
    savePhonicsHabitState(CHILD_B, {
      ...loadPhonicsHabitState(CHILD_B),
      lastStageOrder: 1,
      weekly: { weekKey: weekKey(), ...bMomentum },
    });
    savePhonicsAdaptiveState(CHILD_B, {
      lastRecordedTestScore: 40,
      priorWeekKey: weekKey(),
      priorWeekMastered: 0,
      priorWeekAccuracy: 40,
    });

    // Correct post-switch path: sync under B using B's derived inputs only.
    syncWeeklyBaseline(CHILD_B, bMomentum);
    updateStageProgress(CHILD_B, 1);
    syncAdaptiveWeeklySnapshot(CHILD_B, bMomentum, 40);

    expect(loadPhonicsHabitState(CHILD_A).lastStageOrder).toBe(6);
    expect(loadPhonicsHabitState(CHILD_A).weekly.wordsMastered).toBe(12);
    expect(loadPhonicsAdaptiveState(CHILD_A).lastRecordedTestScore).toBe(95);

    expect(loadPhonicsHabitState(CHILD_B).lastStageOrder).toBe(1);
    expect(loadPhonicsHabitState(CHILD_B).weekly.wordsMastered).toBe(0);
    expect(loadPhonicsAdaptiveState(CHILD_B).lastRecordedTestScore).toBe(40);
    expect(loadPhonicsAdaptiveState(CHILD_B).priorWeekMastered).toBe(0);
  });

  it("bug path: syncing A's stage/test under B would inflate/wipe B", () => {
    savePhonicsHabitState(CHILD_B, {
      ...loadPhonicsHabitState(CHILD_B),
      lastStageOrder: 1,
    });
    savePhonicsAdaptiveState(CHILD_B, {
      lastRecordedTestScore: 40,
      priorWeekKey: "1999-W1",
      priorWeekMastered: 0,
      priorWeekAccuracy: 40,
    });

    // Simulate the pre-fix race: childId=B with A's derived inputs.
    updateStageProgress(CHILD_B, 6);
    syncAdaptiveWeeklySnapshot(
      CHILD_B,
      {
        practiceDays: 5,
        wordsReviewed: 40,
        wordsMastered: 12,
        accuracyPct: 88,
      },
      95,
    );

    expect(loadPhonicsHabitState(CHILD_B).lastStageOrder).toBe(6);
    expect(loadPhonicsAdaptiveState(CHILD_B).lastRecordedTestScore).toBe(95);
    expect(loadPhonicsAdaptiveState(CHILD_B).priorWeekMastered).toBe(12);
  });
});
