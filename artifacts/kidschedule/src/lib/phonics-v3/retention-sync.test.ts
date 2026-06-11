import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  _resetPhonicsV3SyncForTests,
  flushPhonicsV3SyncQueue,
  hydratePhonicsV3Progress,
  persistPhonicsV3Retention,
} from "./sync";
import {
  REVIEW_INTERVALS_DAYS,
  advanceReviewStage,
  defaultRetentionState,
  introduceSkill,
  loadRetentionState,
  recordReviewOutcome,
  retentionPayloadToState,
  retentionStateToPayload,
  scheduleNextReviewAt,
  skillTrackKey,
} from "./spaced-repetition";
import {
  mergePhonicsV3Bundle,
  mergeRetentionPayload,
  type PhonicsV3ProgressBundle,
} from "@workspace/phonics-v3-progress";

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

const emptyServer = (): PhonicsV3ProgressBundle => ({
  mastery: null,
  fluency: null,
  stories: null,
  missions: null,
  retention: null,
});

function mockServer(initial: PhonicsV3ProgressBundle) {
  let serverState = initial;
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
      serverState = mergePhonicsV3Bundle(local, serverState);
      return new Response(JSON.stringify({ ok: true, progress: serverState }), { status: 200 });
    }
    if (path.includes("/progress/")) {
      return new Response(JSON.stringify({ ok: true, progress: serverState }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  });
}

