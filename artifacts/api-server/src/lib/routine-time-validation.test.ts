import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeTime,
  isValidClockTime24,
} from "./routine-time-validation.js";

describe("validateAndNormalizeTime", () => {
  it("accepts valid 24h times", () => {
    const r = validateAndNormalizeTime("07:30");
    assert.equal(r.time, "07:30");
    assert.equal(r.valid, true);
    assert.equal(r.sanitized, false);
  });

  it("accepts valid 12h times", () => {
    const r = validateAndNormalizeTime("9:00 PM", { fallback: "21:00" });
    assert.equal(r.time, "21:00");
    assert.equal(r.valid, true);
  });

  it("rejects 25:99 and uses fallback", () => {
    const r = validateAndNormalizeTime("25:99", { fallback: "07:00", field: "wakeUpTime" });
    assert.equal(r.time, "07:00");
    assert.equal(r.valid, false);
    assert.equal(r.sanitized, true);
    assert.match(r.reason ?? "", /out-of-range/i);
  });

  it("rejects 99:00 and uses fallback", () => {
    const r = validateAndNormalizeTime("99:00", { fallback: "21:00" });
    assert.equal(r.time, "21:00");
    assert.equal(r.sanitized, true);
  });

  it("rejects abc and uses fallback", () => {
    const r = validateAndNormalizeTime("abc", { fallback: "21:00" });
    assert.equal(r.time, "21:00");
    assert.equal(r.sanitized, true);
    assert.match(r.reason ?? "", /unparseable/i);
  });

  it("treats empty as fallback", () => {
    const r = validateAndNormalizeTime("", { fallback: "09:00" });
    assert.equal(r.time, "09:00");
    assert.equal(r.sanitized, true);
  });
});

describe("isValidClockTime24", () => {
  it("returns false for invalid strings", () => {
    assert.equal(isValidClockTime24("25:99"), false);
    assert.equal(isValidClockTime24("abc"), false);
  });

  it("returns true for normalized times", () => {
    assert.equal(isValidClockTime24("07:00"), true);
  });
});
