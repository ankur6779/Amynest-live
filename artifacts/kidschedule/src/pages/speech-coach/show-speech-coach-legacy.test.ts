import { afterEach, describe, expect, it } from "vitest";
import { showSpeechCoachLegacyCards } from "./show-speech-coach-legacy";

describe("showSpeechCoachLegacyCards", () => {
  afterEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("returns false by default in production", () => {
    expect(showSpeechCoachLegacyCards(false)).toBe(false);
  });

  it("returns true when remote config enables legacy", () => {
    expect(showSpeechCoachLegacyCards(true)).toBe(true);
  });

  it("returns true when localStorage flag is set", () => {
    localStorage.setItem("speech-coach-legacy", "1");
    expect(showSpeechCoachLegacyCards(false)).toBe(true);
  });

  it("returns true when speechLegacy=1 is in the URL", () => {
    window.history.replaceState({}, "", "/speech-coach?speechLegacy=1");
    expect(showSpeechCoachLegacyCards(false)).toBe(true);
  });
});
