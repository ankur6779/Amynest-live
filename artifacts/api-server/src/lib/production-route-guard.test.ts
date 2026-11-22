import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  evaluateHeavyRouteRequest,
  resetProductionGuardStateForTests,
  setCachedHeavyResponse,
} from "./production-route-guard.js";

describe("evaluateHeavyRouteRequest subscription loop guard", () => {
  beforeEach(() => {
    resetProductionGuardStateForTests();
  });

  it("allows a live subscription read when loop is detected without cache (never FREE fallback)", () => {
    const userId = "paid_user_loop";
    const path = "/api/subscription";

    assert.equal(
      evaluateHeavyRouteRequest("subscription", userId, path).action,
      "proceed",
    );
    assert.equal(
      evaluateHeavyRouteRequest("subscription", userId, path).action,
      "proceed",
    );
    // Third call within 2s previously returned action=fallback (synthetic FREE).
    const third = evaluateHeavyRouteRequest("subscription", userId, path);
    assert.equal(third.action, "proceed");
  });

  it("serves cached body on loop when a prior successful response exists", () => {
    const userId = "cached_user_loop";
    const path = "/api/subscription";
    const body = { entitlements: { isPremium: true }, plans: [] };
    setCachedHeavyResponse(userId, path, body, "subscription");

    evaluateHeavyRouteRequest("subscription", userId, path);
    evaluateHeavyRouteRequest("subscription", userId, path);
    const third = evaluateHeavyRouteRequest("subscription", userId, path);
    assert.equal(third.action, "respond");
    if (third.action === "respond") {
      assert.equal(third.reason, "loop_cache");
      assert.deepEqual(third.body, body);
    }
  });
});
