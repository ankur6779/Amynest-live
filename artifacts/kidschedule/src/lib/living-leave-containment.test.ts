import { afterEach, describe, expect, it, vi } from "vitest";

describe("living leave-path containment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("mixed/test default preserves catalogue hrefs and direct URLs", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "");
    const {
      filterLivingNavCatalogueItems,
      livingDirectUrlContainment,
      shouldShowLegacyMobileTabBar,
    } = await import("./living-leave-containment");
    expect(
      filterLivingNavCatalogueItems([{ href: "/games" }, { href: "/nutrition" }]).map(
        (i) => i.href,
      ),
    ).toEqual(["/games", "/nutrition"]);
    expect(livingDirectUrlContainment("/games")).toBeNull();
    expect(livingDirectUrlContainment("/speech-coach/talk")).toBeNull();
    expect(shouldShowLegacyMobileTabBar(true)).toBe(true);
  });

  it("living universe hides unfinished waitlist from More, not active modules", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "living");
    const {
      filterLivingNavCatalogueItems,
      livingDirectUrlContainment,
      shouldShowLegacyMobileTabBar,
      LIVING_NAV_CONTAINED_HREFS,
      LIVING_NEVER_DUMP_HREFS,
      LIVING_DIRECT_URL_CONTAINMENT,
    } = await import("./living-leave-containment");
    const kept = filterLivingNavCatalogueItems([
      { href: "/games" },
      { href: "/study" },
      { href: "/insights" },
      { href: "/progress" },
      { href: "/kids-control-center" },
      { href: "/nutrition" },
      { href: "/dashboard" },
    ]).map((i) => i.href);
    expect(kept).toEqual([
      "/games",
      "/study",
      "/insights",
      "/progress",
      "/nutrition",
      "/dashboard",
    ]);
    expect([...LIVING_NAV_CONTAINED_HREFS]).toEqual(["/kids-control-center"]);
    expect([...LIVING_NAV_CONTAINED_HREFS]).not.toContain("/games");
    expect(livingDirectUrlContainment("/games")).toBeNull();
    expect(livingDirectUrlContainment("/progress")).toBeNull();
    expect(livingDirectUrlContainment("/insights")).toBeNull();
    expect(livingDirectUrlContainment("/study")).toBeNull();
    expect(livingDirectUrlContainment("/rewards")).toBeNull();
    expect(livingDirectUrlContainment("/kids-control-center")).toBeNull();
    expect(livingDirectUrlContainment("/worksheet")).toBe("/parenting-hub");
    expect(livingDirectUrlContainment("/speech-coach/live-session")).toBe("/speech-coach");
    expect(livingDirectUrlContainment("/speech-coach/talk")).toBe("/speech-coach");
    expect(livingDirectUrlContainment("/phonics")).toBeNull();
    expect(shouldShowLegacyMobileTabBar(true)).toBe(false);
    expect(shouldShowLegacyMobileTabBar(false)).toBe(false);

    for (const href of LIVING_NEVER_DUMP_HREFS) {
      expect(LIVING_DIRECT_URL_CONTAINMENT[href]).toBeUndefined();
    }
    for (const [from, to] of Object.entries(LIVING_DIRECT_URL_CONTAINMENT)) {
      expect(to, `${from} must not dump to Home`).not.toBe("/dashboard");
    }
  });

  it("legacy rollback keeps tab bar and leftover URLs", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "legacy");
    const { livingDirectUrlContainment, shouldShowLegacyMobileTabBar } = await import(
      "./living-leave-containment"
    );
    expect(livingDirectUrlContainment("/games")).toBeNull();
    expect(shouldShowLegacyMobileTabBar(true)).toBe(true);
  });
});
