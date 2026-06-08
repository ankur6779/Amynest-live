import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BEHAVIOR_WARMUP_CAPS,
  enqueueBehaviorWarmup,
  resetBehaviorWarmupSession,
  wasBehaviorWarmupFired,
} from "./behavior-audio-warmup";

describe("behavior-audio-warmup", () => {
  beforeEach(() => {
    resetBehaviorWarmupSession();
  });

  it("fires once per module per session", async () => {
    const authFetch = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    enqueueBehaviorWarmup(authFetch, "stories", { storyIds: ["s1"] });
    enqueueBehaviorWarmup(authFetch, "stories", { storyIds: ["s2"] });

    expect(wasBehaviorWarmupFired("stories")).toBe(true);
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch.mock.calls[0]?.[0]).toBe("/api/audio-warmup/enqueue");
  });

  it("respects module asset caps", () => {
    expect(BEHAVIOR_WARMUP_CAPS.stories).toBe(5);
    expect(BEHAVIOR_WARMUP_CAPS.speech_coach).toBe(12);
    expect(BEHAVIOR_WARMUP_CAPS.discovery_world).toBe(20);
  });
});
