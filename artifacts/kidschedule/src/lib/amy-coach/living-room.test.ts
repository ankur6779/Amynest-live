import { describe, expect, it } from "vitest";
import {
  AMY_COACH_QUIET_PATHS,
  amyCoachLivingOpen,
  isAmyCoachLivingV1Enabled,
  livingAmyCoachNavLabel,
  livingAmyCoachProductName,
  livingCatalogBannerBody,
  livingGenerateCta,
  livingGoalLockedCta,
  livingLoadingHeadline,
  livingProgressTitle,
  livingTryFreeBadge,
  recommendAmyCoachAction,
} from "./living-room";

describe("amy-coach living-room", () => {
  it("exposes three quiet companionship paths", () => {
    expect(AMY_COACH_QUIET_PATHS).toHaveLength(3);
    expect(AMY_COACH_QUIET_PATHS.map((p) => p.id)).toEqual([
      "concern",
      "for-you",
      "continue",
    ]);
  });

  it("recommends one natural begin act", () => {
    const r = recommendAmyCoachAction("Emma");
    expect(r.id).toBe("begin");
    expect(r.title).toContain("Emma");
    expect(r.purpose.toLowerCase()).toContain("calm");
  });

  it("living flag defaults ON", () => {
    expect(isAmyCoachLivingV1Enabled()).toBe(true);
  });

  it("opens as companionship — never chatbot / AI demo / marketplace", () => {
    const open = amyCoachLivingOpen("Maya");
    expect(open.companionship).toContain("Maya");
    const joined =
      `${open.eyebrow} ${open.title} ${open.purpose} ${open.companionship}`.toLowerCase();
    expect(joined).not.toMatch(
      /\b(chatbot|ai demo|support desk|prompt playground|marketplace|surveillance|watching you)\b/,
    );
    expect(joined).toMatch(/beside|here with you/);
  });

  it("softens SKU / unlock / FOMO language when living", () => {
    expect(livingAmyCoachProductName().toLowerCase()).not.toContain("amy coach");
    expect(livingAmyCoachNavLabel().toLowerCase()).toBe("beside you");
    expect(livingGoalLockedCta().toLowerCase()).not.toMatch(/unlock|try premium|fomo/);
    expect(livingTryFreeBadge().toLowerCase()).not.toContain("✦");
    expect(livingCatalogBannerBody().toLowerCase()).not.toMatch(/upgrade for unlimited/);
    expect(livingGenerateCta().toLowerCase()).not.toContain("generate my");
    expect(livingLoadingHeadline().toLowerCase()).not.toContain("coaching engine");
    expect(livingProgressTitle().toLowerCase()).not.toContain("journey");
  });
});
