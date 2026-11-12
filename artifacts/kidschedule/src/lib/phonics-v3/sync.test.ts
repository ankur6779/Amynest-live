import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  _resetPhonicsV3SyncForTests,
  flushPhonicsV3SyncQueue,
  hydratePhonicsV3Progress,
  persistPhonicsV3Mastery,
  persistPhonicsV3Fluency,
  persistPhonicsV3Mission,
  loadPhonicsV3MissionLocal,
} from "./sync";
import { defaultMasteryState, recordMasteryEvent } from "./mastery-engine";
import { defaultFluencyState, recordWordAttempt } from "./fluency-tracker";
import { mergePhonicsV3Bundle } from "@workspace/phonics-v3-progress";
import type { DailyReadingMission } from "@/lib/phonics-v2/daily-missions";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
});

vi.stubGlobal("navigator", { onLine: true });

function mockServer(progress: ReturnType<typeof mergePhonicsV3Bundle> extends never ? never : object) {
  let serverState = progress;
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    const path = String(url);
    if (path.includes("/sync") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const local = {
        mastery: body.mastery ?? null,
        fluency: body.fluency ?? null,
        stories: body.stories ?? null,
        missions: body.missions ?? null,
        retention: body.retention ?? null,
      };
      serverState = mergePhonicsV3Bundle(local, serverState as never);
      return new Response(JSON.stringify({ ok: true, progress: serverState }), { status: 200 });
    }
    if (path.includes("/progress/")) {
      return new Response(JSON.stringify({ ok: true, progress: serverState }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  });
}

function mission(dateKey: string, completedCount: number): DailyReadingMission {
  const tasks = Array.from({ length: 3 }, (_, i) => ({
    slot: "practice" as const,
    id: `t${i}`,
    emoji: "📖",
    label: `Task ${i}`,
    completed: i < completedCount,
  }));
  return {
    dateKey,
    tasks,
    estimatedMinutes: 5,
    streakDay: 1,
    completed: completedCount >= 3,
  };
}

describe("phonics-v3 sync", () => {
  beforeEach(() => {
    store.clear();
    _resetPhonicsV3SyncForTests();
  });

  it("survives browser cache clear via server restore", async () => {
    const childId = 42;
    let state = defaultMasteryState();
    state = recordMasteryEvent(state, "word", "cat", "heard");
    persistPhonicsV3Mastery(childId, state);

    const server = mockServer({
      mastery: null,
      fluency: null,
      stories: null,
      missions: null,
      retention: null,
    });
    await flushPhonicsV3SyncQueue(childId, server);

    store.clear();

    await hydratePhonicsV3Progress(childId, server);
    const restored = JSON.parse(store.get("amynest:phonics-v3-mastery:42") ?? "{}");
    expect(restored.words?.cat?.counts?.heard).toBe(1);
  });

  it("second device login receives merged progress", async () => {
    const childId = 7;
    const serverState = {
      mastery: {
        payload: defaultMasteryState(),
        clientUpdatedAt: 100,
      },
      fluency: {
        payload: { ...defaultFluencyState(), wordsAttemptedTotal: 5 },
        clientUpdatedAt: 200,
      },
      stories: null,
      missions: null,
      retention: null,
    };
    serverState.mastery.payload = recordMasteryEvent(
      serverState.mastery.payload,
      "word",
      "dog",
      "blended",
    );

    const server = mockServer(serverState);
    let local = defaultMasteryState();
    local = recordMasteryEvent(local, "word", "cat", "heard");
    persistPhonicsV3Mastery(childId, local);

    await hydratePhonicsV3Progress(childId, server);
    const merged = JSON.parse(store.get("amynest:phonics-v3-mastery:7") ?? "{}");
    expect(merged.words?.cat).toBeTruthy();
    expect(merged.words?.dog).toBeTruthy();
  });

  it("offline writes queue then sync when online", async () => {
    const childId = 99;
    vi.stubGlobal("navigator", { onLine: false });

    let fluency = defaultFluencyState();
    fluency = recordWordAttempt(fluency, true);
    persistPhonicsV3Fluency(childId, fluency);

    const queue = JSON.parse(store.get("amynest:phonics-v3-sync-queue:99") ?? "[]");
    expect(queue.length).toBeGreaterThan(0);

    vi.stubGlobal("navigator", { onLine: true });
    const server = mockServer({
      mastery: null,
      fluency: null,
      stories: null,
      missions: null,
      retention: null,
    });
    const ok = await flushPhonicsV3SyncQueue(childId, server);
    expect(ok).toBe(true);
    expect(JSON.parse(store.get("amynest:phonics-v3-sync-queue:99") ?? "[]")).toHaveLength(0);
  });

  it("profile switch keeps separate child keys", () => {
    const childA = 1;
    const childB = 2;
    let mA = defaultMasteryState();
    mA = recordMasteryEvent(mA, "word", "cat", "heard");
    persistPhonicsV3Mastery(childA, mA);

    let mB = defaultMasteryState();
    mB = recordMasteryEvent(mB, "word", "dog", "heard");
    persistPhonicsV3Mastery(childB, mB);

    const a = JSON.parse(store.get("amynest:phonics-v3-mastery:1") ?? "{}");
    const b = JSON.parse(store.get("amynest:phonics-v3-mastery:2") ?? "{}");
    expect(a.words?.cat).toBeTruthy();
    expect(a.words?.dog).toBeFalsy();
    expect(b.words?.dog).toBeTruthy();
    expect(b.words?.cat).toBeFalsy();
  });

  it("hydrate keeps server today mission over stale yesterday local (no nowMs stamp)", async () => {
    const childId = 55;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    // Stale local: yesterday's empty mission with an OLD meta watermark.
    // Pre-fix bundleFromLocal stamped nowMs() so this would beat server today.
    store.set(`amynest:phonics-v2-mission:${childId}`, JSON.stringify(mission(yesterday, 0)));
    store.set(
      `amynest:phonics-v3-sync-meta:${childId}`,
      JSON.stringify({ missions: 1_000 }),
    );

    const completedToday = mission(today, 3);
    const server = mockServer({
      mastery: null,
      fluency: null,
      stories: null,
      missions: { payload: completedToday, clientUpdatedAt: 5_000 },
      retention: null,
    });

    await hydratePhonicsV3Progress(childId, server);
    const restored = loadPhonicsV3MissionLocal(childId);
    expect(restored?.dateKey).toBe(today);
    expect(restored?.tasks.filter((t) => t.completed)).toHaveLength(3);
    expect(restored?.completed).toBe(true);
  });

  it("flush does not LWW-wipe completed today with virgin wrong-dateKey local", async () => {
    const childId = 56;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    store.set(`amynest:phonics-v2-mission:${childId}`, JSON.stringify(mission(yesterday, 0)));
    store.set(
      `amynest:phonics-v3-sync-meta:${childId}`,
      JSON.stringify({ missions: 1_000 }),
    );
    // Force a missions domain flush (as DailyMissionPanel virgin persist used to).
    store.set(
      `amynest:phonics-v3-sync-queue:${childId}`,
      JSON.stringify([{ domain: "missions", clientUpdatedAt: Date.now() }]),
    );

    const completedToday = mission(today, 3);
    const server = mockServer({
      mastery: null,
      fluency: null,
      stories: null,
      missions: { payload: completedToday, clientUpdatedAt: 5_000 },
      retention: null,
    });

    const ok = await flushPhonicsV3SyncQueue(childId, server);
    expect(ok).toBe(true);
    const restored = loadPhonicsV3MissionLocal(childId);
    expect(restored?.dateKey).toBe(today);
    expect(restored?.tasks.filter((t) => t.completed)).toHaveLength(3);
  });

  it("real persist + hydrate on second device restores completed mission", async () => {
    const childId = 57;
    const today = new Date().toISOString().slice(0, 10);
    const completedToday = mission(today, 3);

    const server = mockServer({
      mastery: null,
      fluency: null,
      stories: null,
      missions: null,
      retention: null,
    });

    persistPhonicsV3Mission(childId, completedToday);
    await flushPhonicsV3SyncQueue(childId, server);

    // Device B: only yesterday locally, then hydrate.
    store.clear();
    _resetPhonicsV3SyncForTests();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    store.set(`amynest:phonics-v2-mission:${childId}`, JSON.stringify(mission(yesterday, 1)));
    store.set(
      `amynest:phonics-v3-sync-meta:${childId}`,
      JSON.stringify({ missions: 100 }),
    );

    await hydratePhonicsV3Progress(childId, server);
    const restored = loadPhonicsV3MissionLocal(childId);
    expect(restored?.dateKey).toBe(today);
    expect(restored?.completed).toBe(true);
  });
});
