import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.FE_BASE_URL || "http://localhost:3000";
const OUT = "/opt/cursor/artifacts/screenshots/r3-living";
mkdirSync(OUT, { recursive: true });

async function clear(page) {
  await page.goto(`${BASE}/begin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });
  await page.goto(`${BASE}/begin`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="fe-visual-memory"]', { timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(name);
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-dev-shm-usage"],
});
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
await clear(page);

await shot(page, "01-arrive-living");
await page.waitForTimeout(1800);
await shot(page, "01b-arrive-breath");

await page.getByTestId("fe-welcome-continue").click();
await page.waitForTimeout(800);
await shot(page, "02-name-idle");
await page.getByTestId("fe-child-name").fill("A");
await page.waitForTimeout(700);
await shot(page, "02b-name-acknowledge");
await page.getByTestId("fe-child-name").fill("Aria");
await page.waitForTimeout(500);
await page.getByTestId("fe-name-continue").click();
await page.waitForTimeout(800);
await shot(page, "03-age-idle");
await page.getByTestId("fe-age-5-7").click();
await page.waitForTimeout(800);
await shot(page, "03b-age-grow");
await page.getByTestId("fe-age-continue").click();
await page.waitForTimeout(800);
await shot(page, "04-today-idle");
await page.getByTestId("fe-today-home").click();
await page.waitForTimeout(900);
await shot(page, "04b-today-settle");
await page.getByTestId("fe-today-continue").click();
await page.waitForSelector(".fe-signal", { timeout: 12000 });
await page.waitForTimeout(900);
await shot(page, "05-exhale-noticing");
await page.waitForTimeout(2800);
await shot(page, "05b-exhale-more");

// Short living film — first ~20s of presence
await context.close();
const film = await browser.newContext({ ...devices["iPhone 13"], recordVideo: { dir: OUT, size: { width: 390, height: 844 } } });
const vpage = await film.newPage();
await clear(vpage);
await vpage.waitForTimeout(2200);
await vpage.getByTestId("fe-welcome-continue").click();
await vpage.waitForTimeout(700);
await vpage.getByTestId("fe-child-name").type("Aria", { delay: 140 });
await vpage.waitForTimeout(900);
await vpage.getByTestId("fe-name-continue").click();
await vpage.waitForTimeout(700);
await vpage.getByTestId("fe-age-5-7").click();
await vpage.waitForTimeout(900);
await vpage.getByTestId("fe-age-continue").click();
await vpage.waitForTimeout(700);
await vpage.getByTestId("fe-today-home").click();
await vpage.waitForTimeout(1000);
await vpage.getByTestId("fe-today-continue").click();
await vpage.waitForSelector(".fe-signal", { timeout: 12000 });
await vpage.waitForTimeout(3600);
await film.close();

await browser.close();
console.log("done", OUT);
