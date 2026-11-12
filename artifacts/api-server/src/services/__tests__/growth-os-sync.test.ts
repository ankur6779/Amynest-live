import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("growth OS sync lost-update guard", () => {
  it("decision GET sync is read-only unless new recommendations appear", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/growth-operating-system/decision-center/index.ts",
    );
    assert.match(src, /const hasNew = recommendations\.some\(\(r\) => !knownRecIds\.has\(r\.id\)\)/);
    assert.match(src, /if \(!hasNew\) \{\s*return mergeDecisionsFromRecommendations/);
    assert.match(src, /const fresh = await loadGrowthOsPayload\(\)/);
  });

  it("alert GET sync is read-only unless new alerts appear", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/growth-operating-system/alerts/index.ts",
    );
    assert.match(src, /const hasNew = alerts\.some\(\(a\) => !knownAlertIds\.has\(a\.id\)\)/);
    assert.match(src, /if \(!hasNew\) \{\s*return mergeAlertWorkflows/);
    assert.match(src, /const fresh = await loadGrowthOsPayload\(\)/);
  });
});
