import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeOlympiadScore } from "./score.js";

describe("computeOlympiadScore", () => {
  it("daily perfect run", () => {
    assert.equal(computeOlympiadScore("daily", 5, 5, 300), 60);
  });

  it("weekly perfect run", () => {
    assert.equal(computeOlympiadScore("weekly", 20, 20, 900), 350);
  });

  it("mock with speed bonus", () => {
    assert.equal(computeOlympiadScore("mock", 24, 30, 1200), 530);
  });

  it("track run", () => {
    assert.equal(computeOlympiadScore("track", 8, 10, 400), 64);
  });
});
