/**
 * Guardrail: POST /subscription/cancel must not wipe a concurrent paid activate.
 *
 * Immediate none/manual downgrade and Razorpay cancelAtPeriodEnd updates used to
 * UPDATE by userId only after an in-memory provider/status decision. Because
 * activateSubscription does not take the cancel advisory lock, a Razorpay/RC
 * activate between SELECT and UPDATE could be overwritten to EXPIRED (paid
 * periodEnd cleared) or stamped cancelAtPeriodEnd on the wrong subscription id.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const route = readFileSync(
  resolve(repoRoot, "artifacts/api-server/src/routes/subscription.ts"),
  "utf8",
);

function sliceCancelHandler() {
  const start = route.indexOf('router.post("/subscription/cancel"');
  assert.ok(start >= 0, "cancel route should exist");
  const next = route.indexOf("\nrouter.post(", start + 1);
  const end = next > start ? next : route.length;
  return route.slice(start, end);
}

describe("POST /subscription/cancel refuses concurrent paid activate wipe", () => {
  it("immediate downgrade UPDATE requires status+provider guards", () => {
    const slice = sliceCancelHandler();
    assert.match(slice, /subscriptionState:\s*"EXPIRED"/);
    assert.match(
      slice,
      /inArray\(subscriptionsTable\.status,\s*\["active",\s*"trialing"\]\)/,
    );
    assert.match(
      slice,
      /inArray\(subscriptionsTable\.provider,\s*\["none",\s*"manual"\]\)/,
    );
    assert.match(slice, /concurrent_state_change/);
    assert.match(slice, /return \{ kind: "inactive", status: "concurrent_state_change" \}/);
  });

  it("Razorpay cancelAtPeriodEnd UPDATE requires provider+subscriptionId+status guards", () => {
    const slice = sliceCancelHandler();
    assert.match(slice, /eq\(subscriptionsTable\.provider,\s*"razorpay"\)/);
    assert.match(
      slice,
      /eq\(subscriptionsTable\.providerSubscriptionId,\s*sub\.providerSubscriptionId\)/,
    );
    assert.match(
      slice,
      /inArray\(subscriptionsTable\.status,\s*\["active",\s*"trialing"\]\)/,
    );
  });
});
