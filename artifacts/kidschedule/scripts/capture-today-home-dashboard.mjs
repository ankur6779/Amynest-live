import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.FE_BASE_URL || "http://localhost:3000";
const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });

const widths = [320, 360, 390, 430];
const height = 844;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-dev-shm-usage"],
});

async function capture(width, panel, suffix = "") {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 1024,
    hasTouch: width < 1024,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/playwright-today-home-dashboard.html?panel=${panel}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="today-home-begin"]', { timeout: 20000 });
  await page.waitForSelector('[data-testid="mobile-tab-bar"]', { timeout: 20000 });
  await page.waitForTimeout(700);
  const name = `dashboard_living_${panel}_${width}w`;
  await page.screenshot({
    path: join(OUT, `${name}.png`),
    fullPage: false,
  });
  const cta = page.getByTestId("today-home-begin");
  const fab = page.locator("#amy-fab-floating");
  const tab = page.getByTestId("mobile-tab-bar");
  const insight = page.getByTestId("today-home-insight");
  const plan = page.getByTestId("today-home-plan-state");
  const ctaBox = await cta.boundingBox();
  const fabBox = await fab.boundingBox();
  const tabBox = await tab.boundingBox();
  const insightBox = (await insight.count()) ? await insight.boundingBox() : null;
  const planBox = await plan.boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  const planAfterScroll = await plan.boundingBox();
  const tabAfter = await tab.boundingBox();
  await page.screenshot({
    path: join(OUT, `${name}_bottom.png`),
    fullPage: false,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const overlaps = (a, b) =>
    !!(a && b) && !(a.y + a.height < b.y || b.y + b.height < a.y || a.x + a.width < b.x || b.x + b.width < a.x);
  console.log(JSON.stringify({
    name,
    ctaText: ((await cta.textContent()) ?? "").trim(),
    generateVisible: await page.getByText("Generate routine", { exact: false }).count(),
    overflowX,
    overlapFabCta: overlaps(ctaBox, fabBox),
    overlapFabInsight: overlaps(insightBox, fabBox),
    overlapTabPlanInitial: overlaps(planBox, tabBox),
    planClearsTabAfterScroll: planAfterScroll && tabAfter ? planAfterScroll.y + planAfterScroll.height <= tabAfter.y + 1 : false,
    ctaY: ctaBox && Math.round(ctaBox.y),
    insightY: insightBox && Math.round(insightBox.y),
    fabY: fabBox && Math.round(fabBox.y),
    tabY: tabBox && Math.round(tabBox.y),
    planBottomInitial: planBox && Math.round(planBox.y + planBox.height),
    planBottomScrolled: planAfterScroll && Math.round(planAfterScroll.y + planAfterScroll.height),
  }));
  await context.close();
}

for (const panel of ["empty", "plan"]) {
  for (const width of widths) {
    await capture(width, panel);
  }
}

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const dpage = await desktop.newPage();
await dpage.goto(`${BASE}/playwright-today-home-dashboard.html?panel=plan`, { waitUntil: "networkidle", timeout: 60000 });
await dpage.waitForSelector('[data-testid="today-home-begin"]');
await dpage.waitForTimeout(600);
await dpage.screenshot({ path: join(OUT, "dashboard_living_plan_desktop_1280.png") });
console.log("desktop plan captured");
await dpage.goto(`${BASE}/playwright-today-home-dashboard.html?panel=empty`, { waitUntil: "networkidle", timeout: 60000 });
await dpage.waitForSelector('[data-testid="today-home-begin"]');
await dpage.waitForTimeout(600);
await dpage.screenshot({ path: join(OUT, "dashboard_living_empty_desktop_1280.png") });
console.log("desktop empty captured");
await desktop.close();

await browser.close();
