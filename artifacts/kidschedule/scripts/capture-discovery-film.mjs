import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

const continuity = {
  version: 1,
  childName: "Aria",
  ageBand: "5-7",
  todayContext: "home",
  nextThing: {
    id: "focus-block",
    title: "Give Aria one small focus win",
    detail: "Pick one short task.",
    minutes: 10,
    basedOn: ["It’s Thursday."],
  },
  completedAt: "2026-08-07T10:00:00.000Z",
  valueEarned: true,
  completionKind: "done",
  emotionalContext: "Today feels unhurried.",
  source: "first-experience",
  savedAt: new Date().toISOString(),
};

async function shot(browser, label, after) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.addInitScript((payload) => {
    localStorage.setItem("amynest_first_experience_continuity_v1", JSON.stringify(payload));
    // Force incomplete onboarding so /onboarding shows
    localStorage.removeItem("amynest_onboarding_status_v1");
  }, continuity);
  await page.goto("http://127.0.0.1:3000/dev/child-discovery-film", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="child-discovery-film"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
  if (after) await after(page);
  await page.waitForTimeout(600);
  const file = `${OUT}/${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(JSON.stringify({ file, url: page.url() }));
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, "discovery-arrival-mobile", null);
  await shot(browser, "discovery-age-mobile", async (page) => {
    const film = page.locator('[data-testid="child-discovery-film"]');
    if ((await film.count()) === 0) return;
    await page.locator('[data-testid="discovery-arrival-continue"]').click();
    await page.waitForTimeout(800);
  });
  await shot(browser, "discovery-nrt-rhythm-mobile", async (page) => {
    const film = page.locator('[data-testid="child-discovery-film"]');
    if ((await film.count()) === 0) return;
    await page.locator('[data-testid="discovery-arrival-continue"]').click();
    await page.waitForTimeout(500);
    // age confirm if present
    const age = page.locator('[data-testid="discovery-age-confirm"]');
    if (await age.count()) {
      await age.click();
      await page.waitForTimeout(500);
    }
    const rhythm = page.locator('[data-testid="discovery-rhythm-confirm"]');
    if (await rhythm.count()) {
      // may need to pass infant/today first — just wait for nrt
    }
    await page.waitForSelector('[data-testid="discovery-nrt-preview"]', { timeout: 5000 }).catch(() => {});
  });
} finally {
  await browser.close();
}
