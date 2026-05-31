import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  coalesceAudioRequest,
  getCoalescerInFlightCount,
  resolveSpeakCoalesceKey,
} from "@/lib/audio-request-coalescer";

describe("audio-request-coalescer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces duplicate keys within 500ms — one fn, shared result", async () => {
    let runs = 0;
    const fn = vi.fn(async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 100));
      return "ok";
    });

    const key = resolveSpeakCoalesceKey("hello", { coach: true }, "speech_coach");
    const p1 = coalesceAudioRequest(key, fn);
    const p2 = coalesceAudioRequest(key, fn);

    await vi.advanceTimersByTimeAsync(100);
    expect(await p1).toBe("ok");
    expect(await p2).toBe("ok");
    expect(runs).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolveSpeakCoalesceKey prefers identity hash", () => {
    const key = resolveSpeakCoalesceKey(
      "UI text",
      {
        parentHub: true,
        audioIdentity: {
          moduleId: "parent-hub",
          sectionId: "hub_facts",
          text: "UI text",
          hash: "abc123",
        },
      },
      "parent_hub",
    );
    expect(key).toContain("abc123");
    expect(key).toContain("parent_hub");
  });
});
