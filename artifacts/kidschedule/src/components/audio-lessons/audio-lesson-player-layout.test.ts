import { describe, expect, it } from "vitest";
import { AUDIO_LESSON_PLAYER_LAYOUT } from "./audio-lesson-player-layout";

describe("AUDIO_LESSON_PLAYER_LAYOUT", () => {
  it("keeps a dominant play control and 44px touch targets", () => {
    expect(AUDIO_LESSON_PLAYER_LAYOUT.playButtonPx).toBeGreaterThanOrEqual(80);
    expect(AUDIO_LESSON_PLAYER_LAYOUT.skipButtonPx).toBeGreaterThanOrEqual(44);
    expect(AUDIO_LESSON_PLAYER_LAYOUT.closeButtonPx).toBeGreaterThanOrEqual(44);
    expect(AUDIO_LESSON_PLAYER_LAYOUT.speedHitMinPx).toBeGreaterThanOrEqual(44);
    expect(AUDIO_LESSON_PLAYER_LAYOUT.titleFontPx).toBeGreaterThanOrEqual(18);
    expect(AUDIO_LESSON_PLAYER_LAYOUT.progressPx).toBeGreaterThanOrEqual(4);
  });
});
