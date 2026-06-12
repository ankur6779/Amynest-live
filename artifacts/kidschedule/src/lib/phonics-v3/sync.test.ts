import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  _resetPhonicsV3SyncForTests,
  flushPhonicsV3SyncQueue,
  hydratePhonicsV3Progress,
  persistPhonicsV3Mastery,
  persistPhonicsV3Fluency,
} from "./sync";
import { defaultMasteryState, recordMasteryEvent } from "./mastery-engine";
import { defaultFluencyState, recordWordAttempt } from "./fluency-tracker";
import { mergePhonicsV3Bundle } from "@workspace/phonics-v3-progress";

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
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
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
  return Object.assign(fetchMock, {
    getServerState: () => serverState,
  });
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
    expect(server.getServerState().mastery?.payload.words?.cat).toBeTruthy();
    expect(server.getServerState().mastery?.payload.words?.dog).toBeTruthy();
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
});
