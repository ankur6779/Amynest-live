import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyEngagement } from "./engagement.js";
import {
  computeNextMilestone,
  personalizedFutureWorlds,
  buildAchievementCollection,
  buildReEngagementCard,
  buildUniverseMap,
} from "./retention-engine.js";

const baseProgress = {
  play: { animals: ["dog", "cat", "lion", "tiger", "bear", "fish"], numbers: ["1", "2", "3", "4", "5"] },
  basic: {},
  advanced: {},
  engagement: { ...emptyEngagement(), goalProgress: 2, streak: 7, lastActiveDate: "2026-05-29" },
};

describe("retention-engine", () => {
  it("computes next milestone from daily goal progress", () => {
    const m = computeNextMilestone(baseProgress, 4);
    assert.equal(m.completed, 2);
    assert.equal(m.target, 3);
    assert.ok(m.rewardTitle.length > 0);
  });

  it("personalizes worlds from play activity", () => {
    const worlds = personalizedFutureWorlds(baseProgress, 4);
    assert.ok(worlds.some((w) => w.recommended));
    assert.ok(worlds.some((w) => w.because.includes("Animals") || w.because.includes("Numbers")));
  });

  it("builds achievement shelf with locked and unlocked", () => {
    const achievements = buildAchievementCollection(baseProgress, "play");
    assert.ok(achievements.some((a) => a.unlocked));
    assert.ok(achievements.some((a) => !a.unlocked));
  });

  it("shows re-engagement after 3+ inactive days", () => {
    const card = buildReEngagementCard(
      { ...baseProgress, engagement: { ...baseProgress.engagement, lastActiveDate: "2026-05-20" } },
      new Date("2026-05-29"),
    );
    assert.ok(card);
    assert.ok(card!.daysInactive >= 3);
  });

  it("builds universe map for play mode child", () => {
    const nodes = buildUniverseMap("play", 4);
    assert.equal(nodes.find((n) => n.id === "play")?.status, "current");
    assert.ok(nodes.length >= 6);
  });
});
