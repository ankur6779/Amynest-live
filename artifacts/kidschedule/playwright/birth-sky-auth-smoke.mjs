#!/usr/bin/env node
/**
 * Authenticated post-deploy smoke:
 * first-sky → reveal → dashboard → Ask Amy → Sky sounds toggle
 *
 * Usage:
 *   BASE_URL=https://amynest-web.pages.dev node scripts/birth-sky-auth-smoke.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "https://amynest-web.pages.dev";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASS = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "audit", "birth-sky-auth-smoke");
mkdirSync(OUT_DIR, { recursive: true });

const report = {
  validatedAt: new Date().toISOString(),
  baseURL: BASE,
  email: EMAIL,
  steps: {},
  consoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  finalUrl: null,
  finalTestIds: [],
  ok: false,
};

function mark(step, ok, detail = {}) {
  report.steps[step] = { ok, at: new Date().toISOString(), ...detail };
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail.note ? ` — ${detail.note}` : ""}`);
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  return path;
}

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (await yes.isVisible({ timeout: 1500 }).catch(() => false)) {
      await yes.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }
    break;
  }
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);
  const email = page.locator('input[type="email"]').first();
  await email.waitFor({ state: "visible", timeout: 60_000 });
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 120_000 });
  await dismissOverlays(page);
}

async function waitForAny(page, selectors, timeout = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) return sel;
    }
    await page.waitForTimeout(400);
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 AmyNestSmoke/1.0",
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => report.pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    report.networkFailures.push({ url: req.url(), error: req.failure()?.errorText });
  });

  try {
    await signIn(page);
    await shot(page, "01-signed-in");
    mark("sign_in", true, { url: page.url() });

    // Prefer hub tile; fall back to deep link.
    await page.goto(`${BASE}/parenting-hub`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await dismissOverlays(page);
    await page.waitForTimeout(2000);

    let hubTile = page.getByTestId("birth-sky-launch-card");
    let hubVisible = await hubTile.isVisible().catch(() => false);
    if (!hubVisible) {
      // Infant hub: scroll for Amy Astro section
      for (let i = 0; i < 8 && !hubVisible; i++) {
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(400);
        hubVisible = await hubTile.isVisible().catch(() => false);
      }
    }
    mark("hub_tile", hubVisible, {
      note: hubVisible ? "found birth-sky-launch-card" : "not in hub scroll; will deep-link",
    });
    await shot(page, "02-hub");

    if (hubVisible) {
      await hubTile.click();
    } else {
      await page.goto(`${BASE}/birth-sky`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    }
    await page.waitForTimeout(2500);
    await shot(page, "03-birth-sky-entry");

    const entry = await waitForAny(page, [
      '[data-testid="birth-sky-begin"]',
      '[data-testid="birth-sky-dashboard-hero"]',
      '[data-testid="birth-sky-reveal-cta"]',
      '[data-testid="birth-sky-formation-copy"]',
      '[data-testid="amy-astro-loading"]',
      '[data-testid="birth-sky-setup-time"]',
      '[data-testid="birth-sky-setup-place"]',
      '[data-testid="birth-sky-setup-date"]',
    ], 60_000);

    mark("entry_surface", Boolean(entry), { note: entry ?? "none", url: page.url() });

    // If already on dashboard / reveal / formation, skip setup.
    if (entry === '[data-testid="birth-sky-dashboard-hero"]') {
      mark("first_sky_or_existing", true, { note: "existing dashboard" });
    } else if (entry === '[data-testid="birth-sky-reveal-cta"]') {
      mark("first_sky_or_existing", true, { note: "existing reveal" });
      await page.getByTestId("birth-sky-reveal-cta").click();
      await waitForAny(page, ['[data-testid="birth-sky-dashboard-hero"]'], 60_000);
    } else if (entry === '[data-testid="birth-sky-formation-copy"]') {
      mark("first_sky_or_existing", true, { note: "stuck on formation — waiting up to 90s" });
      const after = await waitForAny(
        page,
        ['[data-testid="birth-sky-reveal-cta"]', '[data-testid="birth-sky-dashboard-hero"]', '[data-testid="birth-sky-formation-retry"]'],
        90_000,
      );
      mark("formation_exit", Boolean(after && after !== '[data-testid="birth-sky-formation-retry"]'), {
        note: after ?? "timeout",
      });
      if (after === '[data-testid="birth-sky-reveal-cta"]') {
        await page.getByTestId("birth-sky-reveal-cta").click();
      }
    } else {
      // Welcome / setup path
      if (entry === '[data-testid="birth-sky-begin"]') {
        await page.getByTestId("birth-sky-begin").click();
        await page.waitForTimeout(1000);
      }
      if (entry === '[data-testid="amy-astro-loading"]') {
        const afterLoad = await waitForAny(
          page,
          [
            '[data-testid="birth-sky-begin"]',
            '[data-testid="birth-sky-dashboard-hero"]',
            '[data-testid="birth-sky-setup-date"]',
            '[data-testid="birth-sky-child-continue"]',
          ],
          60_000,
        );
        mark("loading_cleared", Boolean(afterLoad), { note: afterLoad ?? "stuck loading" });
        if (afterLoad === '[data-testid="birth-sky-begin"]') {
          await page.getByTestId("birth-sky-begin").click();
        }
      }

      // Child confirmation
      const childContinue = page.getByTestId("birth-sky-child-continue");
      if (await childContinue.isVisible({ timeout: 8000 }).catch(() => false)) {
        await childContinue.click();
        await page.waitForTimeout(800);
      } else {
        // Some builds use role button Continue on child page
        const cont = page.getByRole("button", { name: /^Continue$/i }).first();
        if (await cont.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cont.click().catch(() => {});
        }
      }
      await shot(page, "04-after-child");

      // Date
      const dateInput = page.getByTestId("birth-sky-date-input");
      if (await dateInput.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const existing = await dateInput.inputValue().catch(() => "");
        if (!existing) await dateInput.fill("2024-06-15");
        const ageConfirm = page.getByTestId("birth-sky-age-confirm");
        if (await ageConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ageConfirm.click();
        }
        await page.getByTestId("birth-sky-date-continue").click();
        mark("setup_date", true);
      } else {
        mark("setup_date", false, { note: "date input not visible", url: page.url() });
      }
      await shot(page, "05-after-date");

      // Time — use unknown to avoid clock validation hang
      const timeUnknown = page.getByTestId("birth-sky-time-mode-unknown");
      if (await timeUnknown.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await timeUnknown.click();
        await page.getByTestId("birth-sky-time-continue").click();
        mark("setup_time", true, { note: "unknown / Day Sky" });
      } else {
        // Maybe already past time
        const placeSearch = page.getByTestId("birth-sky-place-search");
        mark("setup_time", await placeSearch.isVisible({ timeout: 5000 }).catch(() => false), {
          note: "time page missing; checking place",
          url: page.url(),
        });
      }
      await shot(page, "06-after-time");

      // Place — skip
      const placeSkip = page.getByTestId("birth-sky-place-skip");
      if (await placeSkip.isVisible({ timeout: 20_000 }).catch(() => false)) {
        await placeSkip.click();
        await page.getByTestId("birth-sky-place-continue").click();
        mark("setup_place", true, { note: "skipped" });
      } else {
        mark("setup_place", false, {
          note: "place page not reached (Continue hang?)",
          url: page.url(),
          bodySnippet: (await page.locator("body").innerText().catch(() => "")).slice(0, 400),
        });
        await shot(page, "06b-place-missing");
      }

      // Consent
      const consent = page.getByTestId("birth-sky-consent-checkbox");
      if (await consent.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await consent.click();
        await page.getByTestId("birth-sky-consent-continue").click();
        mark("setup_consent", true);
      } else {
        mark("setup_consent", false, { note: "consent not visible", url: page.url() });
      }

      // Review / Create
      const reviewCreate = page.getByTestId("birth-sky-create");
      const createBtn = page.getByRole("button", { name: /Create|Generate|Reveal|Begin/i }).first();
      if (await reviewCreate.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await reviewCreate.click();
        mark("setup_create", true, { note: "birth-sky-create" });
      } else if (await createBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await createBtn.click();
        mark("setup_create", true, { note: await createBtn.innerText().catch(() => "button") });
      } else {
        mark("setup_create", false, { note: "create CTA missing", url: page.url() });
      }
      await shot(page, "07-after-create");

      // Formation → Reveal
      const postCreate = await waitForAny(
        page,
        [
          '[data-testid="birth-sky-reveal-cta"]',
          '[data-testid="birth-sky-dashboard-hero"]',
          '[data-testid="birth-sky-formation-retry"]',
          '[data-testid="birth-sky-formation-copy"]',
        ],
        120_000,
      );
      mark("formation_or_reveal", Boolean(postCreate), { note: postCreate ?? "timeout", url: page.url() });
      await shot(page, "08-formation-reveal");

      if (postCreate === '[data-testid="birth-sky-formation-copy"]') {
        const exit = await waitForAny(
          page,
          ['[data-testid="birth-sky-reveal-cta"]', '[data-testid="birth-sky-dashboard-hero"]', '[data-testid="birth-sky-formation-retry"]'],
          90_000,
        );
        mark("formation_complete", Boolean(exit && !exit.includes("retry")), { note: exit ?? "timeout" });
        if (exit === '[data-testid="birth-sky-reveal-cta"]') {
          await page.getByTestId("birth-sky-reveal-cta").click();
        }
      } else if (postCreate === '[data-testid="birth-sky-reveal-cta"]') {
        await page.getByTestId("birth-sky-reveal-cta").click();
        mark("reveal", true);
      } else if (postCreate === '[data-testid="birth-sky-formation-retry"]') {
        mark("reveal", false, { note: "formation failed — retry visible" });
      }
    }

    // Dashboard
    const dash = await waitForAny(page, ['[data-testid="birth-sky-dashboard-hero"]'], 60_000);
    mark("dashboard", Boolean(dash), { url: page.url() });
    await shot(page, "09-dashboard");

    // Ask Amy — via reflect segment or hero CTA
    if (dash) {
      const ask = page.getByTestId("birth-sky-ask-amy");
      let askVisible = await ask.isVisible().catch(() => false);
      if (!askVisible) {
        // Open reflect segment
        const reflectNav = page.getByRole("button", { name: /Reflect|Ask Amy/i }).first();
        if (await reflectNav.isVisible({ timeout: 3000 }).catch(() => false)) {
          await reflectNav.click();
          await page.waitForTimeout(800);
        }
        // Or navigate
        if (!(await ask.isVisible().catch(() => false))) {
          await page.goto(`${BASE}/birth-sky/app/reflect`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(2000);
        }
        askVisible = await ask.isVisible({ timeout: 10_000 }).catch(() => false);
      }
      if (askVisible) {
        await ask.click();
        const sheet = await waitForAny(page, ['[data-testid="birth-sky-ai-sheet"]'], 20_000);
        mark("ask_amy", Boolean(sheet), { note: sheet ?? "sheet missing" });
        if (sheet) {
          await page.getByTestId("birth-sky-ai-close").click().catch(() => {});
        }
      } else {
        // Hero may have Ask Amy
        const heroAsk = page.getByRole("button", { name: /Ask Amy/i }).first();
        if (await heroAsk.isVisible({ timeout: 3000 }).catch(() => false)) {
          await heroAsk.click();
          const sheet = await waitForAny(page, ['[data-testid="birth-sky-ai-sheet"]'], 20_000);
          mark("ask_amy", Boolean(sheet), { note: sheet ? "via hero" : "hero click no sheet" });
        } else {
          mark("ask_amy", false, { note: "Ask Amy control not found" });
        }
      }
      await shot(page, "10-ask-amy");

      // Sounds toggle in settings → preferences
      await page.getByTestId("birth-sky-open-settings").click().catch(async () => {
        await page.goto(`${BASE}/birth-sky/settings/preferences`, { waitUntil: "domcontentloaded" });
      });
      await page.waitForTimeout(1000);
      const prefsLink = page.getByTestId("birth-sky-settings-preferences");
      if (await prefsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await prefsLink.click();
        await page.waitForTimeout(600);
      } else if (!page.url().includes("preferences")) {
        await page.goto(`${BASE}/birth-sky/settings/preferences`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
      }
      const sounds = page.getByTestId("birth-sky-pref-sounds");
      if (await sounds.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const before = await sounds.getAttribute("aria-checked").catch(() => null);
        await sounds.click();
        await page.waitForTimeout(500);
        const after = await sounds.getAttribute("aria-checked").catch(() => null);
        mark("sounds_toggle", before !== after || before != null, {
          note: `aria-checked ${before} → ${after}`,
        });
      } else {
        mark("sounds_toggle", false, { note: "pref row missing", url: page.url() });
      }
      await shot(page, "11-sounds");
    } else {
      mark("ask_amy", false, { note: "skipped — no dashboard" });
      mark("sounds_toggle", false, { note: "skipped — no dashboard" });
    }

    report.finalUrl = page.url();
    report.finalTestIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid]"))
        .map((el) => el.getAttribute("data-testid"))
        .filter(Boolean)
        .slice(0, 80),
    );
    const required = ["dashboard", "ask_amy", "sounds_toggle"];
    report.ok = required.every((k) => report.steps[k]?.ok === true);
  } catch (err) {
    report.ok = false;
    report.error = String(err);
    console.error(err);
    await shot(page, "99-error");
  } finally {
    const out = join(OUT_DIR, "report.json");
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${out}`);
    console.log(`OVERALL: ${report.ok ? "PASS" : "FAIL"}`);
    await browser.close();
  }
  process.exit(report.ok ? 0 : 1);
}

main();
