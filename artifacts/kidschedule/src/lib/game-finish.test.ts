import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingPlaySync,
  durableFinishGame,
  enqueuePlaySync,
  flushPendingPlaySync,
  getPendingPlaySyncCount,
} from "./game-finish";
import { getGameMastery } from "./game-mastery";

const recordGamingPlay = vi.fn();

vi.mock("@/lib/gaming-wallet-api", () => ({
  recordGamingPlay: (...args: unknown[]) => recordGamingPlay(...args),
}));

describe("game-finish durability (GA)", () => {
  beforeEach(() => {
    localStorage.clear();
    recordGamingPlay.mockReset();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("always records mastery and shows a result even when sync fails", async () => {
    recordGamingPlay.mockRejectedValue(new Error("network down"));
    const out = await durableFinishGame({
      gameId: "pattern-match",
      score: 6,
      total: 8,
      perfect: false,
      pointsEarned: 10,
      isSignedIn: true,
      authFetch: (async () => new Response(null, { status: 500 })) as typeof fetch,
      idempotencyKey: "play:pattern-match:test-1",
    });

    expect(out.syncPending).toBe(true);
    expect(out.pointsEarned).toBe(10);
    expect(getGameMastery("pattern-match").samples.length).toBeGreaterThan(0);
    expect(getPendingPlaySyncCount()).toBeGreaterThan(0);
  });

  it("records locally for guests without sync", async () => {
    const out = await durableFinishGame({
      gameId: "card-flip",
      score: 3,
      total: 4,
      perfect: false,
      pointsEarned: 8,
      isSignedIn: false,
    });
    expect(out.syncPending).toBe(false);
    expect(getGameMastery("card-flip").samples.length).toBe(1);
    expect(recordGamingPlay).not.toHaveBeenCalled();
  });

  it("queues immediately when navigator.onLine is false", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const out = await durableFinishGame({
      gameId: "maze-escape",
      score: 5,
      total: 8,
      perfect: false,
      pointsEarned: 9,
      isSignedIn: true,
      authFetch: (async () => new Response(null, { status: 200 })) as typeof fetch,
      idempotencyKey: "play:maze-escape:offline-1",
    });
    expect(out.syncPending).toBe(true);
    expect(out.syncError).toBe("offline");
    expect(recordGamingPlay).not.toHaveBeenCalled();
    expect(getPendingPlaySyncCount()).toBe(1);
  });

  it("dedupes queue entries by idempotency key", async () => {
    enqueuePlaySync({
      gameId: "maze-escape",
      score: 5,
      total: 8,
      idempotencyKey: "play:maze-escape:dup",
    });
    enqueuePlaySync({
      gameId: "maze-escape",
      score: 5,
      total: 8,
      idempotencyKey: "play:maze-escape:dup",
    });
    expect(getPendingPlaySyncCount()).toBe(1);
  });

  it("flushes queue with the same idempotency key", async () => {
    recordGamingPlay.mockResolvedValue({
      wallet: {} as never,
      pointsEarned: 9,
      perfect: false,
    });
    enqueuePlaySync({
      gameId: "number-match",
      score: 7,
      total: 8,
      idempotencyKey: "play:number-match:flush-1",
    });
    const { flushed, remaining } = await flushPendingPlaySync(async () => new Response("{}"));
    expect(flushed).toBe(1);
    expect(remaining).toBe(0);
    expect(recordGamingPlay).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idempotencyKey: "play:number-match:flush-1" }),
    );
  });

  it("recovers from corrupted sync queue JSON", async () => {
    localStorage.setItem("amynest_game_play_sync_queue_v1", "{not-json");
    expect(getPendingPlaySyncCount()).toBe(0);
    enqueuePlaySync({
      gameId: "odd-one-out",
      score: 4,
      total: 8,
      idempotencyKey: "play:odd-one-out:recover",
    });
    expect(getPendingPlaySyncCount()).toBe(1);
  });

  it("clearPendingPlaySync drops queued plays so another account cannot flush them", () => {
    enqueuePlaySync({
      gameId: "maze-escape",
      score: 5,
      total: 8,
      idempotencyKey: "play:maze-escape:prior-user",
    });
    expect(getPendingPlaySyncCount()).toBe(1);
    clearPendingPlaySync();
    expect(getPendingPlaySyncCount()).toBe(0);
  });
});
