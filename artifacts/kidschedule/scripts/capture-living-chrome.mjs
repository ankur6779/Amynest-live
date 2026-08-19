/**
 * Capture living chrome continuity screenshots at required widths.
 * Usage: BASE_URL=http://127.0.0.1:5173 node scripts/capture-living-chrome.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:5173";
const ARTIFACTS = process.env.ARTIFACTS_DIR || "/opt/cursor/artifacts";
mkdirSync(ARTIFACTS, { recursive: true });

const widths = [
  { w: 320, name: "320" },
  { w: 360, name: "360" },
  { w: 390, name: "390" },
  { w: 430, name: "430" },
  { w: 1280, name: "desktop" },
];

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();
const results = [];

for (const { w, name } of widths) {
  await page.setViewportSize({ width: w, height: w >= 1000 ? 900 : 780 });
  await page.goto(`${BASE}/playwright-living-chrome.html`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.evaluate(() => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe");
  });
  if (w < 1024) {
    await page.waitForSelector('[data-testid="living-chrome-header"]', {
      state: "visible",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="mobile-tab-bar"]', {
      state: "visible",
      timeout: 30000,
    });
  } else {
    await page.waitForSelector('[data-testid="living-chrome-room"]', { timeout: 30000 });
  }
  await page.waitForTimeout(350);

  const colors = await page.evaluate(() => {
    const header = document.querySelector(".app-header");
    const footer = document.querySelector(".app-footer");
    const nav = document.querySelector(".app-footer__nav");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const h = cs(header);
    const f = cs(footer);
    const n = cs(nav);
    const rgba = (bg) => bg || "";
    return {
      headerBg: h?.backgroundImage || h?.backgroundColor,
      footerBg: f?.backgroundColor,
      navBorder: n?.borderTopColor,
      headerDisplay: h?.display,
      hasLivingClass: document.documentElement.classList.contains("amynest-living-universe"),
      fab: !!document.querySelector("#amy-fab-floating"),
      tabBar: !!document.querySelector('[data-testid="mobile-tab-bar"]'),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      footerIsLegacyNavy: /rgba?\(\s*10\s*,\s*15\s*,\s*30/.test(rgba(f?.backgroundColor)),
      headerIsCoolNavySolid: /^rgb\(\s*15,\s*23,\s*42\)$/.test(rgba(h?.backgroundColor)),
    };
  });

  const path = `${ARTIFACTS}/living_chrome_${name}.png`;
  await page.screenshot({ path, fullPage: false });
  results.push({ name, w, path, colors });
  console.log(JSON.stringify({ name, w, path, colors }, null, 2));
}

writeFileSync(`${ARTIFACTS}/living_chrome_capture.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log("done");
