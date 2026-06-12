#!/usr/bin/env node
/**
 * Live production certification probe — writes audit/final-live-cert-probe.json
 */
import { chromium, devices } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";

const BASE = "https://www.amynest.in";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASS = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";
const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(REPO, "audit", "final-live-cert-probe.json");
const SHOTS = join(REPO, "audit", "screenshots", "final-live-cert");
mkdirSync(SHOTS, { recursive: true });

const REMOVED_RHYME_IDS = [
  "beneath-the-moss-blanket",
  "beyond-the-rainbow",
  "little-star-shine-bright",
  "london-bridge-piano-version",
];

const report = {
  validatedAt: new Date().toISOString(),
  baseURL: BASE,
  phase1: {},
  phase2: {},
  phase4: {},
  phase5: {},
  phase6: {},
  consoleErrors: [],
  networkFailures: [],
};

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 120_000 });
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(800);
  }
}

async function verifyAudio(page) {
  try {
    return await page.evaluate(async () => {
    const mgr = window.__amynestAudioManagerRef;
    const pick = () => {
      const fromMgr = mgr?.getCurrentElement?.();
      if (fromMgr?.src) return fromMgr;
      return Array.from(document.querySelectorAll("audio,video")).find((m) => m.src) ?? null;
    };
    let media = null;
    for (let i = 0; i < 40; i++) {
      media = pick();
      if (media?.src) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!media?.src) return { ok: false, reason: "no_audio_element", checks: { elementExists: false } };
    try {
      if (media.paused) await media.play();
    } catch (e) {
      return { ok: false, reason: "play_failed", error: String(e) };
    }
    await new Promise((r) => setTimeout(r, 2500));
    const t1 = media.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    const t2 = media.currentTime;
    let srcStatus = null;
    let contentType = null;
    try {
      const head = await fetch(media.src, { method: "HEAD" });
      srcStatus = head.status;
      contentType = head.headers.get("content-type");
    } catch {
      srcStatus = -1;
    }
    const ok = t1 > 0 && (t2 > t1 || !media.paused);
    return {
      ok,
      reason: ok ? "ok" : t1 > 0 ? "not_advancing" : "currentTime_zero",
      checks: {
        elementExists: true,
        currentTimeGt0: t1 > 0,
        advancing: t2 > t1,
        duration: media.duration,
        srcStatus,
        contentType,
        srcTail: media.src.slice(-80),
      },
    };
  });
  } catch (e) {
    return { ok: false, reason: "evaluate_failed", error: String(e) };
  }
}

async function probeDeployment(page) {
  const chunks = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/assets/") && u.endsWith(".js")) chunks.push(u);
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(3000);
  const indexHtml = await (await fetch(BASE + "/")).text();
  const indexHash = indexHtml.match(/assets\/index-([A-Za-z0-9_-]+)\.js/)?.[1] ?? null;
  const deployMeta = indexHtml.match(/amynest-deploy[^>]+content="([^"]+)"/)?.[1] ?? null;
  const appCoreUrl = chunks.find((u) => /AppCore-/.test(u)) ?? null;
  let appCore = { hash: null, DevRouteRedirectCount: 0, bytes: 0 };
  if (appCoreUrl) {
    const js = await (await fetch(appCoreUrl)).text();
    appCore = {
      hash: appCoreUrl.match(/AppCore-([A-Za-z0-9_-]+)\.js/)?.[1] ?? null,
      url: appCoreUrl,
      DevRouteRedirectCount: (js.match(/DevRouteRedirect/g) || []).length,
      bytes: js.length,
    };
  }
  const health = await fetch(BASE + "/api/health").then((r) => r.json());
  const catalog = await fetch(BASE + "/api/audio/rhymes/catalog").then((r) => r.json());
  report.phase1 = {
    indexHash,
    priorHash: "Cdu12y8L",
    deployChanged: indexHash !== "Cdu12y8L",
    deployMeta,
    appCore,
    health,
    rhymeCatalogCount: catalog.count,
    deployVerified: indexHash !== "Cdu12y8L" && health.ok === true,
  };
}

