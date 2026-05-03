import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory AsyncStorage stand-in. Must be hoisted because the mock
// factory is evaluated before the import below.
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
  },
}));

import {
  enqueueAttempt,
  flushAttemptQueue,
  MAX_BATCH,
} from "../lib/smart-study-queue";

beforeEach(() => {
  store.clear();
});

describe("smart-study-queue.flushAttemptQueue", () => {
  it("posts a single batch when the queue fits in MAX_BATCH", async () => {
    for (let i = 0; i < 5; i++) {
      await enqueueAttempt({
        childId: 1, subject: "math", topicId: "addition", correct: i % 2 === 0,
      });
    }
    const calls: { url: string; body: unknown }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init?.body ?? "null")) });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const delivered = await flushAttemptQueue(fetcher);
    expect(delivered).toBe(5);
    expect(calls).toHaveLength(1);
    expect(Array.isArray(calls[0]!.body)).toBe(true);
    expect((calls[0]!.body as unknown[]).length).toBe(5);
    // Queue is drained on success.
    expect(store.size === 0 || store.get("amynest:smart-study:attempt-queue") === "[]").toBe(true);
  });

  it("chunks oversized per-child queues into MAX_BATCH-sized requests instead of dropping data", async () => {
    // 80 attempts > MAX_BATCH (50) → two POSTs (50 + 30), all delivered.
    for (let i = 0; i < 80; i++) {
      await enqueueAttempt({
        childId: 1, subject: "math", topicId: "addition", correct: true,
      });
    }
    const sizes: number[] = [];
    const fetcher = async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "[]")) as unknown[];
      sizes.push(body.length);
      return new Response("{}", { status: 200 });
    };
    const delivered = await flushAttemptQueue(fetcher);
    expect(delivered).toBe(80);
    expect(sizes.length).toBe(2);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_BATCH);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(80);
  });

  it("retains chunks on 5xx/network errors but drops only the failing chunk on 4xx", async () => {
    for (let i = 0; i < 75; i++) {
      await enqueueAttempt({
        childId: 1, subject: "math", topicId: "addition", correct: true,
      });
    }
    let call = 0;
    const fetcher = async () => {
      call += 1;
      // 1st chunk OK, 2nd chunk 5xx — must stay queued for next flush.
      return call === 1
        ? new Response("{}", { status: 200 })
        : new Response("{}", { status: 500 });
    };
    const delivered = await flushAttemptQueue(fetcher);
    expect(delivered).toBe(MAX_BATCH);
    // Remaining 25 still queued for retry.
    const stored = JSON.parse(store.get("amynest:smart-study:attempt-queue") ?? "[]") as unknown[];
    expect(stored.length).toBe(75 - MAX_BATCH);
  });

  it("groups by childId so each request carries a single childId", async () => {
    for (let i = 0; i < 3; i++) {
      await enqueueAttempt({ childId: 1, subject: "math", topicId: "addition", correct: true });
    }
    for (let i = 0; i < 3; i++) {
      await enqueueAttempt({ childId: 2, subject: "math", topicId: "addition", correct: true });
    }
    const seen: number[] = [];
    const fetcher = async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "[]")) as { childId: number }[];
      const ids = new Set(body.map((b) => b.childId));
      expect(ids.size).toBe(1);
      seen.push([...ids][0]!);
      return new Response("{}", { status: 200 });
    };
    const delivered = await flushAttemptQueue(fetcher);
    expect(delivered).toBe(6);
    expect(new Set(seen)).toEqual(new Set([1, 2]));
  });
});
