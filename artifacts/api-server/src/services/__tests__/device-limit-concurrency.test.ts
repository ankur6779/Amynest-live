import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAddNewDevice } from "../deviceLimitLogic.js";

/** In-memory per-user mutex mirroring pg_advisory_xact_lock semantics. */
class PerUserMutex {
  private tail = new Map<string, Promise<void>>();

  async run<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tail.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tail.set(userId, prev.then(() => gate));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/** Minimal registration model for race-condition simulation (no DB). */
class SimulatedDeviceRegistry {
  private active = new Map<string, Set<string>>();
  private mutex = new PerUserMutex();

  constructor(
    private readonly limit: number,
    private readonly useLock: boolean,
  ) {}

  private count(userId: string): number {
    return this.active.get(userId)?.size ?? 0;
  }

  private tryRegister(userId: string, deviceId: string): boolean {
    if (!canAddNewDevice(this.count(userId), this.limit)) return false;
    const set = this.active.get(userId) ?? new Set<string>();
    set.add(deviceId);
    this.active.set(userId, set);
    return true;
  }

  async register(userId: string, deviceId: string): Promise<boolean> {
    if (this.useLock) {
      return this.mutex.run(userId, () => this.registerSerial(userId, deviceId));
    }
    return this.registerRacy(userId, deviceId);
  }

  /** Mirrors unsafe read-check-write without re-validation (TOCTOU). */
  private async registerRacy(userId: string, deviceId: string): Promise<boolean> {
    if (!canAddNewDevice(this.count(userId), this.limit)) return false;
    await new Promise((r) => setTimeout(r, 5));
    const set = this.active.get(userId) ?? new Set<string>();
    set.add(deviceId);
    this.active.set(userId, set);
    return true;
  }

  /** Safe path: count + insert under mutex with re-check after await. */
  private async registerSerial(userId: string, deviceId: string): Promise<boolean> {
    if (!canAddNewDevice(this.count(userId), this.limit)) return false;
    await new Promise((r) => setTimeout(r, 2));
    return this.tryRegister(userId, deviceId);
  }

  activeCount(userId: string): number {
    return this.count(userId);
  }
}

describe("concurrent device registration (simulated)", () => {
  const userId = "user-race-test";
  const limit = 3;

  it("without per-user lock can exceed plan limit under parallel attempts", async () => {
    const registry = new SimulatedDeviceRegistry(limit, false);
    const attempts = Array.from({ length: 6 }, (_, i) =>
      registry.register(userId, `device-${i}`),
    );
    await Promise.all(attempts);
    assert.ok(
      registry.activeCount(userId) > limit,
      "unsynchronized path should demonstrate over-limit race",
    );
  });

  it("with per-user lock never exceeds plan limit", async () => {
    const registry = new SimulatedDeviceRegistry(limit, true);
    const attempts = Array.from({ length: 6 }, (_, i) =>
      registry.register(userId, `device-${i}`),
    );
    const results = await Promise.all(attempts);
    const successes = results.filter(Boolean).length;
    assert.equal(registry.activeCount(userId), limit);
    assert.equal(successes, limit);
  });

  it("replace path uses same advisory lock as register in service source", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "../deviceLimitService.ts"), "utf8");
    const registerBlock = src.slice(
      src.indexOf("registerOrRefreshDevice"),
      src.indexOf("export async function deactivateDevice"),
    );
    const replaceBlock = src.slice(
      src.indexOf("export async function replaceDevice"),
      src.indexOf("export async function replaceDevice") + 1200,
    );
    assert.match(registerBlock, /advisoryLockUser/);
    assert.match(replaceBlock, /advisoryLockUser/);
  });
});
