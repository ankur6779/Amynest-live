import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resetInfantSleepPlaybackTraceForTests,
  warnIfAudioSourceDuplicated,
} from "@/lib/infant-sleep-playback-trace";

describe("infant-sleep-playback-trace", () => {
  beforeEach(() => {
    resetInfantSleepPlaybackTraceForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when two different ids share the same audio source", () => {
    warnIfAudioSourceDuplicated("lul-twinkle", "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3");
    const dup = warnIfAudioSourceDuplicated(
      "lul-brahms",
      "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3",
    );
    expect(dup).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      "AUDIO CONTENT DUPLICATION DETECTED",
      expect.objectContaining({
        previousItemId: "lul-twinkle",
        selectedItemId: "lul-brahms",
      }),
    );
  });

  it("does not warn when ids differ and sources differ", () => {
    warnIfAudioSourceDuplicated("lul-twinkle", "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3");
    const dup = warnIfAudioSourceDuplicated(
      "lul-brahms",
      "/infant-sleep-audio/packs/core-v1/lullabies/brahms.mp3",
    );
    expect(dup).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
