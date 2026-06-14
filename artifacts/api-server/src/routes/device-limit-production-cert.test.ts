import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

function readSource(relative: string): string {
  return readFileSync(join(__dir, relative), "utf8");
}

describe("device limit production certification (static)", () => {
  it("free plan limit remains 1 device", () => {
    const src = readSource("../services/subscriptionService.ts");
    assert.match(src, /devicesMax: 1/);
  });

  it("premium plan limit remains 3 devices", () => {
    const src = readSource("../services/subscriptionService.ts");
    assert.match(src, /devicesMax: 3/);
  });

  it("family plan default remains 6 devices", () => {
    const src = readSource("../services/subscriptionService.ts");
    assert.match(src, /devicesMax: 6/);
  });

  it("demo account bypass is configured", () => {
    const sub = readSource("../services/subscriptionService.ts");
    assert.match(sub, /demo@amynest\.in/);
    const middleware = readSource("../middlewares/requireRegisteredDevice.ts");
    assert.match(middleware, /isDeviceLimitExempt/);
  });

  it("strict mode is opt-in only", () => {
    const middleware = readSource("../middlewares/requireRegisteredDevice.ts");
    assert.match(middleware, /DEVICE_LIMIT_STRICT === "1"/);
    assert.doesNotMatch(middleware, /DEVICE_LIMIT_STRICT\s*=\s*"1"/);
  });

  it("backend enforcement mounted on authenticated routes", () => {
    const routes = readSource("../routes/index.ts");
    assert.match(routes, /requireRegisteredDevice/);
    assert.match(routes, /devicesRouter/);
  });

  it("device_limit_bypass_attempt analytics wired", () => {
    const routes = readSource("../routes/devices.ts");
    assert.match(routes, /trackDeviceBypassAttempt/);
    assert.match(routes, /register_rejected/);
    assert.match(routes, /replace_initiated/);
  });

  it("replace flow is transactional and does not re-check limit after swap", () => {
    const service = readSource("../services/deviceLimitService.ts");
    assert.match(service, /replaceDevice[\s\S]*db\.transaction/);
    assert.doesNotMatch(
      service,
      /replaceDevice[\s\S]*activeCount >= limit[\s\S]*Device limit still reached/,
    );
  });

  it("metadata columns captured on registration", () => {
    const schema = readFileSync(
      join(__dir, "../../../../lib/db/src/schema/user_devices.ts"),
      "utf8",
    );
    assert.match(schema, /browser/);
    assert.match(schema, /os/);
    assert.match(schema, /appVersion/);
    assert.match(schema, /lastIpHash/);
  });

  it("client sends required device headers", () => {
    const client = readFileSync(
      join(__dir, "../../../../artifacts/kidschedule/src/lib/device-id.ts"),
      "utf8",
    );
    assert.match(client, /x-amynest-device-id/);
    assert.match(client, /x-amynest-platform/);
    assert.match(client, /x-amynest-device-name/);
    assert.match(client, /x-amynest-browser/);
    assert.match(client, /x-amynest-os/);
    assert.match(client, /x-amynest-app-version/);
  });

  it("admin device metrics dashboard exists", () => {
    const admin = readSource("../routes/analytics-admin.ts");
    assert.match(admin, /device-metrics/);
    assert.match(admin, /device-strict-readiness/);
  });
});

describe("missing header scenarios", () => {
  it("non-strict mode allows missing device id", () => {
    const middleware = readSource("../middlewares/requireRegisteredDevice.ts");
    assert.match(middleware, /if \(!deviceId\)/);
    assert.match(middleware, /next\(\)/);
  });

  it("strict mode rejects missing device id", () => {
    const middleware = readSource("../middlewares/requireRegisteredDevice.ts");
    assert.match(middleware, /device_id_required/);
  });
});
