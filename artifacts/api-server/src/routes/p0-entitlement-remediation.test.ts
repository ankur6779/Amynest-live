import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isInfantAgeMonths } from "../lib/infant-age.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readRouteSource(filename: string): string {
  return readFileSync(join(__dirname, filename), "utf8");
}

describe("P0 entitlement remediation — route guards", () => {
  it("does not trust client childAgeMonths for assistant AI quota routing", () => {
    const gate = readRouteSource("../middlewares/assistantAiUsageGate.ts");
    assert.doesNotMatch(gate, /parseChildAgeMonthsFromBody/);
    assert.match(gate, /resolveInfantAiQuotaFromDb/);
  });

  it("removes ai_query gate from infant sleep coach POST", () => {
    const src = readRouteSource("infant-sleep-coach.ts");
    assert.doesNotMatch(src, /aiUsageGate/);
    assert.match(src, /applyFeatureGate\(req, res, "infant_sleep_coach"/);
    assert.match(src, /if \(!isInfantAgeMonths\(child\.ageMonths\)\)/);
  });

  it("removes ai_query gate from infant feeding plan POST", () => {
    const src = readRouteSource("infant-feeding-plan.ts");
    assert.doesNotMatch(src, /aiUsageGate/);
    assert.match(src, /applyFeatureGate\(req, res, "infant_feeding_plan"/);
    assert.match(src, /if \(!isFeedingPlanAge\(child\.ageMonths\)\)/);
  });

  it("gates GPT meal endpoints behind ai_query", () => {
    const src = readRouteSource("meals.ts");
    const generateBlock = src.slice(
      src.indexOf('router.get("/meals/generate"'),
      src.indexOf('router.post("/meals/ai-generate"'),
    );
    const aiGenerateBlock = src.slice(
      src.indexOf('router.post("/meals/ai-generate"'),
      src.indexOf('router.post("/meals/week-plan"'),
    );
    assert.match(generateBlock, /applyFeatureGate\(req, res, "ai_query"/);
    assert.match(aiGenerateBlock, /applyFeatureGate\(req, res, "ai_query"/);
  });

  it("gates coach next-win and rewrite-tip behind ai_query", () => {
    const coach = readRouteSource("ai-coach.ts");
    assert.match(coach, /router\.post\("\/ai-coach\/next-win", aiUsageGate/);
    assert.match(coach, /router\.post\("\/coach\/next-win", aiUsageGate/);

    const ai = readRouteSource("ai.ts");
    assert.match(ai, /router\.post\("\/ai\/rewrite-tip", aiUsageGate/);
  });

  it("defers infant feature gate until after cache lookup", () => {
    const sleepPost = readRouteSource("infant-sleep-coach.ts").slice(
      readRouteSource("infant-sleep-coach.ts").indexOf('router.post(\n  "/infant-sleep/coach-plan"'),
    );
    const feedingPost = readRouteSource("infant-feeding-plan.ts").slice(
      readRouteSource("infant-feeding-plan.ts").indexOf('router.post(\n  "/infant-feeding/plan"'),
    );
    for (const [name, block] of [
      ["infant-sleep-coach.ts", sleepPost],
      ["infant-feeding-plan.ts", feedingPost],
    ] as const) {
      const cacheHitIdx = block.indexOf("cached: true");
      const gateIdx = block.indexOf("applyFeatureGate");
      assert.ok(cacheHitIdx > 0, `${name} should return cached plans`);
      assert.ok(gateIdx > cacheHitIdx, `${name} should gate only after cache miss`);
    }
  });
});

describe("P0 entitlement remediation — age ceiling", () => {
  it("blocks 24+ month children from infant premium surfaces", () => {
    assert.equal(isInfantAgeMonths(23), true);
    assert.equal(isInfantAgeMonths(24), false);
    assert.equal(isInfantAgeMonths(36), false);
  });

  it("weekly sleep report rejects out-of-range ages in route source", () => {
    const src = readRouteSource("infant-sleep-coach.ts");
    const weeklyBlock = src.slice(src.indexOf('router.post("/infant-sleep/weekly-report"'));
    assert.match(weeklyBlock, /if \(!isInfantAgeMonths\(ageMonths\)\)/);
  });
});
