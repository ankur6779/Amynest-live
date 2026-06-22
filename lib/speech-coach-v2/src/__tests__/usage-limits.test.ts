import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS,
} from "../types";
import {
  canStartSession,
  isDailyLimitReached,
  isMonthlyLimitReached,
  remainingDailySeconds,
  remainingMonthlySeconds,
  remainingSpeechCoachSeconds,
} from "../usage-limits";

describe("usage limits", () => {
  it("blocks when paid daily limit reached", () => {
    assert.equal(
      isDailyLimitReached(600, SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS),
      true,
    );
    assert.equal(canStartSession(600, SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS), false);
  });

  it("blocks when trial daily limit reached", () => {
    assert.equal(
      isDailyLimitReached(120, SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS),
      true,
    );
    assert.equal(canStartSession(120, SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS), false);
  });

  it("allows session when under limit", () => {
    assert.equal(isDailyLimitReached(0, 120), false);
    assert.equal(canStartSession(100, 600), true);
  });

  it("blocks when daily limit is zero", () => {
    assert.equal(isDailyLimitReached(0, 0), true);
    assert.equal(canStartSession(0, 0), false);
  });

  it("computes remaining seconds from server usage", () => {
    assert.equal(remainingDailySeconds(120, 600), 480);
    assert.equal(remainingDailySeconds(120, 120), 0);
    assert.equal(remainingDailySeconds(599, 600), 1);
  });

  it("caps monthly speech coach usage at 150 minutes", () => {
    assert.equal(SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS, 9_000);
    assert.equal(remainingMonthlySeconds(8_940, SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS), 60);
    assert.equal(isMonthlyLimitReached(9_000, SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS), true);
  });

  it("uses the smaller remaining window across daily and monthly caps", () => {
    assert.equal(
      remainingSpeechCoachSeconds({
        dailyUsedSeconds: 100,
        dailyLimitSeconds: 600,
        monthlyUsedSeconds: 8_990,
        monthlyLimitSeconds: SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
      }),
      10,
    );
  });
});
