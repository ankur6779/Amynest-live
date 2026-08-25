/**
 * Regression: concurrent/stale Health Lab flush must not wipe newer local XP
 * or clear a queue that advanced while a sync request was in flight.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultHealthLabState, saveHealthLabState, loadHealthLabState } from "./storage";
import {
  configureHealthLabSync,
  enqueueHealthLabSync,
  flushHealthLabSync,
  resetHealthLabSyncForTests,
} from "./health-lab-sync";

const CHILD = 4242;
const QUEUE_KEY = `amynest:health-lab-sync-queue:${CHILD}`;
const META_KEY = `amynest:health-lab-sync-meta:${CHILD}`;

describe("health-lab flush race", () => {
  beforeEach(() => {
    resetHealthLabSyncForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    resetHealthLabSyncForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("does not overwrite newer local progress when a stale flush completes last", async () => {
    const stale = { ...defaultHealthLabState(CHILD), totalXp: 10, level: 1 };
    const fresh = { ...defaultHealthLabState(CHILD), totalXp: 80, level: 3, coins: 20 };
    saveHealthLabState(stale);
    localStorage.setItem(META_KEY, "1000");
    localStorage.setItem(QUEUE_KEY, JSON.stringify([{ kind: "full", clientUpdatedAt: 1000 }]));

    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    let fetchCount = 0;
    const sentXp: number[] = [];

    configureHealthLabSync(async (_url, init) => {
      fetchCount += 1;
      if (init?.body) {
        sentXp.push(JSON.parse(String(init.body)).profile.totalXp as number);
      }
      if (fetchCount === 1) return fetchPromise;
      return new Response(JSON.stringify({ profile: fresh }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const flushPromise = flushHealthLabSync(CHILD);

    // Local play advances while the first sync is in flight.
    saveHealthLabState(fresh);
    localStorage.setItem(META_KEY, "2000");
    localStorage.setItem(QUEUE_KEY, JSON.stringify([{ kind: "full", clientUpdatedAt: 2000 }]));

    resolveFetch(
      new Response(JSON.stringify({ profile: stale }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await flushPromise;

    const loaded = loadHealthLabState(CHILD);
    expect(loaded.totalXp).toBe(80);
    expect(loaded.coins).toBe(20);
    expect(sentXp[0]).toBe(10);
    expect(fetchCount).toBe(2);
    expect(sentXp[1]).toBe(80);
  });

  it("single-flight coalesces concurrent flush callers", async () => {
    const state = { ...defaultHealthLabState(CHILD), totalXp: 5 };
    saveHealthLabState(state);
    localStorage.setItem(META_KEY, "1000");
    localStorage.setItem(QUEUE_KEY, JSON.stringify([{ kind: "full", clientUpdatedAt: 1000 }]));

    let resolveFirst!: (value: Response) => void;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    let fetchCount = 0;

    configureHealthLabSync(async () => {
      fetchCount += 1;
      if (fetchCount === 1) return first;
      return new Response(JSON.stringify({ profile: state }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const a = flushHealthLabSync(CHILD);
    const b = flushHealthLabSync(CHILD);
    expect(fetchCount).toBe(1);

    resolveFirst(
      new Response(JSON.stringify({ profile: state }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await Promise.all([a, b]);
    expect(fetchCount).toBeGreaterThanOrEqual(1);
    expect(fetchCount).toBeLessThanOrEqual(2);
  });

  it("enqueue after configure triggers flush without throwing", () => {
    configureHealthLabSync(async () => {
      return new Response(JSON.stringify({ profile: defaultHealthLabState(CHILD) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    saveHealthLabState(defaultHealthLabState(CHILD));
    expect(() => enqueueHealthLabSync(CHILD)).not.toThrow();
  });
});
