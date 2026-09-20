import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("learning load-more usage_daily identity alias owner keys", () => {
  it("get/increment/refund load-more usage resolve subscription owner before R/W", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/learningLoadMoreService.ts",
    );
    assert.match(src, /async function usageOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);

    const getUsage = src.slice(
      src.indexOf("async function getLoadMoreUsage"),
      src.indexOf("async function incrementLoadMoreUsage"),
    );
    assert.match(getUsage, /usageOwnerUserId/);
    assert.match(getUsage, /eq\(usageDailyTable\.userId, ownerUserId\)/);
    assert.doesNotMatch(getUsage, /eq\(usageDailyTable\.userId, userId\)/);

    const increment = src.slice(
      src.indexOf("async function incrementLoadMoreUsage"),
      src.indexOf("export type LoadMoreUsageInfo"),
    );
    assert.match(increment, /usageOwnerUserId/);
    assert.match(increment, /userId: ownerUserId/);

    const refund = src.slice(
      src.indexOf("export async function refundLoadMoreQuota"),
      src.indexOf("export async function refundLoadMoreQuotaFromJob"),
    );
    assert.match(refund, /usageOwnerUserId/);
    assert.match(refund, /eq\(usageDailyTable\.userId, ownerUserId\)/);
    assert.doesNotMatch(refund, /eq\(usageDailyTable\.userId, userId\)/);
  });
});
