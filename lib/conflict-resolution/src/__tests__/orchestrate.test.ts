// ─────────────────────────────────────────────────────────────────────────
// Comprehensive tests for the Multi-Child Conflict Resolution Engine.
// Run via: node --import tsx/esm --test lib/conflict-resolution/src/__tests__/*.test.ts
// ─────────────────────────────────────────────────────────────────────────

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  orchestrateHousehold,
  detectConflicts,
  applyResolutions,
  planResolutions,
  resolveWeights,
  effectivePriority,
  parseTime,
  formatTime12,
  intervalsOverlap,
  buildConflictMatrix,
  type ChildRoutineInput,
  type CaregiverAvailability,
} from "../index";

// ── Test fixtures ────────────────────────────────────────────────────────
const child1: ChildRoutineInput = {
  child: { id: 1, name: "Aarav",   age: 4, defaultCaregiver: "mom",
           wakeUpTime: "07:00", sleepTime: "20:30",
           hasSchoolToday: true, schoolStartTime: "08:30", schoolEndTime: "13:30" },
  items: [
    { time: "7:30 AM",  activity: "Breakfast",      duration: 20, category: "meal" },
    { time: "8:00 AM",  activity: "Brush + Bath",   duration: 25, category: "hygiene" },
    { time: "1:00 PM",  activity: "Lunch",          duration: 30, category: "meal" },
    { time: "4:00 PM",  activity: "Outdoor play",   duration: 30, category: "outdoor" },
  ],
};
const child2: ChildRoutineInput = {
  child: { id: 2, name: "Diya",    age: 1, isInfant: true, defaultCaregiver: "mom",
           wakeUpTime: "07:30", sleepTime: "19:30" },
  items: [
    { time: "8:00 AM",  activity: "Breakfast",       duration: 20, category: "meal" },
    { time: "8:00 AM",  activity: "Diaper change",   duration: 10, category: "hygiene" },
    { time: "1:30 PM",  activity: "Lunch",           duration: 25, category: "meal" },
    { time: "4:15 PM",  activity: "Nap",             duration: 60, category: "sleep" },
  ],
};
const caregivers: CaregiverAvailability[] = [
  { caregiver: "mom", windows: [{ start: "06:00", end: "22:00" }], capacity: 1 },
  { caregiver: "dad", windows: [{ start: "07:00", end: "09:00" }, { start: "18:00", end: "22:00" }], capacity: 2 },
];

// ── Time helpers ─────────────────────────────────────────────────────────
describe("time helpers", () => {
  it("parses 12h, 24h, and rejects nonsense", () => {
    assert.equal(parseTime("7:30 AM"), 7 * 60 + 30);
    assert.equal(parseTime("12:15 PM"), 12 * 60 + 15);
    assert.equal(parseTime("12:15 AM"), 15);
    assert.equal(parseTime("19:00"),    19 * 60);
    assert.equal(parseTime("garbage"),  -1);
    assert.equal(parseTime(""),         -1);
    assert.equal(parseTime(null),       -1);
  });
  it("round-trips format → parse", () => {
    for (const m of [0, 75, 720, 750, 1320, 1439]) {
      const s = formatTime12(m);
      assert.equal(parseTime(s), m);
    }
  });
  it("intervalsOverlap is half-open", () => {
    assert.equal(intervalsOverlap(0, 10, 10, 20), false);
    assert.equal(intervalsOverlap(0, 11, 10, 20), true);
    assert.equal(intervalsOverlap(5, 15, 10, 20), true);
  });
});

// ── Priorities ───────────────────────────────────────────────────────────
describe("priority weights", () => {
  it("infant sleep beats teen study", () => {
    const w = resolveWeights();
    const infantSleep = effectivePriority("sleep",
      { id: 1, name: "i", age: 0, isInfant: true }, w);
    const teenStudy = effectivePriority("study",
      { id: 2, name: "t", age: 14 }, w);
    assert.ok(infantSleep > teenStudy,
      `expected infant sleep > teen study, got ${infantSleep} vs ${teenStudy}`);
  });
  it("sick child gets sleep bonus", () => {
    const w = resolveWeights();
    const healthy = effectivePriority("sleep", { id: 1, name: "x", age: 5 }, w);
    const sick    = effectivePriority("sleep", { id: 1, name: "x", age: 5, isSick: true }, w);
    assert.ok(sick > healthy);
  });
  it("user overrides merge with defaults", () => {
    const w = resolveWeights({ play: 999 });
    assert.equal(w.play, 999);
    assert.equal(w.sleep, 100); // default preserved
  });
});

