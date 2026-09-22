/**
 * Static source assertions — activateSubscription must clear cancel leftovers
 * so Razorpay/RC resume does not leave cancelAtPeriodEnd=1 on an ACTIVE row.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "subscriptionService.ts"), "utf8");

describe("activateSubscription clears cancel leftovers on activate/resume", () => {
  it("clears cancelAtPeriodEnd, cancelledAt, and expiredAt in the activate update", () => {
    const fnIdx = source.indexOf("export async function activateSubscription");
    assert.ok(fnIdx >= 0, "activateSubscription must exist");
    const body = source.slice(fnIdx, fnIdx + 4500);
    const setIdx = body.indexOf(".set({");
    assert.ok(setIdx >= 0, "activateSubscription must update via .set");
    const setBody = body.slice(setIdx, setIdx + 1200);
    assert.match(setBody, /subscriptionState:\s*"ACTIVE"/);
    assert.match(setBody, /cancelAtPeriodEnd:\s*0/);
    assert.match(setBody, /cancelledAt:\s*null/);
    assert.match(setBody, /expiredAt:\s*null/);
  });
});
