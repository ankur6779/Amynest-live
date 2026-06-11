import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeMasteryPayload,
  mergeFluencyPayload,
  mergeStoryProgressPayload,
  mergeRetentionPayload,
  mergePhonicsV3Bundle,
  defaultMasteryPayload,
  defaultRetentionPayload,
} from "./merge.js";

describe("phonics-v3-progress merge", () => {
  it("never drops mastery history when merging", () => {
    const local = defaultMasteryPayload();
    local.words.cat = {
      id: "cat",
      type: "word",
      counts: { heard: 2, blended: 1, identified: 0, spoken: 0 },
      score: 20,
      band: "learning",
      isMastered: false,
      firstSeenAt: 1000,
      lastActivityAt: 2000,
      history: [{ dateKey: "2026-06-01", score: 15 }],
    };
    const remote = defaultMasteryPayload();
    remote.words.cat = {
      id: "cat",
      type: "word",
      counts: { heard: 1, blended: 3, identified: 2, spoken: 1 },
      score: 55,
      band: "practicing",
      isMastered: false,
      firstSeenAt: 900,
      lastActivityAt: 2500,
      history: [{ dateKey: "2026-06-02", score: 40 }],
    };
    const merged = mergeMasteryPayload(local, remote);
    assert.equal(merged.words.cat!.counts.heard, 2);
    assert.equal(merged.words.cat!.counts.blended, 3);
    assert.equal(merged.words.cat!.history.length, 2);
  });

  it("merges fluency daily snapshots by max", () => {
    const merged = mergeFluencyPayload(
      {
        version: 3,
        streakDays: 2,
        lastActiveDate: "2026-06-10",
        wordsAttemptedTotal: 5,
        wordsCompletedTotal: 3,
        storiesCompletedTotal: 1,
        daily: [{ dateKey: "2026-06-10", wordsAttempted: 5, wordsCompleted: 3, storiesCompleted: 1, fluencyScore: 60 }],
      },
      {
        version: 3,
        streakDays: 3,
        lastActiveDate: "2026-06-11",
        wordsAttemptedTotal: 8,
        wordsCompletedTotal: 4,
        storiesCompletedTotal: 2,
        daily: [{ dateKey: "2026-06-10", wordsAttempted: 4, wordsCompleted: 4, storiesCompleted: 0, fluencyScore: 70 }],
      },
    );
    assert.equal(merged.streakDays, 3);
    assert.equal(merged.daily[0]!.wordsCompleted, 4);
    assert.equal(merged.daily[0]!.fluencyScore, 70);
  });

  it("merges story read counts upward", () => {
    const merged = mergeStoryProgressPayload(
      { version: 3, completed: { "story-a": { completedAt: 100, readCount: 1 } } },
      { version: 3, completed: { "story-a": { completedAt: 200, readCount: 2 } } },
    );
    assert.equal(merged.completed["story-a"]!.readCount, 2);
    assert.equal(merged.completed["story-a"]!.completedAt, 200);
  });

  it("bundle merge preserves both domains", () => {
    const merged = mergePhonicsV3Bundle(
      {
        mastery: { payload: defaultMasteryPayload(), clientUpdatedAt: 100 },
        fluency: null,
        stories: null,
        missions: null,
        retention: null,
      },
      {
        mastery: null,
        fluency: {
          payload: {
            version: 3,
            streakDays: 1,
            lastActiveDate: "",
            wordsAttemptedTotal: 0,
            wordsCompletedTotal: 0,
            storiesCompletedTotal: 0,
            daily: [],
          },
          clientUpdatedAt: 200,
        },
        stories: null,
        missions: null,
        retention: null,
      },
    );
    assert.ok(merged.mastery);
    assert.ok(merged.fluency);
  });

  it("retention merge prefers advanced review stage", () => {
    const local = defaultRetentionPayload();
    local.tracks["word:cat"] = {
      id: "cat",
      type: "word",
      introducedAt: 1000,
      lastReviewedAt: 2000,
      reviewStage: 4,
      nextReviewAt: 3000,
      retentionScore: 72,
      failStreak: 0,
      passStreak: 3,
    };
    const remote = defaultRetentionPayload();
    remote.tracks["word:cat"] = {
      id: "cat",
      type: "word",
      introducedAt: 1000,
      lastReviewedAt: 1500,
      reviewStage: 2,
      nextReviewAt: 2500,
      retentionScore: 60,
      failStreak: 1,
      passStreak: 1,
    };
    const merged = mergeRetentionPayload(local, remote);
    assert.equal(merged.tracks["word:cat"]!.reviewStage, 4);
    assert.equal(merged.tracks["word:cat"]!.nextReviewAt, 3000);
    assert.equal(merged.tracks["word:cat"]!.retentionScore, 72);
  });
});