// ── Conflict detection ───────────────────────────────────────────────────
describe("detectConflicts", () => {
  it("flags caregiver overlap when two kids share mom at same time", () => {
    const conflicts = detectConflicts([child1, child2], caregivers, resolveWeights());
    const cgConflicts = conflicts.filter(
      (c) => c.kind === "caregiver_overlap" || c.kind === "caregiver_overload",
    );
    assert.ok(cgConflicts.length >= 1, "expected at least one caregiver overlap");
    assert.ok(cgConflicts[0].childIds.includes(1) && cgConflicts[0].childIds.includes(2));
  });

  it("flags meal misalignment between siblings", () => {
    const conflicts = detectConflicts([child1, child2], caregivers, resolveWeights());
    const meals = conflicts.filter((c) => c.kind === "meal_misalignment");
    assert.ok(meals.length >= 1, `expected meal_misalignment, got ${conflicts.map(c=>c.kind).join(",")}`);
  });

  it("flags resource contention on bathroom", () => {
    const c1: ChildRoutineInput = { ...child1, items: [
      { time: "7:30 AM", activity: "Brush teeth", duration: 10, category: "hygiene" },
    ]};
    const c2: ChildRoutineInput = { ...child2, items: [
      { time: "7:30 AM", activity: "Diaper change", duration: 10, category: "hygiene" },
    ]};
    const conflicts = detectConflicts([c1, c2], caregivers, resolveWeights());
    const res = conflicts.filter((c) => c.kind === "resource_contention");
    assert.ok(res.length >= 1, "expected bathroom contention");
    assert.equal(res[0].resource, "bathroom");
  });

  it("flags sleep window violation when sibling is noisy during nap", () => {
    const napper: ChildRoutineInput = {
      child: { id: 10, name: "Baby", age: 0, isInfant: true },
      items: [{ time: "1:00 PM", activity: "Nap", duration: 60, category: "sleep" }],
    };
    const noisy: ChildRoutineInput = {
      child: { id: 11, name: "Big bro", age: 6 },
      items: [{ time: "1:30 PM", activity: "Music + dance", duration: 20, category: "play" }],
    };
    const conflicts = detectConflicts([napper, noisy], caregivers, resolveWeights());
    const sleep = conflicts.filter((c) => c.kind === "sleep_window_violation");
    assert.ok(sleep.length >= 1, "expected sleep_window_violation");
    assert.ok(sleep[0].severity >= 5, `expected high severity, got ${sleep[0].severity}`);
  });

  it("flags school collision when siblings start school within 15 min", () => {
    const a: ChildRoutineInput = { ...child1,
      child: { ...child1.child, id: 100, schoolStartTime: "08:30" }, items: [] };
    const b: ChildRoutineInput = { ...child2,
      child: { ...child2.child, id: 101, hasSchoolToday: true, schoolStartTime: "08:35" }, items: [] };
    const conflicts = detectConflicts([a, b], caregivers, resolveWeights());
    assert.ok(conflicts.some((c) => c.kind === "school_collision"));
  });

  it("emits shared_activity_opportunity for overlapping play", () => {
    const a: ChildRoutineInput = {
      child: { id: 1, name: "A", age: 5 },
      items: [{ time: "5:00 PM", activity: "Outdoor play", duration: 30, category: "outdoor" }],
    };
    const b: ChildRoutineInput = {
      child: { id: 2, name: "B", age: 6 },
      items: [{ time: "5:10 PM", activity: "Outdoor play", duration: 30, category: "outdoor" }],
    };
    const conflicts = detectConflicts([a, b], caregivers, resolveWeights());
    assert.ok(conflicts.some((c) => c.kind === "shared_activity_opportunity"));
  });

  it("does NOT flag conflicts on a single-child household", () => {
    const conflicts = detectConflicts([child1], caregivers, resolveWeights());
    const hard = conflicts.filter(
      (c) => c.kind !== "shared_activity_opportunity",
    );
    assert.equal(hard.length, 0);
  });
});