describe("retention cloud sync certification", () => {
  beforeEach(() => {
    store.clear();
    _resetPhonicsV3SyncForTests();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("migrates legacy localStorage key amynest:phonics-v3-retention on hydrate upload", async () => {
    const childId = 10;
    const start = Date.UTC(2026, 0, 1);
    let retention = introduceSkill(defaultRetentionState(), "word", "cat", start);
    retention = recordReviewOutcome(retention, "word", "cat", true, start + 86_400_000);
    persistPhonicsV3Retention(childId, retention);

    const server = mockServer(emptyServer());
    await flushPhonicsV3SyncQueue(childId, server);

    store.clear();
    await hydratePhonicsV3Progress(childId, server);

    const restored = loadRetentionState(childId);
    const track = restored.tracks[skillTrackKey("word", "cat")];
    expect(track?.reviewStage).toBe(2);
    expect(track?.retentionScore).toBeGreaterThan(50);
  });

  it("device A review advance restores on device B", async () => {
    const childId = 55;
    const start = Date.UTC(2026, 0, 1);

    let deviceA = introduceSkill(defaultRetentionState(), "word", "ship", start);
    for (let stage = 1; stage < 4; stage++) {
      deviceA = recordReviewOutcome(deviceA, "word", "ship", true, start + stage * 86_400_000);
    }
    const trackA = deviceA.tracks[skillTrackKey("word", "ship")]!;
    expect(trackA.reviewStage).toBe(4);
    expect(REVIEW_INTERVALS_DAYS[trackA.reviewStage]).toBe(14);

    persistPhonicsV3Retention(childId, deviceA);
    const server = mockServer(emptyServer());
    await flushPhonicsV3SyncQueue(childId, server);

    store.clear();
    await hydratePhonicsV3Progress(childId, server);
    const deviceB = loadRetentionState(childId);
    const trackB = deviceB.tracks[skillTrackKey("word", "ship")]!;

    expect(trackB.reviewStage).toBe(4);
    expect(trackB.nextReviewAt).toBe(trackA.nextReviewAt);
    expect(trackB.retentionScore).toBe(trackA.retentionScore);
    expect(trackB.consecutivePasses).toBe(trackA.consecutivePasses);
  });

  it("survives cache clear via server restore", async () => {
    const childId = 77;
    const now = Date.UTC(2026, 5, 1);
    let retention = introduceSkill(defaultRetentionState(), "word", "dog", now);
    retention = recordReviewOutcome(retention, "word", "dog", false, now + 1000);
    persistPhonicsV3Retention(childId, retention);

    const server = mockServer(emptyServer());
    await flushPhonicsV3SyncQueue(childId, server);
    store.clear();

    await hydratePhonicsV3Progress(childId, server);
    const restored = loadRetentionState(childId);
    expect(restored.tracks[skillTrackKey("word", "dog")]?.consecutiveFails).toBe(1);
  });

  it("offline retention writes queue then sync when online", async () => {
    const childId = 88;
    vi.stubGlobal("navigator", { onLine: false });

    const retention = introduceSkill(defaultRetentionState(), "word", "hat");
    persistPhonicsV3Retention(childId, retention);

    const queue = JSON.parse(store.get("amynest:phonics-v3-sync-queue:88") ?? "[]");
    expect(queue.some((q: { domain: string }) => q.domain === "retention")).toBe(true);

    vi.stubGlobal("navigator", { onLine: true });
    const server = mockServer(emptyServer());
    const ok = await flushPhonicsV3SyncQueue(childId, server);
    expect(ok).toBe(true);
    expect(JSON.parse(store.get("amynest:phonics-v3-sync-queue:88") ?? "[]")).toHaveLength(0);
  });

  it("conflict merge keeps advanced review stage and day-14 schedule", () => {
    const start = Date.UTC(2026, 0, 1);
    const key = skillTrackKey("word", "chip");

    const localPayload = retentionStateToPayload(
      recordReviewOutcome(
        introduceSkill(defaultRetentionState(), "word", "chip", start),
        "word",
        "chip",
        true,
        start + 86_400_000,
      ),
    );
    const remotePayload = retentionStateToPayload(
      introduceSkill(defaultRetentionState(), "word", "chip", start),
    );

    const merged = mergeRetentionPayload(localPayload, remotePayload);
    const track = merged.tracks[key]!;
    expect(track.reviewStage).toBe(2);
    expect(track.nextReviewAt).toBe(
      scheduleNextReviewAt(start + 86_400_000, advanceReviewStage(1)),
    );
  });

  it("payload round-trip preserves reviewStage, nextReviewAt, retentionScore, streaks", () => {
    const start = Date.UTC(2026, 0, 1);
    let state = introduceSkill(defaultRetentionState(), "word", "pin", start);
    state = recordReviewOutcome(state, "word", "pin", true, start + 5000);
    state = recordReviewOutcome(state, "word", "pin", false, start + 6000);

    const payload = retentionStateToPayload(state);
    const track = payload.tracks[skillTrackKey("word", "pin")]!;
    expect(track.reviewStage).toBeDefined();
    expect(track.nextReviewAt).toBeGreaterThan(start);
    expect(track.retentionScore).toBeGreaterThan(0);
    expect(track.failStreak).toBe(1);
    expect(track.passStreak).toBe(0);
    expect(track.lastReviewedAt).toBe(start + 6000);

    const roundTrip = retentionPayloadToState(payload);
    expect(roundTrip.tracks[skillTrackKey("word", "pin")]?.reviewStage).toBe(
      state.tracks[skillTrackKey("word", "pin")]?.reviewStage,
    );
  });

  it("reinstall scenario: empty local + server retention restores schedules", async () => {
    const childId = 99;
    const start = Date.UTC(2026, 0, 1);
    let retention = introduceSkill(defaultRetentionState(), "word", "ring", start);
    retention = recordReviewOutcome(retention, "word", "ring", true, start + 1);
    retention = recordReviewOutcome(retention, "word", "ring", true, start + 2);

    const serverState = emptyServer();
    serverState.retention = {
      payload: retentionStateToPayload(retention),
      clientUpdatedAt: 5000,
    };
    const server = mockServer(serverState);

    store.clear();
    await hydratePhonicsV3Progress(childId, server);
    const restored = loadRetentionState(childId);
    expect(restored.tracks[skillTrackKey("word", "ring")]?.reviewStage).toBe(3);
  });
});
