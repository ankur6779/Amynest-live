import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWorksheetOfflineQueue,
  enqueueOfflineRequest,
  flushOfflineQueue,
} from "@/features/worksheet-studio/worksheet-studio-analytics";

describe("worksheet offline queue user scoping", () => {
  beforeEach(() => {
    localStorage.clear();
    clearWorksheetOfflineQueue();
  });

  it("does not enqueue without a signed-in user", () => {
    enqueueOfflineRequest("/api/worksheet-studio/generate", { prompt: "fractions" }, null);
    expect(localStorage.length).toBe(0);
  });

  it("stores and flushes only the active user's queue", async () => {
    enqueueOfflineRequest(
      "/api/worksheet-studio/generate",
      { prompt: "from-a" },
      "user-a",
    );
    enqueueOfflineRequest(
      "/api/worksheet-studio/generate",
      { prompt: "from-b" },
      "user-b",
    );

    const fetched: string[] = [];
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      fetched.push(String(init?.body ?? ""));
      return new Response("{}", { status: 200 });
    });

    const flushedB = await flushOfflineQueue(fetcher, "user-b");
    expect(flushedB).toBe(1);
    expect(fetched).toHaveLength(1);
    expect(fetched[0]).toContain("from-b");
    expect(fetched[0]).not.toContain("from-a");

    // A's request remains for A.
    const flushedA = await flushOfflineQueue(fetcher, "user-a");
    expect(flushedA).toBe(1);
    expect(fetched[1]).toContain("from-a");
  });

  it("refuses to flush when userId is missing", async () => {
    enqueueOfflineRequest("/api/worksheet-studio/generate", { prompt: "x" }, "user-a");
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await flushOfflineQueue(fetcher, null)).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
