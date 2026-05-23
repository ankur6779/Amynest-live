import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  flushAudioHealthQueue,
  logAudioHealth,
  mapAmyLayerToHealthLayer,
  resetAudioHealthTelemetryForTests,
  resolveAudioHealthModule,
} from "@/lib/audio-health";

describe("audio-health client", () => {
  beforeEach(() => {
    resetAudioHealthTelemetryForTests();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
  });

  it("maps speak options to module", () => {
    expect(resolveAudioHealthModule({ lessonParagraph: true })).toBe("lesson");
    expect(resolveAudioHealthModule({ parentHub: true })).toBe("parentHub");
    expect(resolveAudioHealthModule({ mode: "phonics" })).toBe("phonics");
    expect(resolveAudioHealthModule({})).toBe("coach");
  });

  it("maps amy layers including streaming", () => {
    expect(mapAmyLayerToHealthLayer("static")).toBe("static");
    expect(mapAmyLayerToHealthLayer("api")).toBe("api");
    expect(mapAmyLayerToHealthLayer("emergency_local")).toBe("emergency");
    expect(mapAmyLayerToHealthLayer("api", true)).toBe("streaming");
  });

  it("queues events for batch flush", async () => {
    for (let i = 0; i < 5; i++) {
      logAudioHealth({
        event: "audio_start",
        module: "coach",
        layer: "cache",
        ttfaMs: 200 + i,
        success: true,
      });
    }
    await flushAudioHealthQueue(true);
    expect(fetch).toHaveBeenCalled();
  });
});
