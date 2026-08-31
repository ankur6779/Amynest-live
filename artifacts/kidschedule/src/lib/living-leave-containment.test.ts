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

  it("living universe hides catalogue More hrefs and contains leftover URLs", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "living");
    const {
      filterLivingNavCatalogueItems,
      livingDirectUrlContainment,
      shouldShowLegacyMobileTabBar,
      LIVING_NAV_CONTAINED_HREFS,
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
    expect(kept).toEqual(["/games", "/nutrition", "/dashboard"]);
    expect([...LIVING_NAV_CONTAINED_HREFS]).not.toContain("/games");
    expect(livingDirectUrlContainment("/games")).toBeNull();
    expect(livingDirectUrlContainment("/rewards")).toBe("/dashboard");
    expect(livingDirectUrlContainment("/worksheet")).toBe("/parenting-hub");
    expect(livingDirectUrlContainment("/speech-coach/live-session")).toBe("/speech-coach");
    expect(livingDirectUrlContainment("/speech-coach/talk")).toBe("/speech-coach");
    expect(livingDirectUrlContainment("/phonics")).toBeNull();
    expect(livingDirectUrlContainment("/study")).toBeNull();
    expect(shouldShowLegacyMobileTabBar(true)).toBe(false);
    expect(shouldShowLegacyMobileTabBar(false)).toBe(false);
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
