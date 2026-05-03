import { test } from "node:test";
import assert from "node:assert/strict";
import { __test } from "../notificationCron";

const { timeStringToMinutes } = __test;

test("timeStringToMinutes parses 12-hour AM/PM", () => {
  assert.equal(timeStringToMinutes("7:00 AM"), 7 * 60);
  assert.equal(timeStringToMinutes("12:00 AM"), 0);
  assert.equal(timeStringToMinutes("12:00 PM"), 12 * 60);
  assert.equal(timeStringToMinutes("12:30 PM"), 12 * 60 + 30);
  assert.equal(timeStringToMinutes("9:15 PM"), 21 * 60 + 15);
  assert.equal(timeStringToMinutes("not a time"), -1);
  assert.equal(timeStringToMinutes(""), -1);
});
