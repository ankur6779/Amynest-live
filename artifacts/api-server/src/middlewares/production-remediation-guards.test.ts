/**
 * Static + wiring guards for realtime debug route hardening.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

function readSource(name: string): string {
  return readFileSync(join(__dir, name), "utf8");
}

describe("Realtime debug route security", () => {
  it("mounts debug routers after requireAuth with realtimeDebugGuard", () => {
    const routes = readFileSync(join(__dir, "../routes/index.ts"), "utf8");
    const authIdx = routes.indexOf("router.use(requireAuth)");
    const guardIdx = routes.indexOf("router.use(realtimeDebugGuard)");
    const debugIdx = routes.indexOf("router.use(speechCoachV2DebugRouter)");
    assert.ok(authIdx >= 0);
    assert.ok(guardIdx > authIdx);
    assert.ok(debugIdx > guardIdx);
  });

  it("realtimeDebugGuard returns 404 in production deployment", () => {
    const guard = readSource("realtime-debug-guard.ts");
    assert.match(guard, /isProductionDeployment\(\)/);
    assert.match(guard, /status\(404\)/);
  });

  it("realtimeDebugGuard requires admin in non-production", () => {
    const guard = readSource("realtime-debug-guard.ts");
    assert.match(guard, /isAdminUser/);
    assert.match(guard, /status\(403\)/);
    assert.match(guard, /checkDistributedRateLimit/);
  });

  it("speech-coach-v2-debug does not expose mintResponse", () => {
    const src = readFileSync(join(__dir, "../routes/speech-coach-v2-debug.ts"), "utf8");
    assert.doesNotMatch(src, /mintResponse/);
    assert.doesNotMatch(src, /assertRealtimeDebugAllowed/);
  });

  it("openai-realtime-infra does not expose mintResponse", () => {
    const src = readFileSync(join(__dir, "../routes/openai-realtime-infra.ts"), "utf8");
    assert.doesNotMatch(src, /mintResponse/);
    assert.doesNotMatch(src, /assertInfraDebugAllowed/);
  });
});

describe("Feature gate fail-closed wiring", () => {
  it("routine generate gate returns 503 on failure", () => {
    const src = readSource("featureGate.ts");
    assert.match(src, /routine\.generate_gate_failed_closed/);
    assert.match(src, /status\(503\)/);
    assert.doesNotMatch(src, /routine\.generate_gate_failed_open/);
  });

  it("featureGate middleware catches errors with 503", () => {
    const src = readSource("featureGate.ts");
    assert.match(src, /feature_gate_failed_closed/);
    assert.match(src, /entitlement_check_unavailable/);
  });
});

describe("Premium grant hardening", () => {
  it("subscriptionService has no hardcoded premium emails", () => {
    const src = readFileSync(
      join(__dir, "../services/subscriptionService.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /HARDCODED_PREMIUM_EMAILS/);
    assert.doesNotMatch(src, /googleplay\.reviewer@amynest\.app/);
  });
});

describe("Birth Sky deletion wiring", () => {
  it("data-deletion-service purges birth sky tables", () => {
    const src = readFileSync(
      join(__dir, "../services/data-deletion-service.ts"),
      "utf8",
    );
    assert.match(src, /purgeBirthSkyUserData/);
    assert.match(src, /birth_sky_messages/);
    assert.match(src, /birth_profiles/);
    assert.match(src, /birth_sky_preferences/);
  });
});

describe("Device limit production default", () => {
  it("requireRegisteredDevice uses strict mode helper", () => {
    const src = readFileSync(
      join(__dir, "requireRegisteredDevice.ts"),
      "utf8",
    );
    assert.match(src, /deviceLimitStrict\(\)/);
    assert.match(src, /AMYNEST_ENV/);
  });
});

describe("PostgreSQL TLS", () => {
  it("db pool uses resolvePgSslOptions", () => {
    const src = readFileSync(
      join(__dir, "../../../../lib/db/src/index.ts"),
      "utf8",
    );
    assert.match(src, /resolvePgSslOptions/);
    assert.doesNotMatch(src, /rejectUnauthorized: false/);
  });

  it("ssl-config enables verification in production", () => {
    const src = readFileSync(
      join(__dir, "../../../../lib/db/src/ssl-config.ts"),
      "utf8",
    );
    assert.match(src, /rejectUnauthorized: true/);
  });
});

describe("Co-parent routine access", () => {
  it("routines uses caregiver-aware child lookup", () => {
    const src = readFileSync(join(__dir, "../routes/routines.ts"), "utf8");
    assert.match(src, /getChildByIdForUserOrCaregiver/);
    assert.match(src, /listAccessibleChildIds/);
    assert.match(src, /canAccessChild/);
  });
});
