import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyEngagement } from "@workspace/study-zone";
import {
  hydratePlayFromCompletedActivities,
  type StudyProgress,
} from "./study-progress";

function emptyProgress(): StudyProgress {
  return { play: {}, basic: {}, advanced: {}, engagement: emptyEngagement() };
}

describe("hydratePlayFromCompletedActivities", () => {
  it("merges play_* activity ids into category progress", () => {
    const merged = hydratePlayFromCompletedActivities(emptyProgress(), [
      "play_numbers_1",
      "play_numbers_2",
      "play_alphabets_A",
      "math_q1",
    ]);
    assert.deepEqual(merged.play.numbers, ["1", "2"]);
    assert.deepEqual(merged.play.alphabets, ["A"]);
  });

  it("is idempotent when items already exist locally", () => {
    const local: StudyProgress = {
      ...emptyProgress(),
      play: { numbers: ["1", "2"] },
    };
    const merged = hydratePlayFromCompletedActivities(local, [
      "play_numbers_1",
      "play_numbers_3",
    ]);
    assert.deepEqual(merged.play.numbers?.sort(), ["1", "2", "3"]);
  });
});
