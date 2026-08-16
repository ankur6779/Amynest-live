import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  livingDashboardBuildCta,
  livingDashboardContinueCta,
  livingDashboardEmptyBody,
  livingDashboardEmptyTitle,
  livingDashboardOpen,
  livingDashboardProductName,
  livingDashboardRebuildCta,
} from "./living-dashboard";

describe("routine living dashboard copy", () => {
  it("is today's plan — never an AI planner SKU", () => {
    const open = livingDashboardOpen("Maya");
    const blob = [
      livingDashboardProductName(),
      open.title,
      open.purpose,
      livingDashboardEmptyTitle(),
      livingDashboardEmptyBody("Maya"),
      livingDashboardBuildCta(),
      livingDashboardContinueCta(),
      livingDashboardRebuildCta(),
    ]
      .join(" ")
      .toLowerCase();
    expect(livingDashboardProductName().toLowerCase()).toBe("today's plan");
    expect(livingDashboardBuildCta()).toBe("Build today's plan");
    expect(livingDashboardRebuildCta()).toBe("Rebuild today's plan");
    expect(livingDashboardContinueCta()).toBe("Begin today");
    expect(blob).not.toMatch(
      /generate ai|generate schedule|unlock|explore free|try pro|marketplace|sparkle|saas/,
    );
  });

  it("empty state is companionship, not a database widget", () => {
    expect(livingDashboardEmptyTitle().toLowerCase()).toContain("no plan");
    expect(livingDashboardEmptyBody("Leo").toLowerCase()).toContain("leo");
    expect(livingDashboardEmptyBody("Leo").toLowerCase()).not.toMatch(/generate with ai|personalized schedule/);
  });

  it("wires /routines to the living dashboard instead of the purple tab shell", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../pages/routines/index.tsx"),
      "utf8",
    );
    expect(src).toContain("isRoutineLivingV1Enabled()");
    expect(src).toContain("<RoutineLivingDashboard");
    expect(src).toMatch(/if \(livingDashboard\)/);
    const livingReturn = src.slice(
      src.indexOf("if (livingDashboard)"),
      src.indexOf("return <div className={cn(PARENT_HUB_PAGE"),
    );
    expect(livingReturn).toContain("<RoutineLivingDashboard");
    expect(livingReturn).not.toContain("PARENT_HUB_PAGE");
    expect(livingReturn).not.toContain("parent-hub-premium");
    expect(src).toContain("return <div className={cn(PARENT_HUB_PAGE");
  });

  it("living dashboard CSS has no purple hub wash and no orange legacy CTA", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../../components/routines/routine-living-room.css"),
      "utf8",
    );
    const dashCta = css.slice(css.indexOf(".rg-dash-cta {"), css.indexOf(".rg-dash-cta-title,"));
    expect(dashCta).toContain("#fbf6ee");
    expect(dashCta).not.toMatch(/245,\s*158,\s*11/);
    expect(dashCta).not.toMatch(/168,\s*85,\s*247/);
    expect(css).toContain(".routine-living-page .rg-dash-surface.rg-living-surface");
    expect(css).toContain("#100d16");
    const pageStart = css.indexOf("\n.routine-living-page {");
    const pageBlock = css.slice(pageStart, css.indexOf("}", pageStart) + 1);
    expect(pageBlock).not.toMatch(/168,\s*85,\s*247/);
    expect(pageBlock).not.toMatch(/245,\s*158,\s*11/);
  });

  it("does not delete the legacy parent-hub-premium purple surface", () => {
    const hubCss = readFileSync(
      resolve(import.meta.dirname, "../../index.css"),
      "utf8",
    );
    const premiumStart = hubCss.indexOf(".parent-hub-premium {");
    const premiumBlock = hubCss.slice(premiumStart, hubCss.indexOf("}", premiumStart) + 1);
    expect(premiumBlock).toMatch(/168,\s*85,\s*247/);
  });

  it("living mobile chrome keeps the tab bar and Amy FAB on normal app pages", () => {
    const layout = readFileSync(
      resolve(import.meta.dirname, "../../components/layout.tsx"),
      "utf8",
    );
    const tabBar = readFileSync(
      resolve(import.meta.dirname, "../../components/mobile-tab-bar.tsx"),
      "utf8",
    );
    expect(layout).toContain("<MobileTabBar");
    expect(layout).toContain("showMobileTabBar");
    expect(layout).toContain("visible={showMobileTabBar}");
    expect(layout).not.toContain("shouldShowLegacyMobileTabBar");
    expect(tabBar).toContain("<AmyFab");
    expect(tabBar).toContain('data-testid="mobile-tab-bar"');
  });
});
