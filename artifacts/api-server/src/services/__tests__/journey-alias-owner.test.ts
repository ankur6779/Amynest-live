import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("freemium journey identity alias owner keys", () => {
  it("routine journey ensure/record resolve subscription owner before read/write", () => {
    const src = readRepoFile("artifacts/api-server/src/services/routineJourneyService.ts");
    assert.match(src, /async function journeyOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);
    const ensure = src.slice(
      src.indexOf("export async function ensureRoutineJourney"),
      src.indexOf("function buildStatus"),
    );
    assert.match(ensure, /journeyOwnerUserId\(userId\)/);
    assert.match(ensure, /userId: ownerUserId/);
    assert.match(ensure, /eq\(routineJourneyTable\.userId, ownerUserId\)/);

    const record = src.slice(src.indexOf("export async function recordRoutineGeneration"));
    assert.match(record, /eq\(routineJourneyTable\.userId, row\.userId\)/);
  });

  it("coach journey ensure/record resolve subscription owner before read/write", () => {
    const src = readRepoFile("artifacts/api-server/src/services/coachJourneyService.ts");
    assert.match(src, /async function journeyOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);
    const ensure = src.slice(
      src.indexOf("export async function ensureCoachJourney"),
      src.indexOf("function buildStatus"),
    );
    assert.match(ensure, /journeyOwnerUserId\(userId\)/);
    assert.match(ensure, /userId: ownerUserId/);
    assert.match(ensure, /eq\(coachJourneyTable\.userId, ownerUserId\)/);

    const record = src.slice(src.indexOf("export async function recordCoachPlanCompleted"));
    assert.match(record, /eq\(coachJourneyTable\.userId, row\.userId\)/);
  });

  it("parent hub journey auth lookup + ensure key off alias owner", () => {
    const src = readRepoFile("artifacts/api-server/src/services/parentHubJourneyService.ts");
    assert.match(src, /async function journeyOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);
    const ensure = src.slice(
      src.indexOf("export async function ensureHubJourney"),
      src.indexOf("export async function getExistingHubJourneyForAuth"),
    );
    assert.match(ensure, /journeyOwnerUserId\(userId\)/);
    assert.match(ensure, /userId: ownerUserId/);
    assert.match(ensure, /eq\(parentHubJourneyTable\.userId, ownerUserId\)/);

    const auth = src.slice(
      src.indexOf("export async function getExistingHubJourneyForAuth"),
      src.indexOf("async function loadProgressSnapshot"),
    );
    assert.match(auth, /journeyOwnerUserId\(userId\)/);
    assert.match(auth, /eq\(parentHubJourneyTable\.userId, ownerUserId\)/);
  });

  it("parent hub feature_usage get/track resolve subscription owner", () => {
    const src = readRepoFile("artifacts/api-server/src/services/featureUsageService.ts");
    assert.match(src, /async function usageOwnerUserId/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId\)/);
    const getStatus = src.slice(
      src.indexOf("export async function getUserFeatureStatus"),
      src.indexOf("export async function trackFeatureUsage"),
    );
    assert.match(getStatus, /usageOwnerUserId\(userId\)/);
    const track = src.slice(
      src.indexOf("export async function trackFeatureUsage"),
      src.indexOf("export async function markAllFeaturesConverted"),
    );
    assert.match(track, /usageOwnerUserId\(userId\)/);
  });
});
