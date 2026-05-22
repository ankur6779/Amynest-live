#!/usr/bin/env node
/** One-off: sign in and capture Parent Hub "Today For You" section. */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../screenshots");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";

const MOCK_CHILD = { id: 1, name: "Aarav", age: 5, ageMonths: 6 };

async function installHubMocks(context) {
  await context.route("**/api/onboarding**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ onboardingComplete: true, profileComplete: true }),
    });
  });
  await context.route("**/api/children**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([MOCK_CHILD]),
      });
      return;
    }
    await route.continue();
  });
  await context.route("**/api/feature-usage**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ isPremium: true, usedFeatures: [] }),
    });
  });
  await context.addInitScript(() => {
    localStorage.setItem("onboardingComplete", "true");
    localStorage.setItem("amynest:hub:activeChildId", "1");
  });
}

async function dismissCountryPromptIfVisible(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2_000 }).catch(() => false))) return;
    await yes.click({ force: true });
    await page.waitForTimeout(600);
  }
}

async function signIn(page) {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "networkidle", timeout: 120_000 });
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 120_000 });
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(
    (url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"),
    { timeout: 120_000 },
  );
  await page
    .waitForFunction(() => window.__amynestAppCoreReady === true, { timeout: 45_000 })
    .catch(() => {});
  await dismissCountryPromptIfVisible(page);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "en-US",
  colorScheme: "dark",
  geolocation: { latitude: 28.6139, longitude: 77.2090 },
  permissions: ["geolocation"],
});
await installHubMocks(context);
const page = await context.newPage();

try {
  await signIn(page);
  await page.goto(`${BASE_URL}/parenting-hub`, { waitUntil: "networkidle", timeout: 90_000 });
  await dismissCountryPromptIfVisible(page);
  await page.waitForSelector('[data-testid="hub-quick-actions"]', { timeout: 45_000 });
  await page.waitForSelector("#hub-group-today", { timeout: 45_000 });
  await page.waitForSelector('[data-section-id="amy-ai"]', { timeout: 45_000 });
  await page.waitForTimeout(1500);

  const fullPath = path.join(OUT_DIR, "hub-today-for-you-full-mobile.png");
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`✓ Full page: ${fullPath}`);

  const section = page.locator("#hub-group-today");
  const sectionPath = path.join(OUT_DIR, "hub-today-for-you-section-mobile.png");
  await section.screenshot({ path: sectionPath });
  console.log(`✓ Today section: ${sectionPath}`);

  const quickActions = page.locator('[data-testid="hub-quick-actions"]');
  const quickPath = path.join(OUT_DIR, "hub-quick-actions-mobile.png");
  await quickActions.screenshot({ path: quickPath });
  console.log(`✓ Quick actions: ${quickPath}`);
} catch (err) {
  const errPath = path.join(OUT_DIR, "hub-preview-error.png");
  await page.screenshot({ path: errPath, fullPage: true }).catch(() => {});
  console.error("Capture failed:", err.message);
  console.error(`Error screenshot: ${errPath}`);
  console.error("Current URL:", page.url());
  process.exitCode = 1;
} finally {
  await browser.close();
}
