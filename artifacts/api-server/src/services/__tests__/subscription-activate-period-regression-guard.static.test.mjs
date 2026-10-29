/**
 * Guardrail: activateSubscription must not shrink currentPeriodEnd for the
 * same providerSubscriptionId (stale activated/charged after a newer renewal).
 *
 * Previously, periodNotRegressing was only used to decide the equal-period
 * early return; a shorter incoming period fell through to UPDATE by userId
 * and silently truncated the paid window.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const service = readFileSync(
  resolve(repoRoot, "artifacts/api-server/src/services/subscriptionService.ts"),
  "utf8",
);

function sliceFn(exportName) {
  const start = service.indexOf(`async function ${exportName}`);
  const alt = service.indexOf(`export async function ${exportName}`);
  const fnStart = start >= 0 ? start : alt;
  assert.ok(fnStart >= 0, `${exportName} should exist`);
  const next = service.indexOf("\nexport async function", fnStart + 1);
  const nextAsync = service.indexOf("\nasync function", fnStart + 1);
  let end = service.length;
  for (const cand of [next, nextAsync]) {
    if (cand > fnStart && cand < end) end = cand;
  }
  return service.slice(fnStart, end);
}

describe("activateSubscription refuses same-sub period regression", () => {
  it("returns existing when sameProviderSub incoming periodEnd is shorter", () => {
    const slice = sliceFn("activateSubscription");
    assert.match(slice, /refused activateSubscription period regression/);
    assert.match(
      slice,
      /opts\.periodEnd\.getTime\(\)\s*<\s*existing\.currentPeriodEnd\.getTime\(\)/,
    );
    assert.match(slice, /return existing/);
  });

  it("UPDATE WHERE only extends period for the same providerSubscriptionId", () => {
    const slice = sliceFn("activateSubscription");
    assert.match(slice, /sameSubPeriodGuard/);
    assert.match(
      slice,
      /providerSubscriptionId\} IS DISTINCT FROM \$\{opts\.providerSubscriptionId\}/,
    );
    assert.match(slice, /lte\(subscriptionsTable\.currentPeriodEnd,\s*opts\.periodEnd\)/);
    assert.match(
      slice,
      /and\(eq\(subscriptionsTable\.userId,\s*userId\),\s*sameSubPeriodGuard\)/,
    );
    assert.match(slice, /return updated \?\? existing/);
  });
});
