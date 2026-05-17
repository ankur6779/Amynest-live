import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import {
  allocatePrioritySlots,
  enforceUaeOutdoorHardConstraint,
  MAX_CULTURAL_BLOCKS,
  type DecisionTraceEntry,
} from "./routine-priority-engine.js";
import { isOutdoorBlockedByHeat } from "./routine-country-structure.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("allocatePrioritySlots", () => {
  it("limits India cultural blocks (tuition + play, drops revision)", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "IN",
        weatherOutdoor: "yes",
        hasSchool: true,
        isWeekendDay: false,
        referenceDate: new Date("2026-05-13T12:00:00"),
      }),
      { ageGroup: "early_school" },
    );
    const trace: DecisionTraceEntry[] = [];
    const out = allocatePrioritySlots(
      [{ time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" }],
      state,
      trace,
    );
    const maxIn = MAX_CULTURAL_BLOCKS.IN ?? 3;
    const adaptive = out.filter((i) => i.culturalTag);
    assert.ok(adaptive.length <= maxIn, `got ${adaptive.length} cultural blocks (max ${maxIn})`);
    assert.ok(out.some((i) => /tuition|study/i.test(i.activity)));
    assert.equal(
      out.some((i) => /optional revision/i.test(i.activity)),
      false,
    );
    assert.ok(trace.some((t) => t.message.includes("Dropped")));
  });

  it("AU gets structured sports; NZ gets nature outdoor not club sports", () => {
    const auState = deriveBehavioralState(
      buildRoutineContext({ country: "AU", weatherOutdoor: "yes", hasSchool: true }),
      { ageGroup: "early_school" },
    );
    const nzState = deriveBehavioralState(
      buildRoutineContext({ country: "NZ", weatherOutdoor: "yes", hasSchool: true }),
      { ageGroup: "early_school" },
    );
    const au = allocatePrioritySlots([], auState, []);
    const nz = allocatePrioritySlots([], nzState, []);
    assert.ok(au.some((i) => /sports practice/i.test(i.activity)));
    assert.ok(nz.some((i) => /park|beach/i.test(i.activity)));
    assert.equal(nz.some((i) => /sports practice/i.test(i.activity)), false);
  });
});

describe("enforceUaeOutdoorHardConstraint", () => {
  it("shifts outdoor before 18:30 to evening window", () => {
    assert.equal(isOutdoorBlockedByHeat(16 * 60, "AE"), true);
    const trace: DecisionTraceEntry[] = [];
    const out = enforceUaeOutdoorHardConstraint(
      [
        {
          time: "16:00",
          activity: "Park play",
          duration: 30,
          category: "outdoor",
        },
      ],
      trace,
    );
    assert.ok(parseTimeToMins(out[0]!.time) >= 18 * 60 + 30);
    assert.ok(trace.length > 0);
  });
});

describe("India pipeline stability", () => {
  it("school-age India does not revert on standard input", () => {
    const built = buildRoutineContext({ country: "IN", weatherOutdoor: "yes", hasSchool: true });
    const result = runRoutineIntelligencePipeline({
      items: [
        { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
        { time: "09:00", activity: "At school", duration: 360, category: "school" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      builtContext: built,
      childProfile: { ageGroup: "early_school", ageInMonths: 96 },
      ageInMonths: 96,
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "early_school",
        hasSchool: true,
        schoolStartMins: 9 * 60,
        schoolEndMins: 15 * 60,
      },
      fridgeItems: "milk, eggs, bread, rice, vegetables",
    });
    assert.equal(result.reverted, false, result.debugLog.join("; "));
    assert.ok(result.decisionTrace.length > 0);
    assert.ok(result.items.some((i) => /refuel|tuition/i.test(i.activity)));
  });
});