// ── Resolution planning ──────────────────────────────────────────────────
describe("planResolutions + applyResolutions", () => {
  it("synchronize_meals moves later meals to the earliest one", () => {
    const conflicts = detectConflicts([child1, child2], caregivers, resolveWeights());
    const resolutions = planResolutions(conflicts, [child1, child2], caregivers, resolveWeights());
    const mealRes = resolutions.find((r) => r.strategy === "synchronize_meals");
    assert.ok(mealRes, "expected a meal sync resolution");
    assert.ok(mealRes!.changes.length >= 1, "expected at least one meal time shifted");
  });

  it("applyResolutions does not mutate the original routines", () => {
    const conflicts = detectConflicts([child1, child2], caregivers, resolveWeights());
    const resolutions = planResolutions(conflicts, [child1, child2], caregivers, resolveWeights());
    const before = JSON.stringify([child1, child2]);
    applyResolutions([child1, child2], resolutions);
    const after  = JSON.stringify([child1, child2]);
    assert.equal(before, after);
  });

  it("applied changes are reflected in finalRoutines", () => {
    const conflicts = detectConflicts([child1, child2], caregivers, resolveWeights());
    const resolutions = planResolutions(conflicts, [child1, child2], caregivers, resolveWeights());
    const finalR = applyResolutions([child1, child2], resolutions);
    // At least one item should have shiftedFromTime stamped.
    const moved = finalR.flatMap((r) => r.items).filter((it) => !!it.shiftedFromTime);
    assert.ok(moved.length >= 1, "expected at least one item to be shifted");
  });

  it("school_collision results in no_action (advisory only)", () => {
    const a: ChildRoutineInput = {
      child: { id: 1, name: "A", age: 6, hasSchoolToday: true, schoolStartTime: "08:30" },
      items: [],
    };
    const b: ChildRoutineInput = {
      child: { id: 2, name: "B", age: 8, hasSchoolToday: true, schoolStartTime: "08:30" },
      items: [],
    };
    const conflicts = detectConflicts([a, b], caregivers, resolveWeights());
    const resolutions = planResolutions(conflicts, [a, b], caregivers, resolveWeights());
    const sc = resolutions.find((r) =>
      conflicts.find((c) => c.id === r.conflictId)?.kind === "school_collision",
    );
    assert.ok(sc);
    assert.equal(sc!.strategy, "no_action");
  });
});

// ── Orchestration end-to-end ─────────────────────────────────────────────
describe("orchestrateHousehold", () => {
  it("returns coherent state with timeline + summary + reasoning trace", () => {
    const state = orchestrateHousehold({
      date: "2026-05-10",
      routines: [child1, child2],
      caregivers,
    });
    assert.equal(state.date, "2026-05-10");
    assert.equal(state.originalRoutines.length, 2);
    assert.equal(state.finalRoutines.length, 2);
    assert.ok(state.timeline.length > 0, "timeline should not be empty");
    assert.ok(state.reasoningTrace.length >= 3, "trace should have ≥3 steps");
    assert.ok(state.summary.overallScore >= 0 && state.summary.overallScore <= 100);
    assert.ok(state.summary.sleepIntegrityScore >= 0 && state.summary.sleepIntegrityScore <= 100);
  });

  it("dryRun does not modify finalRoutines vs originalRoutines", () => {
    const state = orchestrateHousehold({
      date: "2026-05-10",
      routines: [child1, child2],
      caregivers,
      dryRun: true,
    });
    assert.deepEqual(
      state.finalRoutines.map((r) => r.items.map((i) => i.time)),
      state.originalRoutines.map((r) => r.items.map((i) => i.time)),
    );
  });

  it("orchestration is deterministic — same inputs ⇒ same outputs", () => {
    const a = orchestrateHousehold({ date: "d", routines: [child1, child2], caregivers });
    const b = orchestrateHousehold({ date: "d", routines: [child1, child2], caregivers });
    assert.deepEqual(a.conflicts.map((c) => c.id), b.conflicts.map((c) => c.id));
    assert.deepEqual(a.summary, b.summary);
  });

  it("single-child household has zero conflicts and overallScore = 100", () => {
    const state = orchestrateHousehold({
      date: "d", routines: [child1], caregivers,
    });
    const hard = state.conflicts.filter((c) => c.kind !== "shared_activity_opportunity");
    assert.equal(hard.length, 0);
    assert.equal(state.summary.overallScore, 100);
  });

  it("timeline slots flag conflicts correctly", () => {
    const state = orchestrateHousehold({
      date: "d", routines: [child1, child2], caregivers, dryRun: true,
    });
    assert.ok(state.timeline.some((s) => s.hasConflict),
      "expected at least one timeline slot to flag a conflict");
  });
});

// ── Conflict matrix ──────────────────────────────────────────────────────
describe("buildConflictMatrix", () => {
  it("produces a 96-bucket matrix at default 15-min granularity", () => {
    const m = buildConflictMatrix([child1, child2], resolveWeights());
    assert.equal(m.bucketMinutes, 15);
    assert.equal(m.buckets, 96);
    assert.equal(m.data.length, 96);
  });
  it("respects custom bucket size", () => {
    const m = buildConflictMatrix([child1, child2], resolveWeights(), 30);
    assert.equal(m.bucketMinutes, 30);
    assert.equal(m.buckets, 48);
  });
});
