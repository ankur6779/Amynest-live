/**
 * Static source assertions — activateSubscription must refuse shrinking an
 * already-active paid currentPeriodEnd (delayed Razorpay / mismatched sub id).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dir, "../subscriptionService.ts"), "utf8");

test("activateSubscription refuses period regression for active paid providers", () => {
  const fnIdx = source.indexOf("export async function activateSubscription");
  assert.ok(fnIdx >= 0);
  const body = source.slice(fnIdx, fnIdx + 4500);
  assert.match(body, /refused activateSubscription period regression/);
  assert.match(
    body,
    /opts\.periodEnd\.getTime\(\)\s*<\s*existing\.currentPeriodEnd\.getTime\(\)/,
  );
  assert.match(body, /existing\.provider === "razorpay"/);
  assert.match(body, /existing\.provider === "revenuecat"/);
});
