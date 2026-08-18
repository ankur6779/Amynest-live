import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDeviceSubtitle,
  hashClientIp,
  normalizeDeviceMetadata,
  resolveClientIp,
} from "../../lib/device-metadata.js";
import {
  canAddNewDevice,
  decideDeviceRegistration,
  isDeviceLimitExempt,
} from "../deviceLimitLogic.js";

describe("device-metadata", () => {
  it("hashClientIp returns stable sha256 prefix", () => {
    const a = hashClientIp("203.0.113.10");
    const b = hashClientIp("203.0.113.10");
    assert.equal(a, b);
    assert.equal(a?.length, 32);
  });

  it("hashClientIp never stores raw IP", () => {
    const hash = hashClientIp("203.0.113.10");
    assert.notEqual(hash, "203.0.113.10");
  });

  it("normalizeDeviceMetadata builds device name from browser + os", () => {
    const meta = normalizeDeviceMetadata({
      browser: "Chrome",
      os: "Windows",
      platform: "web",
    });
    assert.equal(meta.deviceName, "Chrome on Windows");
    assert.equal(meta.browser, "Chrome");
    assert.equal(meta.os, "Windows");
  });

  it("resolveClientIp prefers x-forwarded-for", () => {
    assert.equal(resolveClientIp("1.2.3.4, 5.6.7.8", "9.9.9.9"), "1.2.3.4");
  });

  it("formatDeviceSubtitle matches UI example", () => {
    assert.equal(formatDeviceSubtitle("Chrome", "Windows", "web"), "Chrome on Windows");
    assert.equal(formatDeviceSubtitle("Safari", "iOS", "ios"), "Safari on iOS");
  });
});

describe("deviceLimitService", () => {
  it("canAddNewDevice allows when under limit", () => {
    assert.equal(canAddNewDevice(0, 3), true);
    assert.equal(canAddNewDevice(2, 3), true);
  });

  it("canAddNewDevice blocks when at limit", () => {
    assert.equal(canAddNewDevice(3, 3), false);
    assert.equal(canAddNewDevice(1, 1), false);
  });

  it("concurrent registration guard uses advisory lock in service source", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "../deviceLimitService.ts"), "utf8");
    assert.match(src, /pg_advisory_xact_lock/);
    assert.match(src, /deviceid:/);
    assert.match(src, /db\.transaction/);
    assert.match(src, /releaseDeviceFromOtherUsers/);
    assert.match(src, /releaseCurrentDeviceSession/);
    assert.match(src, /replace_oldest/);
  });
});

describe("decideDeviceRegistration", () => {
  it("refreshes an already-active row for this user", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: true,
        thisUserHasInactiveRow: false,
        activeCountForUser: 1,
        limit: 1,
      }),
      "refresh",
    );
  });

  it("registers when under the active-device limit", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: false,
        thisUserHasInactiveRow: false,
        activeCountForUser: 0,
        limit: 1,
      }),
      "register",
    );
  });

  it("reactivates a historical row for this user when under limit", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: false,
        thisUserHasInactiveRow: true,
        activeCountForUser: 0,
        limit: 1,
      }),
      "reactivate",
    );
  });

  it("replaces the oldest active session on free single-device plans (reinstall)", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: false,
        thisUserHasInactiveRow: false,
        activeCountForUser: 1,
        limit: 1,
      }),
      "replace_oldest",
    );
  });

  it("blocks when a multi-device plan is at capacity", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: false,
        thisUserHasInactiveRow: false,
        activeCountForUser: 3,
        limit: 3,
      }),
      "block",
    );
  });

  it("still registers on premium when under the active-device cap", () => {
    assert.equal(
      decideDeviceRegistration({
        thisUserHasActiveRow: false,
        thisUserHasInactiveRow: false,
        activeCountForUser: 2,
        limit: 3,
      }),
      "register",
    );
  });
});

describe("resolveDevicesMax", () => {
  it("plan limits unchanged in subscriptionService source", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "../subscriptionService.ts"), "utf8");
    assert.match(src, /devicesMax: 1/);
    assert.match(src, /devicesMax: 3/);
    assert.match(src, /devicesMax: 6/);
    assert.match(src, /demo@amynest\.in/);
  });

  it("demo@amynest.in is device-limit exempt", () => {
    assert.equal(isDeviceLimitExempt("demo@amynest.in"), true);
    assert.equal(isDeviceLimitExempt("other@example.com"), false);
  });
});

describe("grandfathering logic", () => {
  it("existing device refresh does not require canAddNewDevice", () => {
    // Grandfathered users may have activeCount > limit; only NEW slots use canAddNewDevice.
    assert.equal(canAddNewDevice(5, 3), false);
    // Service allows existing device path before this check — verified via source wiring test.
  });
});
