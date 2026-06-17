import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SPEECH_COACH_V2_DAILY_LIMIT_SECONDS } from "../types";
import {
  canStartSession,
  isDailyLimitReached,
  remainingDailySeconds,
} from "../usage-limits";

describe("usage limits", () => {
  it("blocks when daily limit reached", () => {
    assert.equal(isDailyLimitReached(SPEECH_COACH_V2_DAILY_LIMIT_SECONDS), true);
    assert.equal(canStartSession(SPEECH_COACH_V2_DAILY_LIMIT_SECONDS), false);
  });

  it("allows session when under limit", () => {
    assert.equal(isDailyLimitReached(0), false);
    assert.equal(canStartSession(100), true);
  });

  it("computes remaining seconds from server usage", () => {
    assert.equal(remainingDailySeconds(120), SPEECH_COACH_V2_DAILY_LIMIT_SECONDS - 120);
    assert.equal(remainingDailySeconds(SPEECH_COACH_V2_DAILY_LIMIT_SECONDS), 0);
  });
});
