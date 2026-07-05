#!/usr/bin/env node
/**
 * Open local AmyNest with demo login, onboarding skipped, dashboard ready.
 *
 *   node scripts/open-local-demo.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";

const MOCK_CHILD = {
  id: 1,
  name: "Aarav",
  age: 5,
  ageMonths: 60,
  wakeUpTime: "07:00",
  bedTime: "20:30",
};

const MOCK_SUBSCRIPTION = {
  entitlements: {
    ageMonths: 60,
    isInfant: false,
    plan: "yearly",
    status: "active",
    isPremium: true,
    isPremiumSubscriber: true,
    isTrialActive: false,
    trialDaysRemaining: 0,
    allPremiumAccess: true,
    isTrialing: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canAccessLearningHub: true,
    canAccessActivitiesHub: true,
    canAccessSpeechCoach: true,
    canAccessNutritionHub: true,
    canAccessHealthLab: true,
    canAccessDownloads: true,
    canDownloadPhonicsWorkbook: true,
    babyExpertDailyLimit: 99,
    canAccessSleepCoach: true,
    canAccessFeedingRoadmap: true,
    canAccessWeeklyReports: true,
    provider: "manual",
    limits: {
      aiQueriesPerDay: 999,
      infantAiQueriesPerDay: 99,
      childrenMax: 5,
      devicesMax: 5,
      routinesMax: 99,
      hubArticlesMax: 99,
      trialDays: 0,
    },
    usage: {
      aiQueriesToday: 0,
      aiQueriesRemaining: 999,
      infantAiQueriesToday: 0,
      infantAiQueriesRemaining: 99,
      features: {},
    },
  },
  plans: [],
};

async function installDemoMocks(context) {
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

  await context.route("**/api/feature-usage/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: [] }),
    });
  });

  await context.route("**/api/subscription**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUBSCRIPTION),
      });
      return;
    }
    await route.continue();
  });

  await context.route("**/api/parent-profile**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "Demo Parent", countryCode: "IN" }),
    });
  });

  await context.route("**/api/ai-coach/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      path.includes("progress")
        ? { sessions: [] }
        : path.includes("intelligence")
          ? { familyReference: null, insights: [] }
          : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await context.route("**/api/dashboard/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalChildren: 1,
        totalRoutines: 0,
        positiveBehaviorsToday: 0,
        negativeBehaviorsToday: 0,
        routinesGeneratedThisWeek: 0,
        fallback: false,
      }),
    });
  });

  await context.route("**/api/routines**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    await route.continue();
  });

  await context.route("**/api/behavior**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await context.route("**/api/journey**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ days: [], streak: 0 }),
    });
  });

  await context.addInitScript(() => {
    localStorage.setItem("onboardingComplete", "true");
    sessionStorage.setItem("amynest_onboarding_complete_v1", "true");
    localStorage.setItem("amynest:hub:activeChildId", "1");
    localStorage.removeItem("amynest_onboarding_session");
    localStorage.removeItem("amynest_onboarding_chat_v1");
  });
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 1500 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(400);
  }
  for (const label of [/Skip tour/i, /Skip/i, /Got it/i, /Maybe later/i, /Close tour/i]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(
    (url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"),
    { timeout: 120_000 },
  );
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--start-maximized"],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await installDemoMocks(context);
const page = await context.newPage();

console.log("[demo] Signing in…");
await signIn(page);
await dismissOverlays(page);
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page
  .waitForFunction(() => window.__amynestAppCoreReady === true, { timeout: 45_000 })
  .catch(() => {});
await page.waitForTimeout(2000);
await dismissOverlays(page);

const crashed = await page.getByText("Something went wrong").isVisible().catch(() => false);
console.log(crashed ? "[demo] ERROR: crash screen still visible" : "[demo] Ready at:", page.url());

await new Promise(() => {});
