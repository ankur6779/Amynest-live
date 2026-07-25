import { describe, expect, it } from "vitest";
import { evaluateMilestoneEmission } from "./reflection-milestones";

describe("evaluateMilestoneEmission", () => {
  it("emits milestone 1 exactly once", () => {
    const first = evaluateMilestoneEmission(1, []);
    expect(first.shouldEmit).toBe(true);
    expect(first.milestoneId).toBe("reflection_milestone_1");

    const replay = evaluateMilestoneEmission(1, first.nextEmitted);
    expect(replay.shouldEmit).toBe(false);
    expect(replay.nextEmitted).toEqual(["reflection_milestone_1"]);
  });

  it("emits 5 and 12 only at those counts", () => {
    expect(evaluateMilestoneEmission(4, []).shouldEmit).toBe(false);
    const five = evaluateMilestoneEmission(5, ["reflection_milestone_1"]);
    expect(five.shouldEmit).toBe(true);
    expect(five.milestoneId).toBe("reflection_milestone_5");

    const twelve = evaluateMilestoneEmission(12, [
      "reflection_milestone_1",
      "reflection_milestone_5",
    ]);
    expect(twelve.shouldEmit).toBe(true);
    expect(twelve.milestoneId).toBe("reflection_milestone_12");
  });

  it("sync retry does not re-emit the same milestoneId", () => {
    const emitted = [
      "reflection_milestone_1",
      "reflection_milestone_5",
    ] as const;
    const retry = evaluateMilestoneEmission(5, emitted);
    expect(retry.shouldEmit).toBe(false);
  });
});
