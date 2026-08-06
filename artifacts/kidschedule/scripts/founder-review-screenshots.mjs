import { chromium, devices } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.FOUNDER_REVIEW_BASE_URL || "http://127.0.0.1:3000";
const OUT = process.env.FOUNDER_REVIEW_OUT || "/opt/cursor/artifacts/screenshots/founder-review-r1";

fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = devices["iPhone 14 Pro"];

async function settle(page) {
  await page.waitForTimeout(600);
}

async function forceSplash(page) {
  await page.addInitScript(() => {
    window.__amynestAppCoreReady = false;
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#splash", { state: "visible", timeout: 15000 });
  await page.evaluate(() => {
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.remove("splash-hide");
    splash.style.opacity = "1";
    splash.style.visibility = "visible";
    splash.style.pointerEvents = "auto";
    splash.style.display = "flex";
    // Hide root so splash is the only full-frame subject
    const root = document.getElementById("root");
    if (root) root.style.visibility = "hidden";
  });
  await page.waitForTimeout(2800); // allow tagline/continue entrance timing
}

async function dismissSplash(page) {
  await page.evaluate(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      splash.remove();
    }
    const root = document.getElementById("root");
    if (root) root.style.visibility = "";
  });
}

async function captureLanding(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissSplash(page);
  await page.waitForSelector('[data-testid="button-hero-cta"], h1', { timeout: 30000 });
  await settle(page);
}

async function captureAuth(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissSplash(page);
  await page.waitForSelector("h1", { timeout: 30000 });
  await settle(page);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await forceSplash(page);
  await shot(page, "01-splash-desktop");

  await captureLanding(page);
  await shot(page, "02-landing-desktop");

  await captureAuth(page, "/sign-up");
  await shot(page, "03-signup-desktop");

  await captureAuth(page, "/sign-in");
  await shot(page, "04-signin-desktop");

  await browser.close();
}

async function runMobile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...MOBILE,
  });
  const page = await context.newPage();

  await forceSplash(page);
  await shot(page, "01-splash-mobile");

  await captureLanding(page);
  await shot(page, "02-landing-mobile");

  await captureAuth(page, "/sign-up");
  await shot(page, "03-signup-mobile");

  await captureAuth(page, "/sign-in");
  await shot(page, "04-signin-mobile");

  await browser.close();
}

await runDesktop();
await runMobile();
console.log("DONE", OUT);
