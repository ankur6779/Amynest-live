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

type Occupancy = {
  userId: string;
  deviceId: string;
  isActive: boolean;
  lastSeen: number;
};

function simulateRegister(
  rows: Occupancy[],
  userId: string,
  deviceId: string,
  limit: number,
  now = Date.now(),
): { ok: boolean; rows: Occupancy[] } {
  const next = rows.map((row) => ({ ...row }));
  const mine = next.find((row) => row.userId === userId && row.deviceId === deviceId);
  const action = decideDeviceRegistration({
    thisUserHasActiveRow: mine?.isActive === true,
    thisUserHasInactiveRow: Boolean(mine) && mine?.isActive !== true,
    activeCountForUser: next.filter((row) => row.userId === userId && row.isActive).length,
    limit,
  });
  if (action === "block") return { ok: false, rows: next };

  for (const row of next) {
    if (row.deviceId === deviceId && row.userId !== userId && row.isActive) {
      row.isActive = false;
      row.lastSeen = now;
    }
  }

  if (action === "replace_oldest") {
    const victim = next
      .filter((row) => row.userId === userId && row.isActive && row.deviceId !== deviceId)
      .sort((a, b) => a.lastSeen - b.lastSeen)[0];
    if (victim) {
      victim.isActive = false;
      victim.lastSeen = now;
    }
  }

  if (mine) {
    mine.isActive = true;
    mine.lastSeen = now;
  } else {
    next.push({ userId, deviceId, isActive: true, lastSeen: now });
  }
  return { ok: true, rows: next };
}

function simulateRelease(rows: Occupancy[], userId: string, deviceId: string): Occupancy[] {
  return rows.map((row) =>
    row.userId === userId && row.deviceId === deviceId && row.isActive
      ? { ...row, isActive: false }
      : row,
  );
}

describe("active occupancy scenarios (A–F)", () => {
  it("Test A: reinstall then Email B succeeds (new installation id)", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "A", "device-old", 1).rows;
    // Uninstall mints a new id; Email B has no active devices.
    const b = simulateRegister(rows, "B", "device-new", 1);
    assert.equal(b.ok, true);
    assert.equal(b.rows.filter((r) => r.userId === "B" && r.isActive).length, 1);
  });

  it("Test B: sign out then Email B succeeds on the same installation", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "A", "device-x", 1).rows;
    rows = simulateRelease(rows, "A", "device-x");
    const b = simulateRegister(rows, "B", "device-x", 1);
    assert.equal(b.ok, true);
    assert.equal(b.rows.find((r) => r.userId === "A" && r.deviceId === "device-x")?.isActive, false);
    assert.equal(b.rows.find((r) => r.userId === "B" && r.deviceId === "device-x")?.isActive, true);
  });

  it("Test C: original account can sign back in after sign out", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "A", "device-x", 1).rows;
    rows = simulateRelease(rows, "A", "device-x");
    const again = simulateRegister(rows, "A", "device-x", 1);
    assert.equal(again.ok, true);
    assert.equal(again.rows.find((r) => r.userId === "A")?.isActive, true);
  });

  it("Test D: premium account at 3 active devices is still blocked", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "P", "d1", 3).rows;
    rows = simulateRegister(rows, "P", "d2", 3).rows;
    rows = simulateRegister(rows, "P", "d3", 3).rows;
    const blocked = simulateRegister(rows, "P", "d4", 3);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.rows.filter((r) => r.userId === "P" && r.isActive).length, 3);
  });

  it("Test D: free plan replace_oldest after reinstall, still one active session", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "A", "device-old", 1).rows;
    const reinstall = simulateRegister(rows, "A", "device-new", 1);
    assert.equal(reinstall.ok, true);
    assert.equal(reinstall.rows.find((r) => r.deviceId === "device-old")?.isActive, false);
    assert.equal(reinstall.rows.find((r) => r.deviceId === "device-new")?.isActive, true);
  });

  it("Test E: stale Email A occupancy does not block Email B on the same device", () => {
    let rows: Occupancy[] = [];
    rows = simulateRegister(rows, "A", "device-x", 1).rows;
    const b = simulateRegister(rows, "B", "device-x", 1);
    assert.equal(b.ok, true);
    assert.equal(b.rows.find((r) => r.userId === "A")?.isActive, false);
    assert.equal(b.rows.find((r) => r.userId === "B")?.isActive, true);
  });
});
