import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

function readSource(relative: string): string {
  return readFileSync(join(__dir, relative), "utf8");
}

describe("device limit integration wiring", () => {
  it("mounts devices router before requireRegisteredDevice", () => {
    const src = readSource("../routes/index.ts");
    const devicesIdx = src.indexOf("router.use(devicesRouter)");
    const middlewareIdx = src.indexOf("router.use(requireRegisteredDevice)");
    assert.ok(devicesIdx > 0, "devices router missing");
    assert.ok(middlewareIdx > 0, "requireRegisteredDevice missing");
    assert.ok(devicesIdx < middlewareIdx, "devices must register before device middleware");
  });

  it("exposes device registration and management endpoints", () => {
    const src = readSource("../routes/devices.ts");
    assert.match(src, /router\.post\("\/devices\/register"/);
    assert.match(src, /router\.get\("\/devices"/);
    assert.match(src, /router\.delete\("\/devices\/:deviceId"/);
    assert.match(src, /router\.post\("\/devices\/release"/);
    assert.match(src, /router\.post\("\/devices\/replace"/);
  });

  it("enforces device header validation in middleware", () => {
    const src = readSource("../middlewares/requireRegisteredDevice.ts");
    assert.match(src, /getActiveDevice/);
    assert.match(src, /device_not_registered/);
  });

  it("grandfathers existing devices in registerOrRefreshDevice", () => {
    const src = readSource("../services/deviceLimitService.ts");
    assert.match(src, /existing\?\.isActive === 1/);
    assert.match(src, /decideDeviceRegistration/);
    assert.match(src, /transferDeviceIfNeeded/);
  });

  it("does not transfer occupancy when the new account is blocked at its own limit", () => {
    const src = readSource("../services/deviceLimitService.ts");
    const decideIdx = src.indexOf("const action = decideDeviceRegistration");
    const blockIdx = src.indexOf('if (action === "block")');
    const transferClaimIdx = src.lastIndexOf("await transferDeviceIfNeeded");
    assert.ok(decideIdx > 0 && blockIdx > decideIdx);
    assert.ok(transferClaimIdx > blockIdx, "claim transfer must happen after the block return");
  });
});
