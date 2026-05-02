// Unit tests for the Parent-Hub-parity data exports added in task #196.
// Uses the built-in node:test runner so the lib stays free of external deps.
//
// Run from the repo root with:
//   node --test --experimental-strip-types lib/infant-hub/src/parentHub.test.ts
//
// (The mobile artifact's vitest run separately covers the React-level smoke
// test.)

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getInfantBand,
  VACCINATIONS,
  getUpcomingVaccinations,
  getCompletedVaccinations,
  COMMON_ISSUES,
  getCommonIssuesForAge,
  MILESTONES,
  getMilestonesForAge,
  CUES,
  getCuesForAge,
  getWakeSpec,
  getSleepIssuePreviews,
  getRoutinePreview,
  getFeedingGuide,
  NOISE_TYPES,
  NOISE_AGE_TIPS,
  getNoiseAgeTip,
  LULLABIES,
} from "./parentHub.ts";

describe("getInfantBand", () => {
  it("maps representative ages to the right sub-band", () => {
    assert.equal(getInfantBand(0),  "0-3");
    assert.equal(getInfantBand(2),  "0-3");
    assert.equal(getInfantBand(3),  "3-6");
    assert.equal(getInfantBand(6),  "6-9");
    assert.equal(getInfantBand(9),  "9-12");
    assert.equal(getInfantBand(12), "12-18");
    assert.equal(getInfantBand(18), "18-24");
    assert.equal(getInfantBand(23), "18-24");
  });
});

describe("VACCINATIONS", () => {
  it("covers Birth → 24 months in monotonically increasing order", () => {
    assert.ok(VACCINATIONS.length >= 10);
    assert.equal(VACCINATIONS[0].ageMonths, 0);
    assert.equal(VACCINATIONS.at(-1)!.ageMonths, 24);
    for (let i = 1; i < VACCINATIONS.length; i++) {
      assert.ok(VACCINATIONS[i].ageMonths >= VACCINATIONS[i - 1].ageMonths,
        `ages should be monotonic at index ${i}`);
    }
  });

  it("getUpcomingVaccinations returns only entries within the next 2 months", () => {
    const upcoming = getUpcomingVaccinations(6);
    assert.ok(upcoming.length > 0);
    for (const v of upcoming) {
      assert.ok(v.ageMonths >= 6 && v.ageMonths <= 8);
    }
  });

  it("getCompletedVaccinations excludes any entry at or after the current age", () => {
    const completed = getCompletedVaccinations(12);
    for (const v of completed) {
      assert.ok(v.ageMonths < 12);
    }
  });
});

describe("COMMON_ISSUES", () => {
  it("each issue declares at least one band", () => {
    for (const i of COMMON_ISSUES) {
      assert.ok(i.bands.length > 0, `${i.id} should have at least one band`);
    }
  });

  it("getCommonIssuesForAge surfaces colic for newborns and teething for 8m", () => {
    const newborn = getCommonIssuesForAge(1);
    assert.ok(newborn.some((i) => i.id === "colic"));
    const eight = getCommonIssuesForAge(8);
    assert.ok(eight.some((i) => i.id === "teething"));
  });
});

describe("MILESTONES", () => {
  it("ranges are valid (from < to)", () => {
    for (const m of MILESTONES) {
      assert.ok(m.fromMonths < m.toMonths, `${m.id} has invalid range`);
    }
  });

  it("getMilestonesForAge filters by inclusive lower / exclusive upper bound", () => {
    const ms = getMilestonesForAge(6);
    assert.ok(ms.length > 0);
    for (const m of ms) {
      assert.ok(6 >= m.fromMonths && 6 < m.toMonths);
    }
    // A 22-month-old should still see the 12–24m language milestone for
    // two-word phrases (range: 14–24).
    const toddler = getMilestonesForAge(22);
    assert.ok(toddler.some((m) => m.id === "b1224_two_word"));
  });
});

describe("CUES", () => {
  it("getCuesForAge filters by age window", () => {
    const cues = getCuesForAge(2);
    assert.ok(cues.length > 0);
    for (const c of cues) {
      assert.ok(2 >= c.fromMonths && 2 < c.toMonths);
    }
  });

  it("CUES covers all 4 categories", () => {
    const cats = new Set(CUES.map((c) => c.category));
    for (const expected of ["hunger", "sleep", "overstim", "discomfort"]) {
      assert.ok(cats.has(expected as typeof CUES[number]["category"]),
        `missing category ${expected}`);
    }
  });
});

describe("getWakeSpec", () => {
  it("returns a contiguous spec across the 0–24m window", () => {
    for (const months of [0, 1, 3, 6, 9, 12, 18, 23]) {
      const spec = getWakeSpec(months);
      assert.ok(spec.windowMin > 0);
      assert.ok(spec.windowMax >= spec.windowMin);
      assert.ok(spec.totalDayMin > 0);
    }
  });

  it("wake windows lengthen with age", () => {
    assert.ok(getWakeSpec(2).windowMin <= getWakeSpec(6).windowMin);
    assert.ok(getWakeSpec(6).windowMin <= getWakeSpec(15).windowMin);
  });
});

describe("getSleepIssuePreviews + getRoutinePreview", () => {
  it("returns issue previews for typical infant ages", () => {
    assert.ok(getSleepIssuePreviews(2).some((i) => i.id === "overtired"));
    assert.ok(getSleepIssuePreviews(8).some((i) => i.id === "short_naps"));
  });

  it("routine preview includes wake + bedtime markers", () => {
    const routine = getRoutinePreview(6, "7:00 AM");
    assert.ok(routine[0].activity.toLowerCase().includes("wake"));
    assert.equal(routine.at(-1)!.id, "bedtime");
  });
});

describe("getFeedingGuide", () => {
  it("returns the milk-only guide for a 2-month-old", () => {
    const g = getFeedingGuide(2);
    assert.match(g.type, /breast/i);
  });
  it("returns family-meal guidance for a toddler", () => {
    const g = getFeedingGuide(20);
    assert.match(g.freq, /meals/i);
  });
});

describe("NOISE + LULLABIES", () => {
  it("has at least 6 noise types and 4 age tips", () => {
    assert.ok(NOISE_TYPES.length >= 6);
    assert.equal(NOISE_AGE_TIPS.length, 4);
  });

  it("getNoiseAgeTip returns the matching band", () => {
    assert.equal(getNoiseAgeTip(1).band,  "0–3 months");
    assert.equal(getNoiseAgeTip(4).band,  "3–6 months");
    assert.equal(getNoiseAgeTip(8).band,  "6–12 months");
    assert.equal(getNoiseAgeTip(20).band, "12–24 months");
  });

  it("ships at least one EN, one HI, one Hinglish lullaby", () => {
    const langs = new Set(LULLABIES.map((l) => l.lang));
    assert.ok(langs.has("en"));
    assert.ok(langs.has("hi"));
    assert.ok(langs.has("hin"));
  });
});
