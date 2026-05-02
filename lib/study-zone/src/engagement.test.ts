import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEvent,
  emptyEngagement,
  viewState,
  todayIso,
  DAILY_GOAL_TARGET,
  XP_REWARDS,
  badgeLabel,
} from "./engagement";

const D = (iso: string) => new Date(`${iso}T12:00:00`);

describe("engagement.applyEvent", () => {
  it("starts a streak on first study day", () => {
    const r = applyEvent(emptyEngagement(), { kind: "play-tap", categoryId: "alphabets", itemId: "A" }, D("2025-01-10"));
    assert.equal(r.next.streak, 1);
    assert.equal(r.next.lastActiveDate, "2025-01-10");
    assert.equal(r.xpDelta, XP_REWARDS.playTap);
    assert.ok(r.streakIncreased);
  });

  it("extends streak on consecutive day", () => {
    const day1 = applyEvent(emptyEngagement(), { kind: "play-tap", categoryId: "a", itemId: "A" }, D("2025-01-10"));
    const day2 = applyEvent(day1.next, { kind: "play-tap", categoryId: "a", itemId: "B" }, D("2025-01-11"));
    assert.equal(day2.next.streak, 2);
    assert.ok(day2.streakIncreased);
    assert.equal(day2.xpDelta, XP_REWARDS.playTap + XP_REWARDS.streakDay);
  });

  it("resets streak after a gap", () => {
    const day1 = applyEvent(emptyEngagement(), { kind: "play-tap", categoryId: "a", itemId: "A" }, D("2025-01-10"));
    const day3 = applyEvent(day1.next, { kind: "play-tap", categoryId: "a", itemId: "B" }, D("2025-01-13"));
    assert.equal(day3.next.streak, 1);
    assert.equal(day3.xpDelta, XP_REWARDS.playTap); // no streak bonus
  });

  it("does not double-count streak within the same day", () => {
    const a = applyEvent(emptyEngagement(), { kind: "play-tap", categoryId: "a", itemId: "A" }, D("2025-01-10"));
    const b = applyEvent(a.next, { kind: "play-tap", categoryId: "a", itemId: "B" }, D("2025-01-10"));
    assert.equal(b.next.streak, 1);
    assert.equal(b.xpDelta, XP_REWARDS.playTap);
    assert.ok(!b.streakIncreased);
  });

  it("awards perfect-score XP and badge", () => {
    const r = applyEvent(
      emptyEngagement(),
      { kind: "topic-result", mode: "basic", subjectId: "math", topicId: "addition", score: 5, total: 5 },
      D("2025-01-10"),
    );
    assert.equal(r.xpDelta, XP_REWARDS.topicAttempt + XP_REWARDS.topicPerfect);
    assert.ok(r.newBadges.includes("perfect-basic-math-addition"));
  });

  it("awards pass-score XP without perfect badge", () => {
    const r = applyEvent(
      emptyEngagement(),
      { kind: "topic-result", mode: "basic", subjectId: "math", topicId: "addition", score: 3, total: 5 },
      D("2025-01-10"),
    );
    assert.equal(r.xpDelta, XP_REWARDS.topicAttempt + XP_REWARDS.topicPass);
    assert.equal(r.newBadges.filter((b) => b.startsWith("perfect-")).length, 0);
  });

  it("rolls daily goal and emits badge when target reached", () => {
    let s = emptyEngagement();
    for (let i = 0; i < DAILY_GOAL_TARGET; i++) {
      const r = applyEvent(
        s,
        { kind: "topic-result", mode: "basic", subjectId: "math", topicId: `t${i}`, score: 5, total: 5 },
        D("2025-01-10"),
      );
      s = r.next;
      if (i === DAILY_GOAL_TARGET - 1) {
        assert.ok(r.goalReached, "goal should be reached on the last topic");
        assert.ok(r.newBadges.includes("goal-2025-01-10"));
      } else {
        assert.ok(!r.goalReached);
      }
    }
    assert.equal(s.goalProgress, DAILY_GOAL_TARGET);
  });

  it("resets daily goal when a new day starts", () => {
    const day1 = applyEvent(
      emptyEngagement(),
      { kind: "topic-result", mode: "basic", subjectId: "math", topicId: "t1", score: 5, total: 5 },
      D("2025-01-10"),
    );
    assert.equal(day1.next.goalProgress, 1);
    const day2 = applyEvent(
      day1.next,
      { kind: "topic-result", mode: "basic", subjectId: "math", topicId: "t2", score: 5, total: 5 },
      D("2025-01-11"),
    );
    assert.equal(day2.next.goalProgress, 1);
  });

  it("emits streak milestone badges at 3/7/14", () => {
    let s = emptyEngagement();
    let lastBadges: string[] = [];
    for (let d = 1; d <= 14; d++) {
      const dateIso = `2025-01-${String(d).padStart(2, "0")}`;
      const r = applyEvent(s, { kind: "play-tap", categoryId: "a", itemId: `i${d}` }, D(dateIso));
      s = r.next;
      lastBadges = lastBadges.concat(r.newBadges);
    }
    assert.ok(lastBadges.includes("streak-3"));
    assert.ok(lastBadges.includes("streak-7"));
    assert.ok(lastBadges.includes("streak-14"));
  });
});

describe("engagement.viewState", () => {
  it("freshens streak to 0 if more than a day has passed", () => {
    const stale = { ...emptyEngagement(), streak: 5, lastActiveDate: "2025-01-01" };
    const fresh = viewState(stale, D("2025-01-10"));
    assert.equal(fresh.streak, 0);
  });

  it("keeps streak intact if today or yesterday", () => {
    const yesterday = { ...emptyEngagement(), streak: 5, lastActiveDate: "2025-01-09" };
    assert.equal(viewState(yesterday, D("2025-01-10")).streak, 5);
    const today = { ...emptyEngagement(), streak: 5, lastActiveDate: "2025-01-10" };
    assert.equal(viewState(today, D("2025-01-10")).streak, 5);
  });
});

describe("engagement.badgeLabel", () => {
  it("formats known badge ids", () => {
    assert.deepEqual(badgeLabel("streak-7"), { emoji: "🔥", label: "7-day streak" });
    assert.deepEqual(badgeLabel("xp-100"), { emoji: "⭐", label: "100 XP" });
    assert.deepEqual(badgeLabel("perfect-basic-math-addition"), { emoji: "🏆", label: "Perfect score" });
    assert.deepEqual(badgeLabel("goal-2025-01-10"), { emoji: "🎯", label: "Daily goal" });
  });

  it("returns null for unknown badges", () => {
    assert.equal(badgeLabel("nope"), null);
  });
});

describe("engagement.todayIso", () => {
  it("formats local YYYY-MM-DD", () => {
    const iso = todayIso(new Date("2025-03-04T15:30:00"));
    assert.equal(iso, "2025-03-04");
  });
});
