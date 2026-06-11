import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateAdaptiveInfantDayRoutine,
  formatInfantRoutineMarkdown,
  generateValidatedInfantRoutine,
  auditInfantRoutine,
} from "./infant-adaptive-routine.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("generateAdaptiveInfantDayRoutine", () => {
  it("respects AQI > 200 with no outdoor blocks", () => {
    const r = generateAdaptiveInfantDayRoutine({
      ageMonths: 7,
      wakeTime: "07:00",
      sleepTime: "19:30",
      feedingType: "mixed",
      aqi: 220,
      location: "Delhi",
    });
    assert.equal(
      r.blocks.some((b) => b.kind === "outdoor"),
      false,
    );
    assert.ok(r.adaptations.some((a) => /AQI/i.test(a)));
  });

  it("inserts special event with prep buffer", () => {
    const r = generateAdaptiveInfantDayRoutine({
      ageMonths: 5,
      wakeTime: "07:00",
      sleepTime: "19:00",
      feedingType: "breast",
      specialEvents: [{ label: "Doctor visit", time: "11:30" }],
    });
    const doc = r.blocks.find((b) => /doctor/i.test(b.activity));
    assert.ok(doc);
    const prep = r.blocks.find((b) => /get ready/i.test(b.activity));
    assert.ok(prep);
    assert.ok(parseTimeToMins(prep!.end) <= parseTimeToMins("11:30"));
  });

  it("produces no gap longer than 90 min between blocks", () => {
    const r = generateAdaptiveInfantDayRoutine({
      ageMonths: 4,
      wakeTime: "06:30",
      sleepTime: "19:00",
      feedingType: "formula",
      constraints: ["poor sleep previous night"],
      nightWakings: { count: 3, severity: "moderate" },
    });
    for (let i = 1; i < r.blocks.length; i++) {
      const gap =
        parseTimeToMins(r.blocks[i]!.start) -
        parseTimeToMins(r.blocks[i - 1]!.end);
      assert.ok(
        gap <= 90,
        `gap ${gap}min after ${r.blocks[i - 1]!.activity}`,
      );
    }
  });

  it("passes audit for onboarding default times (7:00 AM / 7:30 PM)", () => {
    for (const ageMonths of [6, 8, 10]) {
      const { finalAudit } = generateValidatedInfantRoutine({
        ageMonths,
        wakeTime: "07:00",
        sleepTime: "19:30",
        feedingType: "mixed",
      });
      const failed = finalAudit.results.filter((r) => r.status === "FAIL");
      assert.equal(
        failed.length,
        0,
        `${ageMonths}mo: ${failed.map((f) => f.details.join("; ")).join(" | ")}`,
      );
    }
  });

  it("validated pipeline reaches all PASS for standard 7mo scenario", () => {
    const { finalAudit, realismScore, result } = generateValidatedInfantRoutine({
      ageMonths: 7,
      wakeTime: "06:45",
      sleepTime: "19:15",
      nightWakings: { count: 2, severity: "moderate" },
      feedingType: "mixed",
      aqi: 220,
      specialEvents: [{ label: "Doctor visit", time: "11:30" }],
      constraints: ["poor sleep previous night"],
    });
    const failed = finalAudit.results.filter((r) => r.status === "FAIL");
    assert.equal(
      failed.length,
      0,
      failed.map((f) => `${f.rule}: ${f.details.join("; ")}`).join(" | "),
    );
    assert.ok(realismScore.total >= 80);
    assert.ok(result.blocks.length <= 14);
  });

  it("formats markdown timeline", () => {
    const md = formatInfantRoutineMarkdown(
      generateAdaptiveInfantDayRoutine({
        ageMonths: 3,
        wakeTime: "07:00",
        sleepTime: "20:00",
        feedingType: "breast",
      }),
    );
    assert.match(md, /\*\*Age:\*\* 3 months/);
    assert.match(md, /\| 07:00/);
  });
});
