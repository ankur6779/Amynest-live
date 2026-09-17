import { describe, expect, it } from "vitest";
import { isHtmlAudioAudiblyStarted } from "./amy-voice-audible";

function fakeAudio(overrides: Partial<HTMLAudioElement>): HTMLAudioElement {
  return {
    muted: false,
    volume: 1,
    paused: false,
    currentTime: 0,
    readyState: 2,
    duration: Number.NaN,
    ...overrides,
  } as HTMLAudioElement;
}

describe("isHtmlAudioAudiblyStarted", () => {
  it("accepts play() that has data but currentTime still at 0", () => {
    expect(isHtmlAudioAudiblyStarted(fakeAudio({ currentTime: 0, readyState: 3, paused: false }))).toBe(
      true,
    );
  });

  it("rejects muted or zero-volume elements", () => {
    expect(isHtmlAudioAudiblyStarted(fakeAudio({ muted: true, currentTime: 1 }))).toBe(false);
    expect(isHtmlAudioAudiblyStarted(fakeAudio({ volume: 0, currentTime: 1 }))).toBe(false);
  });

  it("rejects paused elements", () => {
    expect(isHtmlAudioAudiblyStarted(fakeAudio({ paused: true, currentTime: 1, readyState: 4 }))).toBe(
      false,
    );
  });
});
