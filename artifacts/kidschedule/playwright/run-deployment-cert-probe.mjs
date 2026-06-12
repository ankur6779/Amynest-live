#!/usr/bin/env node
import { chromium, devices } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(REPO, "audit", "deployment-cert-probe.json");
const SS = join(REPO, "audit", "screenshots", "deployment-cert");
const BASE = "https://www.amynest.in";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASS = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";

mkdirSync(SS, { recursive: true });

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 90_000 });
  const yes = page.getByRole("button", { name: /Yes, that's right/i });
  if (await yes.isVisible({ timeout: 3_000 }).catch(() => false)) await yes.click();
}

async function verifyPlayback(page) {
  return page.evaluate(async () => {
    const pick = () =>
      Array.from(document.querySelectorAll("audio,video")).find((m) => m.src) ?? null;
    let media = null;
    for (let i = 0; i < 40; i++) {
      media = pick();
      if (media?.src) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!media?.src) return { ok: false, reason: "no_media" };
    try {
      if (media.paused) await media.play();
    } catch (e) {
      return { ok: false, reason: "play_failed", error: String(e) };
    }
    await new Promise((r) => setTimeout(r, 2500));
    const t1 = media.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    const t2 = media.currentTime;
    return {
      ok: t1 > 0 && (t2 > t1 || !media.paused),
      reason: t1 > 0 ? "ok" : "currentTime_zero",
      currentTime: t1,
      advancing: t2 > t1,
      srcTail: media.src.slice(-60),
    };
  });
}

async function probeAppCore(page) {
  const chunks = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/assets/") && u.endsWith(".js")) chunks.push(u);
  });
  await page.goto(`${BASE}/debug-parity`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(4_000);
  const appCoreUrl = chunks.find((u) => /AppCore-/.test(u));
  let bundleAnalysis = { appCoreUrl: appCoreUrl ?? null, chunksLoaded: chunks, allAssetJs: chunks.filter((u) => u.includes("/assets/")) };
  if (appCoreUrl) {
    const js = await (await fetch(appCoreUrl)).text();
    bundleAnalysis = {
      ...bundleAnalysis,
      bytes: js.length,
      DevRouteRedirectCount: (js.match(/DevRouteRedirect/g) || []).length,
      debugParityRoute: js.match(/path:"\/debug-parity"[^}]{0,250}/)?.[0] ?? null,
      devPhonicsRoute: js.match(/path:"\/dev\/phonics-audio-preview"[^}]{0,250}/)?.[0] ?? null,
      hasDebugParityHeading: js.includes("Debug Parity Report"),
      hasPhonicsDemo: js.includes("Phonics sound demo"),
    };
  }
  const deployVersion = await page.evaluate(() => {
    try {
      return sessionStorage.getItem("amynest-deploy-version") ?? null;
    } catch {
      return null;
    }
  });
  return { bundleAnalysis, deployVersion, finalUrl: page.url(), pageTitle: await page.title() };
}

async function probeInfant(page) {
  await page.goto(`${BASE}/parenting-hub#tile-infant-hub`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2_500);

  const infantBtn = page.getByRole("button").filter({ hasText: /Audit-Infant|0-12|Infant/i }).first();
  if (await infantBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await infantBtn.click({ timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
  }

  const results = { story: null, poem: null, lullaby: null, sleepModuleVisible: false };

  const sleepShell = page.getByTestId("sleep-module-shell");
  results.sleepModuleVisible = await sleepShell.isVisible({ timeout: 15_000 }).catch(() => false);

  if (results.sleepModuleVisible) {
    for (const tab of ["stories", "poems", "lullabies"]) {
      const label = tab === "lullabies" ? /^lullabies$/i : tab === "poems" ? /^poems$/i : /^stories$/i;
      const tabBtn = page.getByRole("tab", { name: label });
      if (await tabBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await tabBtn.click({ timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
      const tile =
        tab === "poems"
          ? page.locator('[data-testid^="poem-tile-"]').first()
          : page.locator('[data-testid^="sleep-track-tile-"]').first();
      if (await tile.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await tile.click({ timeout: 12_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
        const playBtn = page.getByTestId("sleep-track-fullscreen-player").locator("button.h-16.w-16");
        if (await playBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await playBtn.click({ timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(1_500);
        }
        const key = tab === "stories" ? "story" : tab === "poems" ? "poem" : "lullaby";
        results[key] = await verifyPlayback(page);
        await page.screenshot({ path: join(SS, `infant-${tab}.png`), fullPage: true });
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }

  const poemSection = page.getByTestId("infant-poems-section");
  if (!results.poem && (await poemSection.isVisible({ timeout: 3_000 }).catch(() => false))) {
    const play = poemSection.locator('[data-testid^="audio-play-"]').first();
    if (await play.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await play.click({ timeout: 10_000 });
      await page.waitForTimeout(2_000);
      results.poem = await verifyPlayback(page);
      await page.screenshot({ path: join(SS, "infant-poem-fallback.png"), fullPage: true });
    }
  }

  return results;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Pixel 5"] });
const page = await ctx.newPage();
const out = { validatedAt: new Date().toISOString(), baseUrl: BASE };

out.check5_build = await probeAppCore(await ctx.newPage());
await signIn(page);
await page.goto(`${BASE}/phonics`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForTimeout(2_000);
await page.screenshot({ path: join(SS, "phonics-signed-in.png"), fullPage: true });
out.check2_phonics_url = page.url();
out.check3_infant = await probeInfant(page);

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
