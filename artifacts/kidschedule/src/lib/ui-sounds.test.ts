import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  UI_SOUNDS_MUTE_KEY,
  isUiSoundsMuted,
  setUiSoundsMuted,
} from "@/lib/ui-sounds";

describe("ui-sounds mute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to unmuted", () => {
    expect(isUiSoundsMuted()).toBe(false);
  });

  it("persists mute in localStorage", () => {
    setUiSoundsMuted(true);
    expect(localStorage.getItem(UI_SOUNDS_MUTE_KEY)).toBe("1");
    expect(isUiSoundsMuted()).toBe(true);
    setUiSoundsMuted(false);
    expect(isUiSoundsMuted()).toBe(false);
  });

  it("reads legacy study-fx mute flag", () => {
    localStorage.setItem("amynest:study-fx-muted", "1");
    expect(isUiSoundsMuted()).toBe(true);
  });
});
