import { beforeEach, describe, expect, it, vi } from "vitest";

describe("AudioContext recovery", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resumeSharedAudioContextFromGesture recreates a closed context", async () => {
    const resume = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    let state: AudioContextState = "closed";
    const instances: Array<{ state: AudioContextState; resume: typeof resume; close: typeof close }> =
      [];

    class FakeAudioContext {
      resume = resume;
      close = close;
      get state() {
        return state;
      }
      constructor() {
        state = "running";
        instances.push(this as unknown as (typeof instances)[number]);
      }
    }

    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("window", {
      AudioContext: FakeAudioContext,
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Macintosh" });

    const { resumeSharedAudioContextFromGesture, shouldUseWebAudioUnlock } =
      await import("@/lib/tts-guard");

    expect(shouldUseWebAudioUnlock()).toBe(true);
    state = "closed";
    resumeSharedAudioContextFromGesture();
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(state).toBe("running");
  });
});
