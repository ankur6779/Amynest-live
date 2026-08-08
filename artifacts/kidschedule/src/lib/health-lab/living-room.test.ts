import { describe, expect, it } from "vitest";
import {
  HEALTH_LAB_QUIET_PATHS,
  HEALTH_LAB_LIVING_DEEP_PALETTE,
  healthLabLivingOpen,
  isHealthLabLivingV1Enabled,
  livingCelebrationTitle,
  livingPracticeBriefingEyebrow,
  livingPracticeStartCta,
  livingPracticeVictoryTitle,
  livingProgressPageTitle,
  livingSessionCompleteTitle,
  recommendHealthLabAction,
} from "./living-room";

describe("health-lab living-room", () => {
  it("exposes five quiet wellness paths", () => {
    expect(HEALTH_LAB_QUIET_PATHS).toHaveLength(5);
  });

  it("recommends matching path for engine-picked game", () => {
    const r = recommendHealthLabAction("flamingo-balance");
    expect(r.gameId).toBe("flamingo-balance");
    expect(r.title).toBe("Balance");
  });

  it("falls back to breath when unknown", () => {
    const r = recommendHealthLabAction("calmness-meter");
    expect(r.gameId).toBe("breath-control");
  });

  it("living flag defaults ON", () => {
    expect(isHealthLabLivingV1Enabled()).toBe(true);
  });

  it("opens as Care companionship — never galaxy / XP marketing", () => {
    const open = healthLabLivingOpen("Maya");
    expect(open.companionship).toContain("Maya");
    const joined = `${open.eyebrow} ${open.title} ${open.purpose} ${open.companionship}`.toLowerCase();
    expect(joined).not.toMatch(/xp|galaxy|adventure|quest|superpower|lab™/);
  });

  it("softens session / celebration language", () => {
    expect(livingSessionCompleteTitle(false).toLowerCase()).not.toMatch(/xp|level|quest/);
    expect(livingCelebrationTitle("level-up").toLowerCase()).not.toContain("level up");
    expect(livingCelebrationTitle("quest").toLowerCase()).not.toContain("quest");
  });

  it("deep practice helpers stay Care — never mission/adventure/XP theatre", () => {
    const joined = [
      livingPracticeBriefingEyebrow(),
      livingPracticeStartCta(),
      livingPracticeVictoryTitle(),
      livingProgressPageTitle(),
      HEALTH_LAB_LIVING_DEEP_PALETTE.night,
    ]
      .join(" ")
      .toLowerCase();
    expect(joined).not.toMatch(/mission|adventure|galaxy|xp|unlock|launch|quest/);
    expect(livingPracticeStartCta()).toBe("Begin gently");
    expect(livingPracticeVictoryTitle()).toBe("We did this");
    expect(HEALTH_LAB_LIVING_DEEP_PALETTE.sand).toContain("232,212,184");
  });
});
