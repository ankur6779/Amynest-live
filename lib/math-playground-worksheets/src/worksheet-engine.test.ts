import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultLearningState,
  recordPlaygroundSession,
} from "@workspace/math-playground";
import { generateWorksheet } from "./worksheet-engine.ts";
import { selectWorksheetLevel } from "./level-selector.ts";

describe("worksheet-engine", () => {
  it("generates counting worksheet with problems", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "counting_adventure",
      completedAt: Date.now(),
      hintsUsed: 0,
      durationMs: 60_000,
      success: true,
      tierUsed: "standard",
    });

    const ws = generateWorksheet({
      childId: 99,
      ageYears: 5,
      learning,
      category: "counting",
      seedOverride: 12345,
    });

    assert.equal(ws.category, "counting");
    assert.ok(ws.problems.length >= 6);
    assert.ok(ws.level >= 1 && ws.level <= 4);
    assert.ok(ws.id.startsWith("ws_99_counting"));
  });

  it("selects level from mastery and tier", () => {
    assert.equal(selectWorksheetLevel(85, "standard"), 3);
    assert.equal(selectWorksheetLevel(85, "stretch"), 4);
    assert.equal(selectWorksheetLevel(85, "ease"), 2);
  });
});
