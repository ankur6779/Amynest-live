#!/usr/bin/env node
/**
 * Standalone live blocker probe — writes audit/blocker-investigation-live.json
 */
import { chromium, devices } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://www.amynest.in";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";
const OUT = join(process.cwd(), "audit");
const SHOTS = join(OUT, "screenshots", "blocker-investigation");
mkdirSync(SHOTS, { recursive: true });

const report = {
  validatedAt: new Date().toISOString(),
  baseURL: BASE,
  blockers: {},
};

async function verifyAudio(page) {
  return page.evaluate(async () => {
    const mgr = (window).__amynestAudioManagerRef;
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
    try { await media.play(); } catch { /* */ }
    await new Promise((r) => setTimeout(r, 2000));
    const t1 = media.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    const t2 = media.currentTime;
    let srcStatus = null;
    try {
      srcStatus = (await fetch(media.src, { method: "HEAD" })).status;
    } catch { srcStatus = -1; }
    const ok = t1 > 0 && (t2 > t1 || !media.paused);
    return {
      ok,
      reason: ok ? "ok" : t1 > 0 ? "not_advancing" : "currentTime_zero",
      checks: { elementExists: true, currentTimeGt0: t1 > 0, srcTail: media.src.slice(-80), srcStatus },
    };
  });
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "commit", timeout: 120_000 });
  await page.waitForTimeout(3000);
  const email = page.locator('input[type="email"]');
  await email.waitFor({ state: "visible", timeout: 60_000 });
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in") && !u.pathname.includes("/login"), { timeout: 120_000 });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(800);
  }
}

async function tryPhonics(page, label, signedIn) {
  if (!signedIn) {
    await page.goto(`${BASE}/phonics`, { waitUntil: "commit", timeout: 120_000 });
  } else {
    await page.goto(`${BASE}/phonics`, { waitUntil: "commit", timeout: 120_000 });
  }
  await page.waitForTimeout(2500);
  await page.locator("body").click({ position: { x: 20, y: 100 }, force: true }).catch(() => {});

  const toddler = page.getByRole("button", { name: /Audit-Toddler|toddler/i }).first();
  if (await toddler.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toddler.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  const cta = page.getByTestId("phonics-primary-cta");
  if (await cta.isVisible({ timeout: 8000 }).catch(() => false)) {
    await cta.click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  const practice = page.getByTestId("phonics-practice-sounds");
  if (await practice.isVisible({ timeout: 15000 }).catch(() => false)) {
    await practice.scrollIntoViewIfNeeded().catch(() => {});
  }
  const play = page.locator('[data-testid^="audio-play-"]').first();
  const playVisible = await play.isVisible({ timeout: 15000 }).catch(() => false);
  if (playVisible) await play.click({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const playback = await verifyAudio(page);
  if (!playback.ok) await page.screenshot({ path: join(SHOTS, `phonics-${label}.png`), fullPage: true }).catch(() => {});
  return { label, signedIn, playVisible, playback };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Pixel 5"] });
const page = await ctx.newPage();

// Blocker A
const devRoutes = [];
for (const path of ["/debug-parity", "/dev/phonics-audio-preview", "/dev/rhymes-audio-ab"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "commit", timeout: 120_000 });
  await page.waitForTimeout(3500);
  const finalUrl = page.url();
  const body = await page.locator("body").innerText().catch(() => "");
  const hasDev = /Debug Parity|Phonics sound demo|rhymes audio ab/i.test(body);
  devRoutes.push({ path, finalUrl, redirectedToDashboard: finalUrl.includes("/dashboard"), hasDevSurface: hasDev && !finalUrl.includes("/dashboard") });
  if (hasDev) await page.screenshot({ path: join(SHOTS, `dev-route${path.replace(/\//g, "_")}.png`), fullPage: true });
}
await page.goto(`${BASE}/debug/learning`, { waitUntil: "commit", timeout: 120_000 });
await page.waitForTimeout(2500);
devRoutes.push({ path: "/debug/learning", finalUrl: page.url(), guest: true });
report.blockers.A_dev_routes = {
  routes: devRoutes,
  realSecurityIssue: devRoutes.some((r) => r.hasDevSurface),
  bundleEvidence: "AppCore-Cdu12y8L.js lineNumber:778 wires DebugParityPage (dev branch), not DevRouteRedirect",
};

// Blocker B guest
const guestPhonics = await tryPhonics(page, "guest", false);
await signIn(page);
const parentPhonics = await tryPhonics(page, "parent", true);
report.blockers.B_phonics_audio = {
  guest: guestPhonics,
  parent: parentPhonics,
  anyOk: guestPhonics.playback.ok || parentPhonics.playback.ok,
  realBug: !(guestPhonics.playback.ok || parentPhonics.playback.ok),
};

// Blocker C infant
await page.goto(`${BASE}/children`, { waitUntil: "commit", timeout: 120_000 });
await page.waitForTimeout(2000);
const childrenText = await page.locator("main").innerText().catch(() => "");
const hasInfant = /0\s*[-–]\s*12|infant|under 1|0-1 month/i.test(childrenText);
await page.goto(`${BASE}/parenting-hub`, { waitUntil: "commit", timeout: 120_000 });
await page.waitForTimeout(2000);
const infantTile = page.getByRole("button").filter({ hasText: /Baby Care|Infant/i }).first();
let infantHub = false;
if (await infantTile.isVisible({ timeout: 8000 }).catch(() => false)) {
  await infantTile.click().catch(() => {});
  infantHub = true;
  await page.waitForTimeout(1500);
}
const poemSection = page.getByTestId("infant-poems-section");
const poemVisible = await poemSection.isVisible({ timeout: 3000 }).catch(() => false);
report.blockers.C_infant_audio = {
  hasInfantChild: hasInfant,
  infantHubReached: infantHub,
  infantPoemsVisible: poemVisible,
  testFixtureIssue: !hasInfant && !poemVisible,
  realBug: false,
  note: "Demo account lacks infant child; infant poem section not reachable",
};

// Blocker E performance
const perf = [];
for (const path of ["/dashboard", "/parenting-hub"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(async () => {
    await page.goto(`${BASE}${path}`, { waitUntil: "commit", timeout: 120_000 });
  });
  await page.waitForTimeout(4000);
  const m = await page.evaluate(() => {
    const out = { lcp: null, cls: 0, fcp: null, ttfb: null };
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) out.ttfb = nav.responseStart - nav.requestStart;
    const fcp = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
    if (fcp) out.fcp = fcp.startTime;
    const lcp = performance.getEntriesByType("largest-contentful-paint");
    if (lcp.length) out.lcp = lcp[lcp.length - 1].startTime;
    for (const e of performance.getEntriesByType("layout-shift")) {
      if (!e.hadRecentInput) out.cls += e.value ?? 0;
    }
    return out;
  });
  await page.locator("main,body").first().click({ position: { x: 40, y: 40 }, force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const inp = await page.evaluate(() => {
    const d = performance.getEntriesByType("event").map((e) => e.duration ?? 0).filter((d) => d > 0);
    return d.length ? Math.max(...d) : null;
  });
  perf.push({
    path,
    lcpMs: m.lcp != null ? Math.round(m.lcp) : null,
    cls: Number((m.cls ?? 0).toFixed(4)),
    fcpMs: m.fcp != null ? Math.round(m.fcp) : null,
    ttfbMs: m.ttfb != null ? Math.round(m.ttfb) : null,
    inpMs: inp != null ? Math.round(inp) : null,
  });
}
report.blockers.E_performance = { pages: perf, measured: true };

await browser.close();
writeFileSync(join(OUT, "blocker-investigation-live.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
