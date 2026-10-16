import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("gaming rewards wallet identity alias owner keys", () => {
  it("loadOrInitWallet and play/sync/earn/unlock writes resolve sticky-alias owner", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/gamingRewardsService.ts",
    );
    assert.match(src, /async function walletOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);

    const load = src.slice(
      src.indexOf("export async function loadOrInitWallet"),
      src.indexOf("export interface WalletSnapshot"),
    );
    assert.match(load, /walletOwnerUserId\(userId\)/);
    assert.match(load, /eq\(gamingWalletTable\.userId, ownerUserId\)/);
    assert.match(load, /userId: ownerUserId/);
    assert.doesNotMatch(load, /eq\(gamingWalletTable\.userId, userId\)/);

    for (const marker of [
      "export async function syncWalletFromClient",
      "export async function earnPoints",
      "export async function unlockGameForUser",
      "export async function recordGamePlay",
    ]) {
      const start = src.indexOf(marker);
      assert.ok(start >= 0, `missing ${marker}`);
      const nextExport = src.indexOf("\nexport ", start + marker.length);
      const slice = src.slice(start, nextExport > 0 ? nextExport : undefined);
      assert.match(
        slice,
        /eq\(gamingWalletTable\.userId, wallet\.userId\)/,
        `${marker} must update by wallet.userId (owner row)`,
      );
      assert.doesNotMatch(
        slice,
        /eq\(gamingWalletTable\.userId, userId\)/,
        `${marker} must not write by raw auth uid`,
      );
    }
  });
});
