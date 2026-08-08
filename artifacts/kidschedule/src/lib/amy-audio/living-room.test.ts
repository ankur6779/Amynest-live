import { describe, expect, it } from "vitest";
import {
  AMY_AUDIO_QUIET_PATHS,
  amyAudioLivingOpen,
  isAmyAudioLivingV1Enabled,
  livingAmyAudioProductName,
  livingDailyPick,
  livingEmergencyCta,
  livingExploreCta,
  livingFreeBadge,
  livingNowPlaying,
  livingPreviewNote,
  livingSeriesTitle,
  livingUnlockBanner,
  recommendAmyAudioAction,
} from "./living-room";

describe("amy-audio living-room", () => {
  it("exposes three quiet presence paths", () => {
    expect(AMY_AUDIO_QUIET_PATHS).toHaveLength(3);
    expect(AMY_AUDIO_QUIET_PATHS.map((p) => p.id)).toEqual([
      "listen",
      "calm",
      "continue",
    ]);
  });

  it("recommends one natural listen act", () => {
    const r = recommendAmyAudioAction("Emma");
    expect(r.id).toBe("listen");
    expect(r.title).toContain("Emma");
    expect(r.purpose.toLowerCase()).toMatch(/calm|quiet/);
  });

  it("living flag defaults ON", () => {
    expect(isAmyAudioLivingV1Enabled()).toBe(true);
  });

  it("opens as presence — never Spotify / marketplace / unlock theatre", () => {
    const open = amyAudioLivingOpen("Maya");
    expect(open.companionship).toContain("Maya");
    const joined =
      `${open.eyebrow} ${open.title} ${open.purpose} ${open.companionship}`.toLowerCase();
    expect(joined).not.toMatch(
      /\b(spotify|podcast|marketplace|playlist wall|unlock|catalogue|gamif)\b/,
    );
    expect(joined).toMatch(/here with you|presence|sound/);
  });

  it("softens catalogue / unlock / FOMO language when living", () => {
    expect(livingAmyAudioProductName().toLowerCase()).not.toContain("audio lessons");
    expect(livingUnlockBanner().toLowerCase()).not.toMatch(/unlock|go premium|fomo/);
    expect(livingPreviewNote().toLowerCase()).toContain("whenever you're ready");
    expect(livingFreeBadge().toLowerCase()).not.toContain("✦");
    expect(livingExploreCta().toLowerCase()).not.toBe("explore");
    expect(livingNowPlaying().toLowerCase()).not.toBe("now playing");
    expect(livingDailyPick().toLowerCase()).not.toContain("daily pick");
    expect(livingSeriesTitle().toLowerCase()).not.toContain("playlist");
    expect(livingEmergencyCta().toLowerCase()).toContain("calm");
  });
});
