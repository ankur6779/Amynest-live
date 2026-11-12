import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("premium download bank guardrails", () => {
  it("resolves canonical subscription owner for wallet reads, reserves, and refunds", () => {
    const service = readRepoFile(
      "artifacts/api-server/src/services/premiumDownloadBankService.ts",
    );

    assert.match(service, /resolveSubscriptionOwnerUserId\(authUserId\)/);
    assert.match(service, /countDownloadsForIstDay\(tx, authUserId/);
    assert.doesNotMatch(service, /where\(eq\(subscriptionsTable\.userId, userId\)\)/);
  });

  it("refunds bank debits when duplicate download insert loses the race", () => {
    for (const routePath of [
      "artifacts/api-server/src/routes/coloring.ts",
      "artifacts/api-server/src/routes/funsheets.ts",
      "artifacts/api-server/src/routes/worksheets.ts",
    ]) {
      const route = readRepoFile(routePath);
      const conflictIdx = route.indexOf('if (pgCode === "23505")');
      const refundIdx = route.indexOf("refundPremiumDownloadBankDebit(userId)", conflictIdx);
      assert.ok(conflictIdx >= 0, `${routePath} should handle unique violations`);
      assert.ok(
        refundIdx > conflictIdx,
        `${routePath} should refund bank debits on duplicate insert races`,
      );
    }
  });
});
