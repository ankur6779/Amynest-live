import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_FEATURE_LIMITS,
  speechTranscribeDailyLimit,
} from "./subscriptionService.js";

describe("speechTranscribeDailyLimit", () => {
  const prev = process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"];

  afterEach(() => {
    if (prev === undefined) {
      delete process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"];
    } else {
      process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"] = prev;
    }
  });

  it("returns 20/day for free users", () => {
    assert.equal(speechTranscribeDailyLimit(false), FREE_FEATURE_LIMITS.speech_transcribe);
    assert.equal(speechTranscribeDailyLimit(false), 20);
  });

  it("returns 100/day for premium by default", () => {
    delete process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"];
    assert.equal(speechTranscribeDailyLimit(true), 100);
  });

  it("honours SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM env override", () => {
    process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"] = "250";
    assert.equal(speechTranscribeDailyLimit(true), 250);
  });
});
