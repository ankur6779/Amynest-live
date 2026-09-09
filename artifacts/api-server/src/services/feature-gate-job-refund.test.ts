process.env.DATABASE_URL ??=
  "postgresql://test:test@127.0.0.1:5432/test?connect_timeout=1";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_GATE_REFUND_ON_AI_JOB_FAILURE,
  featureKeyForFailedAiJob,
} from "./subscriptionService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("feature-gate refund on async AI job failure", () => {
  it("maps lifetime infant + nutrition job types to feature keys", () => {
    assert.equal(featureKeyForFailedAiJob("infant.sleep_coach"), "infant_sleep_coach");
    assert.equal(featureKeyForFailedAiJob("infant.feeding_plan"), "infant_feeding_plan");
    assert.equal(featureKeyForFailedAiJob("meals.week_plan"), "nutrition_week_plan");
    assert.equal(featureKeyForFailedAiJob("meals.family_portions"), "nutrition_family_ai");
    assert.equal(featureKeyForFailedAiJob("openai.chat"), null);
    assert.equal(
      FEATURE_GATE_REFUND_ON_AI_JOB_FAILURE["meals.week_plan"],
      "nutrition_week_plan",
    );
  });

  it("patchJobRecord refunds feature-gate usage only on first failure transition", () => {
    const src = readFileSync(join(__dirname, "../queue/job-results.ts"), "utf8");
    assert.match(src, /maybeRefundFeatureGateUsage/);
    assert.match(src, /refundFeatureGateUsageFromFailedJob/);
    assert.match(src, /wasTerminal/);
    assert.match(
      src,
      /!wasTerminal &&[\s\S]*updated\.status === "failed" \|\| updated\.status === "timed_out"/,
    );
  });

  it("nutrition week-plan and family-portions debit before async enqueue", () => {
    const meals = readFileSync(join(__dirname, "../routes/meals.ts"), "utf8");
    assert.match(meals, /featureGate\("nutrition_week_plan"\)/);
    assert.match(meals, /type:\s*"meals\.week_plan"/);
    assert.match(meals, /waitMs:\s*35_000/);
    assert.match(meals, /featureGate\("nutrition_family_ai"\)/);
    assert.match(meals, /type:\s*"meals\.family_portions"/);
    assert.match(meals, /waitMs:\s*15_000/);
  });

  it("infant sleep/feeding routes debit before waitMs:0 async enqueue", () => {
    const sleep = readFileSync(
      join(__dirname, "../routes/infant-sleep-coach.ts"),
      "utf8",
    );
    const feeding = readFileSync(
      join(__dirname, "../routes/infant-feeding-plan.ts"),
      "utf8",
    );
    assert.match(sleep, /applyFeatureGate\(req, res, "infant_sleep_coach"/);
    assert.match(sleep, /waitMs:\s*0/);
    assert.match(feeding, /applyFeatureGate\(req, res, "infant_feeding_plan"/);
    assert.match(feeding, /waitMs:\s*0/);
  });
});
