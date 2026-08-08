import { describe, expect, it } from "vitest";
import {
  BIRTH_SKY_QUIET_PATHS,
  birthSkyLivingOpen,
  isBirthSkyLivingV1Enabled,
  livingBirthSkyProductName,
  livingCreateCta,
  livingDashboardEditionLabel,
  livingFormationCopy,
  livingPremiumPdfCta,
  livingRevealCta,
  livingReviewTitle,
  recommendBirthSkyAction,
} from "./living-room";

describe("birth-sky living-room", () => {
  it("exposes three quiet understanding paths", () => {
    expect(BIRTH_SKY_QUIET_PATHS).toHaveLength(3);
    expect(BIRTH_SKY_QUIET_PATHS.map((p) => p.id)).toEqual([
      "portrait",
      "patterns",
      "reflect",
    ]);
  });

  it("recommends begin understanding", () => {
    const r = recommendBirthSkyAction();
    expect(r.id).toBe("begin");
    expect(r.title).toBe("See them more clearly");
  });

  it("living flag defaults ON", () => {
    expect(isBirthSkyLivingV1Enabled()).toBe(true);
  });

  it("opens as Understand companionship — never astrology marketing", () => {
    const open = birthSkyLivingOpen("Maya");
    expect(open.companionship).toContain("Maya");
    const joined = `${open.eyebrow} ${open.title} ${open.purpose} ${open.companionship}`.toLowerCase();
    expect(joined).not.toMatch(/astro|destiny|horoscope|cosmic|unlock|prediction product/);
  });

  it("softens product / ceremony / premium language when living", () => {
    expect(livingBirthSkyProductName().toLowerCase()).not.toContain("astro intelligence");
    expect(livingFormationCopy(1000, 15000).toLowerCase()).not.toMatch(/deep space|stars/);
    expect(livingRevealCta().toLowerCase()).not.toContain("living sky");
    expect(livingReviewTitle().toLowerCase()).not.toContain("reveal");
    expect(livingCreateCta("Maya").toLowerCase()).not.toContain("astro");
    expect(livingPremiumPdfCta().toLowerCase()).not.toMatch(/unlock/);
    expect(livingDashboardEditionLabel().toLowerCase()).not.toContain("signature");
  });
});
