import { describe, expect, it } from "vitest";
import { classifyAudibleStartFailure } from "@/lib/audible-start-diagnostic";

function mockAudio(partial: Partial<HTMLAudioElement>): HTMLAudioElement {
  return {
    readyState: 4,
    networkState: 1,
    paused: true,
    currentTime: 0,
    duration: 1.5,
    volume: 1,
    muted: false,
    playbackRate: 1,
    ended: false,
    error: null,
    src: "blob:test",
    ...partial,
  } as HTMLAudioElement;
}

describe("classifyAudibleStartFailure", () => {
  it("explains readyState=4 with paused and currentTime=0", () => {
    const msg = classifyAudibleStartFailure(
      mockAudio({ readyState: 4, paused: true, currentTime: 0 }),
      "waitForAudibleStart",
    );
    expect(msg).toContain("MEDIA_FULLY_LOADED_BUT_STILL_PAUSED");
    expect(msg).toContain("readyState=4");
  });

  it("detects silent output path", () => {
    const msg = classifyAudibleStartFailure(
      mockAudio({ paused: false, currentTime: 0.1, muted: true }),
      "gate",
    );
    expect(msg).toContain("silent");
  });
});
