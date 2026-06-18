import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS,
} from "../types";
import {
  canStartSession,
  isDailyLimitReached,
  remainingDailySeconds,
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
});
