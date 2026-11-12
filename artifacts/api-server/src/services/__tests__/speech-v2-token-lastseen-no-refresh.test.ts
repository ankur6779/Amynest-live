import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("speech coach v2 token mint must not refresh lastSeenAt without charging", () => {
  it("assertActiveSessionForToken validates stale but does not update lastSeenAt", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/speechCoachV2ActiveSessionService.ts",
    );
    const start = src.indexOf("export async function assertActiveSessionForToken");
    const end = src.indexOf("export async function validateAndTouchSession");
    assert.ok(start >= 0 && end > start, "assertActiveSessionForToken block not found");
    const block = src.slice(start, end);

    assert.match(block, /ACTIVE_STALE_MS/);
    assert.match(block, /invalid_session/);
    assert.doesNotMatch(block, /\.set\(\s*\{\s*lastSeenAt/);
    assert.doesNotMatch(block, /lastSeenAt:\s*new Date\(\)/);
  });

  it("realtime token route and cost report both call assertActiveSessionForToken", () => {
    const route = readRepoFile("artifacts/api-server/src/routes/speech-coach-v2.ts");
    assert.match(route, /\/speech\/v2\/realtime\/token/);
    assert.match(route, /assertActiveSessionForToken/);

    const cost = readRepoFile(
      "artifacts/api-server/src/services/speechCoachV2CostService.ts",
    );
    assert.match(cost, /assertActiveSessionForToken/);
  });
});
