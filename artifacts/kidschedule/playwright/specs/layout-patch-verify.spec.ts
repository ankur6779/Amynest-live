/**
 * Captures layout reference shots for minimal patch verification.
 * Run: pnpm exec playwright test -c playwright.config.layout-verify.ts
 *
 * Before/after: LAYOUT_PATCH_PHASE=before|after (default: after)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const PHASE = process.env.LAYOUT_PATCH_PHASE === "before" ? "before" : "after";
const OUT = `playwright/artifacts/ux-stabilization/patch-${PHASE}`;

function injectTabBarShell(phase: "before" | "after") {
  document.documentElement.style.setProperty("--sab", "34px");
  document.documentElement.classList.add("amynest-android-shell");
  document.body.classList.add("has-tabbar");
  const innerRowClass =
    phase === "before"
      ? "relative flex min-h-[var(--tabbar-height,72px)] w-full items-end justify-around px-2 pb-2 safe-area-bottom"
      : "relative flex h-[72px] w-full items-end justify-around px-2 pb-2";
  const footer = document.createElement("footer");
  footer.className = "app-footer tabbar bottom-nav";
  footer.innerHTML = `
    <nav class="app-footer__nav w-full">
      <div class="${innerRowClass}">
        <span>Home</span><span>Routines</span><span>Amy</span><span>Hub</span>
      </div>
    </nav>`;
  document.body.appendChild(footer);
}

test.describe("layout patch verification", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(60_000);

  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
  });

  async function gotoSignIn(page: import("@playwright/test").Page) {
    await page.goto("/sign-in", { waitUntil: "load" });
    await page.waitForSelector(".app-scroll", { timeout: 30_000 });
    await page.waitForTimeout(500);
  }

  test("sign-in page chrome", async ({ page }) => {
    await gotoSignIn(page);
    await page.screenshot({ path: `${OUT}/390-sign-in-${PHASE}.png`, fullPage: true });
  });

  test("simulated tab bar footer metrics", async ({ page }) => {
    await gotoSignIn(page);
    await page.evaluate(injectTabBarShell, PHASE);
    await page.waitForTimeout(200);

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".app-footer__nav") as HTMLElement | null;
      const footer = document.querySelector(".app-footer") as HTMLElement | null;
      const scroll = document.querySelector(".app-scroll") as HTMLElement | null;
      const scrollPad = scroll ? getComputedStyle(scroll).paddingBottom : "";
      const footerRect = footer?.getBoundingClientRect().height ?? 0;
      const navRect = nav?.getBoundingClientRect().height ?? 0;
      const scrollPadPx = scroll ? parseFloat(scrollPad) || 0 : 0;
      return {
        navHeight: navRect,
        footerHeight: footerRect,
        sabInsetBelowNav: footerRect - navRect,
        footerPaddingBottom: footer ? getComputedStyle(footer).paddingBottom : "",
        scrollPaddingBottom: scrollPad,
        scrollPaddingPx: scrollPadPx,
        sab: getComputedStyle(document.documentElement).getPropertyValue("--sab").trim(),
      };
    });

    expect(metrics.sab).toBe("34px");
    expect(metrics.navHeight).toBeGreaterThanOrEqual(70);
    expect(metrics.navHeight).toBeLessThanOrEqual(74);

    if (PHASE === "after") {
      expect(metrics.sabInsetBelowNav).toBeGreaterThanOrEqual(32);
      expect(metrics.sabInsetBelowNav).toBeLessThanOrEqual(36);
      expect(metrics.footerPaddingBottom).toBe("34px");
      expect(metrics.scrollPaddingPx).toBeGreaterThanOrEqual(110);
      expect(metrics.scrollPaddingPx).toBeLessThanOrEqual(120);
    } else {
      // Pre-patch scroll omitted FAB overhang (72 + sab only).
      expect(metrics.scrollPaddingPx).toBe(106);
    }

    writeFileSync(`${OUT}/footer-metrics-${PHASE}.json`, JSON.stringify(metrics, null, 2));

    await page.screenshot({ path: `${OUT}/390-footer-metrics-${PHASE}.png`, fullPage: false });
  });
});
