import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";

const srcDir = resolve(import.meta.dirname, "..");

describe("living global chrome continuity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    document.documentElement.classList.remove("amynest-living-universe");
    document.body?.classList.remove("amynest-living-universe");
  });

  it("shared sanctuary chrome tokens exist for header/footer inheritance", () => {
    const identity = readFileSync(
      resolve(srcDir, "styles/amynest-identity.css"),
      "utf8",
    );
    expect(identity).toContain("--sanctuary-floor-top");
    expect(identity).toContain("--sanctuary-floor-mid");
    expect(identity).toContain("--sanctuary-floor-deep");
    expect(identity).toContain("--sanctuary-sand-spill");
    expect(identity).toContain("--sanctuary-chrome-edge");
    expect(identity).toContain("--sanctuary-floor:");
    expect(identity).toContain("#100d16");
    expect(identity).not.toMatch(/--sanctuary-floor-deep:\s*#0a0f1e/);
  });

  it("living chrome CSS removes legacy solid navy footer surface", () => {
    const chrome = readFileSync(
      resolve(srcDir, "styles/living-app-chrome.css"),
      "utf8",
    );
    const indexCss = readFileSync(resolve(srcDir, "index.css"), "utf8");
    expect(indexCss).toContain('@import "./styles/living-app-chrome.css"');
    expect(chrome).toContain("html.amynest-living-universe");
    expect(chrome).toContain(".app-header");
    expect(chrome).toContain(".app-footer");
    expect(chrome).toContain(".app-footer__nav");
    expect(chrome).toContain("var(--sanctuary-floor-deep)");
    expect(chrome).toContain("var(--sanctuary-chrome-edge)");
    expect(chrome).not.toMatch(/rgba\(\s*10\s*,\s*15\s*,\s*30/);
    expect(chrome).not.toMatch(/#0a0f1e/i);
    // Living OFF path retains the legacy footer navy in shared index.css
    expect(indexCss).toMatch(/\.app-footer\s*\{[\s\S]*?rgba\(\s*10\s*,\s*15\s*,\s*30/);
  });

  it("mobile tab bar and Amy FAB remain mounted with unchanged routes", () => {
    const layout = readFileSync(resolve(srcDir, "components/layout.tsx"), "utf8");
    const tabBar = readFileSync(
      resolve(srcDir, "components/mobile-tab-bar.tsx"),
      "utf8",
    );
    expect(layout).toContain("<MobileTabBar");
    expect(layout).toContain("visible={showMobileTabBar}");
    expect(layout).toContain("syncAmynestLivingUniverseDocumentClass");
    expect(layout).not.toContain("shouldShowLegacyMobileTabBar");
    expect(tabBar).toContain("<AmyFab");
    expect(tabBar).toContain('data-testid="mobile-tab-bar"');
    expect(tabBar).toContain('href: "/dashboard"');
    expect(tabBar).toContain('href: "/routines"');
    expect(tabBar).toContain('href: "/amy-coach"');
    expect(tabBar).toContain('href: "/parenting-hub"');
    expect(tabBar).toContain('source="bottom-nav"');
    expect(tabBar).toContain('source="bottom-nav-center"');
    // Surface moved to CSS — no legacy card/navy utilities on the nav shell
    expect(tabBar).not.toContain("bg-card/95");
    expect(tabBar).not.toContain("rgba(10, 15, 30");
  });

  it("boot syncs living document class and preserves legacy rollback API", async () => {
    const main = readFileSync(resolve(srcDir, "main.tsx"), "utf8");
    expect(main).toContain("syncAmynestLivingUniverseDocumentClass");

    vi.resetModules();
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "legacy");
    const legacy = await import("@/lib/amynest-living-universe");
    expect(legacy.isAmynestLivingUniverseEnabled()).toBe(false);
    expect(legacy.isAmynestLegacyUniverseEnabled()).toBe(true);
    legacy.syncAmynestLivingUniverseDocumentClass();
    expect(
      document.documentElement.classList.contains(
        legacy.AMYNEST_LIVING_UNIVERSE_DOC_CLASS,
      ),
    ).toBe(false);

    vi.resetModules();
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "living");
    const living = await import("@/lib/amynest-living-universe");
    expect(living.isAmynestLivingUniverseEnabled()).toBe(true);
    living.syncAmynestLivingUniverseDocumentClass();
    expect(
      document.documentElement.classList.contains(
        living.AMYNEST_LIVING_UNIVERSE_DOC_CLASS,
      ),
    ).toBe(true);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
