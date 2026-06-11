import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateActivity } from "./generators.ts";
import { isMiniGameTemplate } from "./mini-game-generators.ts";
import { defaultLearningState } from "./adaptive.ts";

describe("daily challenge mini-game propagation", () => {
  it("passes enableMiniGames to nested daily tasks", () => {
    let sawMathPuzzles = false;
    let sawMini = false;

    for (let childId = 1; childId <= 300; childId++) {
      const daily = generateActivity({
        activityId: "daily_challenge",
        ageYears: 6,
        childId,
        learning: defaultLearningState(),
        enableMiniGames: true,
      });
      if (!daily.payload || !("tasks" in daily.payload)) continue;

      for (const task of daily.payload.tasks) {
        if (task.activityId !== "math_puzzles") continue;
        sawMathPuzzles = true;
        if (isMiniGameTemplate(task.payload.template as never)) {
          sawMini = true;
          break;
        }
      }
      if (sawMini) break;
    }

    assert.equal(sawMathPuzzles, true, "expected daily to include math_puzzles task");
    assert.equal(sawMini, true, "expected mini-game template when enableMiniGames is true");
  });
});
