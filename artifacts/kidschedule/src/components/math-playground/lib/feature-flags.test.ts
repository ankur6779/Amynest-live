import { describe, expect, it, vi } from "vitest";
import {
  isMpAmyAvatarEnabled,
  isMpLivingObjectsEnabled,
  isMpMiniGamesEnabled,
  isMpVoiceModeEnabled,
} from "./feature-flags";

describe("math-playground feature flags", () => {
  it("defaults amy avatar off", () => {
    vi.stubEnv("VITE_MP_AMY_AVATAR", "");
    vi.stubEnv("VITE_MP_PHASE4", "");
    expect(isMpAmyAvatarEnabled()).toBe(false);
    expect(isMpLivingObjectsEnabled()).toBe(false);
  });

  it("enables living objects with phase4 flag", () => {
    vi.stubEnv("VITE_MP_PHASE4", "1");
    expect(isMpLivingObjectsEnabled()).toBe(true);
    expect(isMpAmyAvatarEnabled()).toBe(false);
  });

  it("enables amy avatar with dedicated flag", () => {
    vi.stubEnv("VITE_MP_AMY_AVATAR", "1");
    expect(isMpAmyAvatarEnabled()).toBe(true);
    expect(isMpLivingObjectsEnabled()).toBe(true);
  });

  it("enables mini games with dedicated flag", () => {
    vi.stubEnv("VITE_MP_MINI_GAMES", "1");
    expect(isMpMiniGamesEnabled()).toBe(true);
  });

  it("enables voice mode with dedicated flag", () => {
    vi.stubEnv("VITE_MP_VOICE_MODE", "1");
    expect(isMpVoiceModeEnabled()).toBe(true);
  });
});
