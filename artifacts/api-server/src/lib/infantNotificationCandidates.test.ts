import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFeedReminderCandidate,
  evaluateMilestoneTipCandidate,
  evaluateNapWindowCandidate,
  evaluateVaccineCandidates,
  infantNotificationDedupKey,
  isKindSnoozed,
  kindEnabled,
  pickBestCandidates,
} from "./infantNotificationCandidates.js";

describe("infantNotificationCandidates", () => {
  it("builds stable daily vaccine fingerprints", () => {
    assert.equal(
      infantNotificationDedupKey(1, "nap_window", "900", "2026-05-30"),
      "1_nap_window_900_2026-05-30",
    );
  });

  it("vaccine candidates only fire at 09:00 local, not every minute in hour 9", () => {
    const base = {
      childId: 2,
      childName: "Emma",
      ageYears: 0,
      ageMonthsPart: 8,
      logMap: {},
      localDate: "2026-05-30",
      localHour: 9,
    };
    assert.equal(evaluateVaccineCandidates({ ...base, localMinute: 0 }).length, 1);
    assert.equal(evaluateVaccineCandidates({ ...base, localMinute: 1 }).length, 0);
    assert.equal(evaluateVaccineCandidates({ ...base, localMinute: 59 }).length, 0);
  });

  it("respects kind prefs and snooze", () => {
    const prefs = {
      napReminders: true,
      feedReminders: false,
      vaccineReminders: true,
      milestoneTips: true,
      sleepDrift: false,
    };
    assert.equal(kindEnabled(prefs, "feed_reminder"), false);
    assert.equal(
      isKindSnoozed({ nap_window: new Date(Date.now() + 60_000).toISOString() }, "nap_window", Date.now()),
      true,
    );
  });

  it("creates feed reminder in due window", () => {
    const nowMs = 1_000_000;
    const lastFeedAtMs = nowMs - 3 * 60 * 60_000;
    const candidate = evaluateFeedReminderCandidate({
      childId: 5,
      ageMonths: 4,
      lastFeedAtMs,
      nowMs,
      localDate: "2026-05-30",
    });
    assert.match(candidate?.body ?? "", /next feed/i);
    assert.match(candidate?.deepLink ?? "", /infant-feeding/);
  });

  it("prioritizes vaccine overdue over milestone tip", () => {
    const vaccines = evaluateVaccineCandidates({
      childId: 2,
      childName: "Emma",
      ageYears: 0,
      ageMonthsPart: 8,
      logMap: {},
      localDate: "2026-05-30",
      localHour: 9,
    });
    assert.ok(vaccines.length > 0);

    const milestone = evaluateMilestoneTipCandidate({
      childId: 2,
      childName: "Emma",
      ageMonths: 8,
      localDate: "2026-05-30",
      localHour: 10,
    });
    assert.equal(milestone?.kind, "milestone_tip");

    const picked = pickBestCandidates([...(milestone ? [milestone] : []), ...vaccines], 1);
    assert.equal(picked[0]?.kind, "vaccine_due");
  });

  it("returns null nap candidate outside lead window", () => {
    const candidate = evaluateNapWindowCandidate({
      childId: 1,
      ageMonths: 3,
      history: [],
      nowMs: Date.now(),
      tzOffsetMin: 330,
      localDate: "2026-05-30",
    });
    assert.equal(candidate, null);
  });
});
