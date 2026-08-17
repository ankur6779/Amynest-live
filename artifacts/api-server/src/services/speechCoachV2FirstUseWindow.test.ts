import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPEECH_COACH_V2_FIRST_USE_DAY,
  SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE,
  SPEECH_COACH_V2_FIRST_USE_FEATURE,
  SPEECH_COACH_V2_FIRST_USE_SECONDS,
  capFirstUseCharge,
  firstUseIsExhausted,
  firstUseRemainingSeconds,
} from "./speechCoachV2FirstUseWindow.js";

describe("speechCoachV2FirstUseWindow", () => {
  it("new user has 90 seconds remaining", () => {
    assert.equal(firstUseRemainingSeconds(0), 90);
    assert.equal(firstUseIsExhausted(0), false);
  });

  it("30 consumed leaves 60", () => {
    assert.equal(firstUseRemainingSeconds(30), 60);
  });

  it("60 consumed leaves 30", () => {
    assert.equal(firstUseRemainingSeconds(60), 30);
  });

  it("90 consumed leaves 0 and is exhausted", () => {
    assert.equal(firstUseRemainingSeconds(90), 0);
    assert.equal(firstUseIsExhausted(90), true);
  });

  it("over-90 is still exhausted at the 90 cap", () => {
    assert.equal(firstUseRemainingSeconds(120), 0);
    assert.equal(firstUseIsExhausted(120), true);
  });

  it("partial sessions only charge actual requested seconds", () => {
    let used = 0;
    used = capFirstUseCharge(used, 20).usedAfter;
    assert.equal(used, 20);
    assert.equal(firstUseRemainingSeconds(used), 70);

    used = capFirstUseCharge(used, 30).usedAfter;
    assert.equal(used, 50);
    assert.equal(firstUseRemainingSeconds(used), 40);

    used = capFirstUseCharge(used, 40).usedAfter;
    assert.equal(used, 90);
    assert.equal(firstUseRemainingSeconds(used), 0);
  });

  it("does not burn the full 90s when a small tick is charged", () => {
    const result = capFirstUseCharge(0, 1);
    assert.equal(result.chargedSeconds, 1);
    assert.equal(result.usedAfter, 1);
    assert.equal(result.remainingAfter, 89);
  });

  it("failed/zero tick does not consume allowance", () => {
    const result = capFirstUseCharge(0, 0);
    assert.equal(result.chargedSeconds, 0);
    assert.equal(result.usedAfter, 0);
    assert.equal(result.remainingAfter, 90);
  });

  it("never charges past remaining", () => {
    const result = capFirstUseCharge(80, 40);
    assert.equal(result.chargedSeconds, 10);
    assert.equal(result.usedAfter, 90);
    assert.equal(result.remainingAfter, 0);
  });

  it("uses a lifetime day key, not a UTC date", () => {
    assert.equal(SPEECH_COACH_V2_FIRST_USE_DAY, "lifetime");
    assert.equal(SPEECH_COACH_V2_FIRST_USE_SECONDS, 90);
    assert.equal(SPEECH_COACH_V2_FIRST_USE_FEATURE, "speech_coach_v2_first_use_seconds");
    assert.doesNotMatch(SPEECH_COACH_V2_FIRST_USE_DAY, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("exhausted copy is not a daily reset or trial", () => {
    const msg = SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE.toLowerCase();
    assert.match(msg, /already tried/);
    assert.match(msg, /10 minutes every day/);
    assert.doesNotMatch(msg, /tomorrow|daily limit|3-day|premium trial/);
  });
});
