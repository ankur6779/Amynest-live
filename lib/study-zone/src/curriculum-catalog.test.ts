import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCurriculumUnlockSnapshot,
  futureWorldsForChild,
  buildWhatComesNextItems,
  buildLearningTimeline,
  stageStatus,
  JOURNEY_STAGES,
} from "./curriculum-catalog.js";

describe("curriculum-catalog", () => {
  it("maps a 4-year-old to play stage with future worlds", () => {
    assert.equal(stageStatus("play", "play"), "current");
    assert.equal(stageStatus("basic", "play"), "locked");
    const worlds = futureWorldsForChild(4);
    assert.ok(worlds.length >= 4);
  });

  it("computes unlock snapshot with future lessons", () => {
    const snap = computeCurriculumUnlockSnapshot(4);
    assert.ok(snap.availableNow >= 200);
    assert.ok(snap.totalFutureLessons > 0);
    assert.ok(snap.futureLessonBreakdown.length >= 3);
    assert.ok(snap.unlockedPercent > 0 && snap.unlockedPercent < 100);
    assert.equal(snap.stagesAhead, 2);
    assert.equal(snap.currentStageTitle, "Play & Learn");
    assert.ok(snap.nextUnlockTitle.length > 0);
  });

  it("builds learning timeline for young child", () => {
    const timeline = buildLearningTimeline(4);
    assert.ok(timeline.some((m) => m.horizon === "Today"));
    assert.ok(timeline.some((m) => m.horizon === "Age 15"));
  });

  it("builds what-comes-next timeline", () => {
    const items = buildWhatComesNextItems(7, null, ["Fractions Fun"]);
    assert.ok(items.length >= 3);
    assert.equal(items[0]?.horizon, "next_week");
    assert.ok(items.some((i) => i.horizon === "future_stage" && i.locked));
  });

  it("covers all journey stages", () => {
    assert.equal(JOURNEY_STAGES.length, 3);
  });
});
