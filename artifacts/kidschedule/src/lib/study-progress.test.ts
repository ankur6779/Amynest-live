import { describe, it, expect } from "vitest";
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
    expect(merged.play.numbers).toEqual(["1", "2"]);
    expect(merged.play.alphabets).toEqual(["A"]);
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
    expect(merged.play.numbers?.sort()).toEqual(["1", "2", "3"]);
  });
});
