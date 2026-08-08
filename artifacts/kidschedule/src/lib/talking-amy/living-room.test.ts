import { describe, expect, it } from "vitest";
import {
  TALKING_AMY_LIVING_PROMPTS,
  isTalkingAmyLivingV1Enabled,
  livingAchievementEyebrow,
  livingCollectionNote,
  livingDailyVoiceLabel,
  livingModeEchoHint,
  livingModeTagline,
  livingStreakNote,
  talkingAmyLivingOpen,
} from "./living-room";

describe("talking-amy living-room", () => {
  it("defaults living presentation ON", () => {
    expect(isTalkingAmyLivingV1Enabled()).toBe(true);
  });

  it("opens as companionship — never neon marketing", () => {
    const open = talkingAmyLivingOpen("Maya");
    expect(open.title).toBe("I'm here with Maya");
    expect(open.purpose.toLowerCase()).toContain("on this device");
    expect(open.title.toLowerCase()).not.toMatch(/unlock|play|popular|fun voices/);
    expect(open.purpose.toLowerCase()).not.toMatch(/neon|game|streak|bonus/);
  });

  it("uses calm living prompts — not toy-store dares", () => {
    expect(TALKING_AMY_LIVING_PROMPTS.length).toBeGreaterThan(4);
    const joined = TALKING_AMY_LIVING_PROMPTS.join(" ").toLowerCase();
    expect(joined).not.toMatch(/roar like a lion|whisper a secret|silly sound/);
    expect(joined).toContain("hello");
  });

  it("softens competitor / toy taglines", () => {
    expect(livingModeTagline("chipmunk", "x").toLowerCase()).not.toContain("talking tom");
    expect(livingModeEchoHint("monster", "ROAR!").toLowerCase()).not.toContain("roar!");
  });

  it("softens game chrome copy", () => {
    expect(livingAchievementEyebrow().toLowerCase()).not.toContain("unlocked");
    expect(livingDailyVoiceLabel("🐿️", "Chipmunk Amy").toLowerCase()).not.toMatch(
      /featured|bonus|sparkle/,
    );
    expect(livingStreakNote(3).toLowerCase()).not.toContain("🔥");
    expect(livingCollectionNote(4, 12).toLowerCase()).not.toMatch(/gift|collection:|🏆/);
  });
});
