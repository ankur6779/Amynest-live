import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_STALE_MS,
  isActiveSessionStale,
} from "./speechCoachV2ActiveSessionService.js";

describe("speechCoachV2ActiveSessionService staleness", () => {
  it("treats sessions older than ACTIVE_STALE_MS as stale", () => {
    const now = Date.UTC(2026, 5, 20, 12, 0, 0);
    const lastSeenAt = new Date(now - ACTIVE_STALE_MS - 1);
    assert.equal(isActiveSessionStale(lastSeenAt, now), true);
  });

  it("treats recently seen sessions as active", () => {
    const now = Date.UTC(2026, 5, 20, 12, 0, 0);
    const lastSeenAt = new Date(now - ACTIVE_STALE_MS + 1_000);
    assert.equal(isActiveSessionStale(lastSeenAt, now), false);
  });

  it("uses a 45 second stale window", () => {
    assert.equal(ACTIVE_STALE_MS, 45_000);
  });
});
