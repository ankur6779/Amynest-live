import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("usage_daily identity alias owner keys", () => {
  it("incrementFeatureUsage / getFeatureUsage resolve subscription owner before read/write", () => {
    const src = readRepoFile("artifacts/api-server/src/services/subscriptionService.ts");
    assert.match(src, /async function usageOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);
    const getFeature = src.slice(
      src.indexOf("export async function getFeatureUsage"),
      src.indexOf("export async function getFeatureUsageMap"),
    );
    assert.match(getFeature, /usageOwnerUserId/);
    assert.match(getFeature, /eq\(usageDailyTable\.userId, ownerUserId\)/);

    const increment = src.slice(
      src.indexOf("export async function incrementFeatureUsage"),
      src.indexOf("export async function incrementAiUsage"),
    );
    assert.match(increment, /usageOwnerUserId/);
    assert.match(increment, /userId: ownerUserId/);
  });

  it("Talk first-use stamp keys off alias owner, not raw Firebase uid", () => {
    const src = readRepoFile("artifacts/api-server/src/services/speechConversationFirstUse.ts");
    assert.match(src, /resolveSubscriptionOwnerUserId/);
    assert.match(src, /userId: uid/);
    assert.doesNotMatch(
      src,
      /\.values\(\{\s*userId,\s*feature: SPEECH_CONVERSATION_FIRST_USE_FEATURE/,
    );
  });

  it("Speech Coach V2 first-use charge/peek keys off alias owner", () => {
    const src = readRepoFile("artifacts/api-server/src/services/speechCoachV2FirstUse.ts");
    assert.match(src, /resolveSubscriptionOwnerUserId/);
    assert.match(src, /userId: uid/);
    const charge = src.slice(src.indexOf("export async function chargeSpeechCoachV2FirstUseSeconds"));
    assert.match(charge, /const uid = await ownerUserId\(userId, exec\)/);
    assert.match(charge, /eq\(usageDailyTable\.userId, uid\)/);
  });
});
