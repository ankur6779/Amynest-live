import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.FE_BASE_URL || "http://localhost:3000";
const OUT = "/opt/cursor/artifacts/screenshots/r1-film";
mkdirSync(OUT, { recursive: true });

async function clear(page) {
  await page.goto(`${BASE}/begin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch {}
  });
  await page.goto(`${BASE}/begin`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="fe-visual-memory"]', { timeout: 30000 });
  await page.waitForTimeout(900);
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(name);
}

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-dev-shm-usage"] });
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
await clear(page);

await shot(page, "01-opening");
await page.getByTestId("fe-welcome-continue").click();
await page.waitForTimeout(700);
await shot(page, "02-discovery-name");
await page.getByTestId("fe-child-name").fill("Aria");
await page.waitForTimeout(350);
await shot(page, "02b-discovery-name-answered");
await page.getByTestId("fe-name-continue").click();
await page.waitForTimeout(700);
await shot(page, "03-discovery-age");
await page.getByTestId("fe-age-5-7").click();
await page.waitForTimeout(350);
await shot(page, "03b-discovery-age-answered");
await page.getByTestId("fe-age-continue").click();
await page.waitForTimeout(700);
await shot(page, "04-discovery-today");
await page.getByTestId("fe-today-home").click();
await page.waitForTimeout(350);
await shot(page, "04b-discovery-today-answered");
await page.getByTestId("fe-today-continue").click();
await page.waitForSelector(".fe-signal", { timeout: 12000 });
await page.waitForTimeout(700);
await shot(page, "05-working-assembling");
await page.waitForTimeout(2400);
await shot(page, "05b-working-more");

// desktop opening
await context.close();
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const dpage = await desk.newPage();
await clear(dpage);
await shot(dpage, "desktop-01-opening");
await dpage.getByTestId("fe-welcome-continue").click();
await dpage.waitForTimeout(700);
await dpage.getByTestId("fe-child-name").fill("Aria");
await shot(dpage, "desktop-02-discovery");
await dpage.getByTestId("fe-name-continue").click();
await dpage.waitForTimeout(500);
await dpage.getByTestId("fe-age-5-7").click();
await dpage.getByTestId("fe-age-continue").click();
await dpage.waitForTimeout(500);
await dpage.getByTestId("fe-today-home").click();
await shot(dpage, "desktop-04-discovery-today");
await dpage.getByTestId("fe-today-continue").click();
await dpage.waitForSelector(".fe-signal", { timeout: 10000 });
await dpage.waitForTimeout(700);
await shot(dpage, "desktop-05-working");

await desk.close();
await browser.close();
console.log("done", OUT);
