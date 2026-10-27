/**
 * Guardrail: trial writers must not clobber a concurrent paid activate.
 *
 * startTrial / maybeApplyAutomaticAgeTrial used to UPDATE by userId only after
 * an in-memory status==="free" check. A Razorpay/RC webhook that activated
 * between the read and write could be overwritten back to a short TRIAL window.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const service = readFileSync(
  resolve(repoRoot, "artifacts/api-server/src/services/subscriptionService.ts"),
  "utf8",
);

function sliceFn(exportName: string): string {
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

describe("trial writers refuse to overwrite non-free rows", () => {
  it("maybeApplyAutomaticAgeTrial UPDATE requires status=free", () => {
    const slice = sliceFn("maybeApplyAutomaticAgeTrial");
    assert.match(slice, /eq\(subscriptionsTable\.status,\s*"free"\)/);
    assert.match(
      slice,
      /and\(\s*eq\(subscriptionsTable\.userId,\s*userId\),\s*eq\(subscriptionsTable\.status,\s*"free"\)/,
    );
  });

  it("startTrial UPDATE requires status=free and returns prior sub on no-op", () => {
    const slice = sliceFn("startTrial");
    assert.match(slice, /eq\(subscriptionsTable\.status,\s*"free"\)/);
    assert.match(
      slice,
      /and\(\s*eq\(subscriptionsTable\.userId,\s*userId\),\s*eq\(subscriptionsTable\.status,\s*"free"\)/,
    );
    assert.match(slice, /return updated \?\? sub/);
  });
});
