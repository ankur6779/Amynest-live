/**
 * Guardrail: maybeAutoGrantPremium must not clobber a concurrent paid activate
 * and must write the sticky-alias subscription owner (not raw Firebase uid).
 *
 * Previously: in-memory isPremiumNow check then UPDATE by auth userId only.
 * A Razorpay/RC webhook that activated between the read and write could be
 * flipped to provider=manual (billing lifecycle orphaned). Sticky B→A recovery
 * could also yield a silent 0-row update when writing the raw uid.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
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

describe("maybeAutoGrantPremium refuses store-provider overwrite + writes owner", () => {
  it("UPDATE targets sub.userId (alias owner), not raw userId", () => {
    const slice = sliceFn("maybeAutoGrantPremium");
    assert.match(slice, /eq\(subscriptionsTable\.userId,\s*sub\.userId\)/);
    assert.doesNotMatch(slice, /eq\(subscriptionsTable\.userId,\s*userId\)/);
  });

  it("UPDATE requires provider none|manual so Razorpay/RC activate wins the race", () => {
    const slice = sliceFn("maybeAutoGrantPremium");
    assert.match(slice, /eq\(subscriptionsTable\.provider,\s*"none"\)/);
    assert.match(slice, /eq\(subscriptionsTable\.provider,\s*"manual"\)/);
    assert.match(
      slice,
      /or\(\s*eq\(subscriptionsTable\.provider,\s*"none"\),\s*eq\(subscriptionsTable\.provider,\s*"manual"\)/,
    );
  });
});
