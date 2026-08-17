import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = resolve(import.meta.dirname, "../..");

describe("living Home dashboard containment", () => {
  it("does not wrap living /dashboard in parent-hub-premium or purple content wash", () => {
    const page = readFileSync(resolve(srcDir, "pages/dashboard.tsx"), "utf8");
    expect(page).not.toContain("parent-hub-premium");
    expect(page).toContain("th-living-page");
    expect(page).toContain("th-living-floor");
    expect(page).toContain("TODAY_HOME_V1 ? undefined : { background: DASHBOARD_CONTENT_GRADIENT }");
    expect(page).toContain('TODAY_HOME_V1 ? null : <div className={DASHBOARD_AMBIENT_TOP}');
    expect(page).toContain("bg-[#0a1024]");
  });

  it("keeps living user-facing CTAs as Build today's plan / Begin today", () => {
    const nrt = readFileSync(resolve(srcDir, "lib/today-home/resolve-today-nrt.ts"), "utf8");
    expect(nrt).toContain("livingDashboardContinueCta()");
    expect(nrt).toContain("livingDashboardBuildCta()");
    expect(nrt).not.toMatch(/label:\s*"Begin"/);
    expect(nrt).not.toMatch(/ctaLabel:\s*"Begin"/);
    expect(nrt).not.toMatch(/Generate routine/);
  });

  it("living Home CTA is ceramic sanctuary, not amber sparkle generate", () => {
    const hero = readFileSync(
      resolve(srcDir, "components/today-home/today-home-hero.tsx"),
      "utf8",
    );
    const css = readFileSync(
      resolve(srcDir, "components/today-home/today-home-sanctuary.css"),
      "utf8",
    );
    expect(hero).toContain("th-hero-cta");
    expect(hero).not.toContain("Sparkles");
    expect(hero).not.toContain("bg-amber-500");
    expect(hero).not.toContain("DashboardGlassCard");
    expect(hero).not.toMatch(/Generate routine/);
    const ctaStart = css.indexOf(".th-hero-cta {");
    const ctaBlock = css.slice(ctaStart, css.indexOf(".th-hero-cta:focus-visible"));
    expect(ctaBlock).toContain("#fbf6ee");
    expect(ctaBlock).toContain("#1a120c");
    expect(ctaBlock).not.toMatch(/245,\s*158,\s*11/);
    expect(ctaBlock).not.toMatch(/168,\s*85,\s*247/);
    const pageStart = css.indexOf(".dashboard-page.th-living-page {");
    const pageBlock = css.slice(pageStart, css.indexOf("}", css.indexOf("overflow-x: clip;", pageStart)) + 1);
    expect(pageBlock).toContain("#100d16");
    expect(pageBlock).not.toMatch(/168,\s*85,\s*247/);
  });

  it("does not delete the legacy parent-hub-premium purple surface", () => {
    const hubCss = readFileSync(resolve(srcDir, "index.css"), "utf8");
    const premiumStart = hubCss.indexOf(".parent-hub-premium {");
    const premiumBlock = hubCss.slice(premiumStart, hubCss.indexOf("}", premiumStart) + 1);
    expect(premiumBlock).toMatch(/168,\s*85,\s*247/);
  });

  it("preserves mobile tab bar and Amy FAB architecture", () => {
    const layout = readFileSync(resolve(srcDir, "components/layout.tsx"), "utf8");
    const tabBar = readFileSync(resolve(srcDir, "components/mobile-tab-bar.tsx"), "utf8");
    expect(layout).toContain("showMobileTabBar");
    expect(layout).toContain("visible={showMobileTabBar}");
    expect(layout).not.toContain("shouldShowLegacyMobileTabBar");
    expect(tabBar).toContain("<AmyFab");
    expect(tabBar).toContain('data-testid="mobile-tab-bar"');
  });

  it("does not expose Generate routine on the living dashboard timeline", () => {
    const page = readFileSync(resolve(srcDir, "pages/dashboard.tsx"), "utf8");
    expect(page).toContain("TODAY_HOME_V1\n                    ? undefined");
    expect(page).toContain("livingDashboardEmptyTitle()");
    expect(page).toContain("livingDashboardFamilyHint()");
  });
});