async function probeGuestSecurity(browser) {
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  const routes = [
    "/debug-parity",
    "/dev/phonics-audio-preview",
    "/dev/rhymes-audio-ab",
    "/debug/learning",
  ];
  const results = [];
  for (const path of routes) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const devContent =
      /Debug Parity Report|Phonics sound demo|rhymes-audio-ab|Learning Debug/i.test(bodyText);
    const blocked =
      url.includes("/sign-in") ||
      url.includes("/dashboard") ||
      url.includes("/login") ||
      !devContent;
    const shot = join(SHOTS, `guest-security-${path.replace(/\//g, "_")}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({
      path,
      finalUrl: url,
      devContentRendered: devContent,
      blocked,
      verdict: blocked && !devContent ? "PASS" : "FAIL",
      screenshot: shot,
    });
  }
  await ctx.close();
  report.phase2 = {
    verdict: results.every((r) => r.verdict === "PASS") ? "PASS" : "FAIL",
    routes: results,
  };
}

async function probeRhymes() {
  const catalog = await fetch(BASE + "/api/audio/rhymes/catalog").then((r) => r.json());
  const entries = catalog.entries ?? [];
  const ids = entries.map((e) => e.id ?? e.rhymeId ?? e.slug).filter(Boolean);
  const removedPresent = REMOVED_RHYME_IDS.filter((id) => ids.includes(id));
  const sampleSize = Math.min(20, entries.length);
  const indices = new Set();
  while (indices.size < sampleSize) indices.add(randomInt(0, entries.length));
  const sample = [];
  for (const i of indices) {
    const entry = entries[i];
    const id = entry.id ?? entry.rhymeId ?? entry.slug;
    let url = entry.url ?? entry.audioUrl ?? entry.gcsUrl ?? null;
    if (!url && id) {
      try {
        const signed = await fetch(`${BASE}/api/audio/signed-url/${encodeURIComponent(id)}`).then((r) =>
          r.json(),
        );
        url = signed.url ?? signed.signedUrl ?? signed.audioUrl ?? null;
      } catch {
        /* ignore */
      }
    }
    let httpStatus = null;
    let contentType = null;
    let contentLength = null;
    if (url) {
      try {
        const head = await fetch(url, { method: "HEAD" });
        httpStatus = head.status;
        contentType = head.headers.get("content-type");
        contentLength = head.headers.get("content-length");
      } catch (e) {
        httpStatus = -1;
      }
    }
    sample.push({ id, url: url?.slice(0, 120), httpStatus, contentType, contentLength, playback: httpStatus === 200 });
  }
  report.phase4 = {
    registryCount: catalog.count,
    expectedCount: 168,
    countMatch: catalog.count === 168,
    removedIdsPresent: removedPresent,
    removedIdsAbsent: removedPresent.length === 0,
    sampleSize,
    samplePass: sample.filter((s) => s.httpStatus === 200).length,
    sample,
    verdict:
      catalog.count === 168 && removedPresent.length === 0 && sample.every((s) => s.httpStatus === 200)
        ? "PASS"
        : "FAIL",
  };
}

async function probeJourneys(browser) {
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("requestfailed", (req) => {
    report.networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const guestJourneys = [];
  for (const path of ["/", "/sign-in"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2000);
    const shot = join(SHOTS, `guest-${path === "/" ? "landing" : "sign-in"}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    guestJourneys.push({ path, finalUrl: page.url(), ok: page.url().includes("amynest.in") });
  }

  await signIn(page);
  const parentRoutes = ["/dashboard", "/parenting-hub", "/routines", "/amy-coach"];
  const parentJourneys = [];
  for (const path of parentRoutes) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(2500);
    const shot = join(SHOTS, `parent-${path.slice(1).replace(/\//g, "-")}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    parentJourneys.push({ path, finalUrl: page.url(), ok: !page.url().includes("/sign-in") });
  }

  const childRoutes = ["/phonics", "/parenting-hub#tile-story-hub", "/rhymes", "/discovery-worlds"];
  const childJourneys = [];
  for (const path of childRoutes) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(2500);
    const shot = join(SHOTS, `child-${path.slice(1).replace(/[#/]/g, "-")}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    childJourneys.push({ path, finalUrl: page.url(), ok: !page.url().includes("/sign-in") });
  }

  report.phase5 = { guestJourneys, parentJourneys, childJourneys };
  await ctx.close();
}

async function probeRegression(browser) {
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  await signIn(page);

  const reg = {};

  // dev routes signed-in should redirect
  await page.goto(BASE + "/debug-parity", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  reg.devRoutesSignedIn = {
    path: "/debug-parity",
    finalUrl: page.url(),
    redirected: page.url().includes("/dashboard") || page.url().includes("/sign-in"),
    devContent: /Debug Parity Report/.test(await page.locator("body").innerText().catch(() => "")),
  };

  // phonics
  await page.goto(BASE + "/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2500);
  const toddler = page.getByRole("button", { name: /Audit-Toddler/i });
  if (await toddler.isVisible({ timeout: 5000 }).catch(() => false)) await toddler.click();
  await page.waitForTimeout(800);
  const playBtn = page.locator('[data-testid^="audio-play-"]').first();
  if (await playBtn.isVisible({ timeout: 15000 }).catch(() => false)) await playBtn.click();
  await page.waitForTimeout(2000);
  reg.phonics = await verifyAudio(page);
  await page.screenshot({ path: join(SHOTS, "regression-phonics.png"), fullPage: true });

  // infant story
  await page.goto(BASE + "/parenting-hub#tile-infant-hub", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2500);
  const infantBtn = page.getByRole("button").filter({ hasText: /Audit-Infant|Infant/i }).first();
  if (await infantBtn.isVisible({ timeout: 8000 }).catch(() => false)) await infantBtn.click();
  await page.waitForTimeout(1000);
  const storyTile = page.locator('[data-testid^="sleep-track-tile-"]').first();
  if (await storyTile.isVisible({ timeout: 8000 }).catch(() => false)) await storyTile.click();
  await page.waitForTimeout(2000);
  reg.infantStory = await verifyAudio(page);
  await page.screenshot({ path: join(SHOTS, "regression-infant-story.png"), fullPage: true });

  // rhymes page load
  await page.goto(BASE + "/rhymes", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2500);
  const rhymeTile = page.locator('[data-testid^="rhyme-tile-"], [data-testid^="rhyme-card-"]').first();
  if (await rhymeTile.isVisible({ timeout: 15000 }).catch(() => false)) await rhymeTile.click();
  await page.waitForTimeout(2000);
  reg.rhymes = await verifyAudio(page);
  await page.screenshot({ path: join(SHOTS, "regression-rhymes.png"), fullPage: true });

  report.phase6 = reg;
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  const depPage = await browser.newPage();
  await probeDeployment(depPage);
  await depPage.close();
  await probeGuestSecurity(browser);
  await probeRhymes();
  await probeJourneys(browser);
  await probeRegression(browser);
} finally {
  await browser.close();
}

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log("Wrote", OUT);
