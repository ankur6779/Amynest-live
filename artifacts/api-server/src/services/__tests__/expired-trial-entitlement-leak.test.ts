import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSrc(rel: string): string {
  return readFileSync(join(__dirname, rel), "utf8");
}

describe("expired-trial entitlement leak — fail-closed architecture", () => {
  it("feature gates never fail-open on lookup errors", () => {
    const featureGate = readSrc("../../middlewares/featureGate.ts");
    assert.doesNotMatch(featureGate, /generate_gate_failed_open/);
    assert.match(featureGate, /generate_gate_failed_closed/);
    assert.match(featureGate, /feature\.gate_failed_closed/);
    assert.match(featureGate, /decision: "UNKNOWN"/);
  });

  it("hub module gate uses the authoritative resolver and existing journey", () => {
    const hub = readSrc("../hubModuleGateService.ts");
    assert.match(hub, /resolveEntitlementDecision/);
    assert.match(hub, /getExistingHubJourneyForAuth/);
    assert.match(hub, /entitlement_unknown/);
    assert.doesNotMatch(hub, /getHubJourneyStatus/);
  });

  it("premium-only hub middleware ignores client entitlement fields", () => {
    const mw = readSrc("../../middlewares/hubModuleGate.ts");
    assert.match(mw, /resolveEntitlementDecision/);
    assert.doesNotMatch(mw, /req\.body\?\.(isPremium|entitlement|subscriptionStatus)/);
    assert.match(mw, /decision: "UNKNOWN"/);
  });

  it("requirePremium is the weekly-report security boundary", () => {
    const family = readSrc("../../routes/family-intelligence.ts");
    const child = readSrc("../../routes/child-intelligence.ts");
    assert.match(family, /requirePremium\("weekly_reports"\)/);
    assert.match(child, /requirePremium\("weekly_reports"\)/);
  });

  it("requirePremium never reads client-supplied premium flags", () => {
    const src = readSrc("../../middlewares/requirePremium.ts");
    assert.match(src, /resolveEntitlementDecision/);
    assert.doesNotMatch(src, /req\.body/);
    assert.doesNotMatch(src, /req\.query/);
    assert.doesNotMatch(src, /req\.headers\["x-premium"\]/);
  });

  it("subscription GET fallback is free-tier deny, not premium", () => {
    const fallbacks = readSrc("../../lib/api-fallbacks.ts");
    assert.match(fallbacks, /isPremium: false/);
    assert.match(fallbacks, /canAccessHealthLab: false/);
    assert.match(fallbacks, /canAccessWeeklyReports: false/);
    assert.match(fallbacks, /allPremiumAccess: false/);
  });
});
