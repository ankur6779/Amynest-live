#!/usr/bin/env node
/** Verify hub premium cards at phone, fold, tablet, and landscape viewports. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../screenshots/hub-responsive-qa");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";

const GROUPS = ["today", "learning", "creativity", "stories", "health", "parent", "support"];

/** Required breakpoints + fold/tablet coverage. */
const VIEWPORTS = [
  { id: "320px", width: 320, height: 568, label: "320px phone" },
  { id: "360px", width: 360, height: 640, label: "360px phone" },
  { id: "375px", width: 375, height: 812, label: "375px phone" },
  { id: "390px", width: 390, height: 844, label: "390px phone" },
  { id: "412px", width: 412, height: 915, label: "412px phone" },
  { id: "430px", width: 430, height: 932, label: "430px phone" },
  { id: "768px", width: 768, height: 1024, label: "768px tablet" },
  { id: "1024px", width: 1024, height: 900, label: "1024px desktop" },
  { id: "fold-cover-narrow", width: 280, height: 653, label: "Fold cover (narrow)" },
  { id: "fold-inner-portrait", width: 884, height: 1104, label: "Fold inner portrait" },
  { id: "phone-landscape", width: 844, height: 390, label: "Phone landscape" },
];

const MOCK_CHILD = { id: 1, name: "Aarav", age: 5, ageMonths: 60 };

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
    await page.waitForTimeout(400);
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

async function dismissOverlays(page) {
  await dismissCountryPromptIfVisible(page);
  for (const label of [/Skip tour/i, /Skip/i, /Got it/i, /Close tour/i, /Maybe later/i]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(400);
    }
  }
  await page.evaluate(() => {
    document.querySelector('[role="dialog"][aria-label="App tour"]')?.remove();
  });
}

async function expandAllGroups(page) {
  for (const key of GROUPS) {
    const header = page.locator(`#hub-group-${key} button`).first();
    const expanded = await header.getAttribute("aria-expanded");
    if (expanded === "false") {
      await header.click({ force: true });
      await page.waitForTimeout(250);
    }
  }
}

async function auditCards(page, viewport) {
  return page.evaluate(({ viewportWidth }) => {
    const issues = [];
    const cards = [...document.querySelectorAll(".lz-premium-card")];
    const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    if (docOverflow) {
      issues.push({
        type: "horizontal-scroll",
        detail: `document scrollWidth ${document.documentElement.scrollWidth} > clientWidth ${document.documentElement.clientWidth}`,
      });
    }

    const forbidden = document.querySelectorAll(".hub-open-cta, .hub-expand-chevron, .hub-child-chevron-abs");
    if (forbidden.length > 0) {
      issues.push({ type: "forbidden-floating-controls", count: forbidden.length });
    }

    const minCardWidth = viewportWidth <= 320 ? 252 : 260;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.width < minCardWidth) {
        issues.push({ type: "card-too-narrow", index, width: rect.width, minCardWidth });
      }
      if (card.scrollWidth > card.clientWidth + 4) {
        issues.push({ type: "card-overflow", index, scrollWidth: card.scrollWidth, clientWidth: card.clientWidth });
      }

      const title = card.querySelector(".hub-feature-tile__title, .hub-child-title");
      if (title) {
        const titleRect = title.getBoundingClientRect();
        if (titleRect.width < 48) {
          issues.push({ type: "title-too-narrow", index, width: titleRect.width, text: title.textContent?.slice(0, 40) });
        }
        if (titleRect.top < rect.top - 1 || titleRect.bottom > rect.bottom + 1) {
          issues.push({ type: "title-outside-card", index, text: title.textContent?.slice(0, 40) });
        }
        const text = title.textContent ?? "";
        const words = text.trim().split(/\s+/);
        if (words.length === 1 && text.length > 3 && titleRect.height > titleRect.width * 1.2) {
          issues.push({ type: "vertical-letter-collapse", index, text });
        }
      }

      const hero = card.querySelector(".hub-feature-tile__hero, .hub-child-hero");
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        const media = hero.closest(".hub-feature-tile__media");
        const mediaRect = media?.getBoundingClientRect();
        if (heroRect.right > rect.right + 2 || heroRect.bottom > rect.bottom + 2) {
          issues.push({ type: "hero-clipped", index });
        }
        if (mediaRect && (heroRect.width > mediaRect.width + 2 || heroRect.height > mediaRect.height + 2)) {
          issues.push({ type: "hero-overflow-media", index });
        }
        if (title) {
          const titleRect = title.getBoundingClientRect();
          const overlap = !(
            titleRect.right <= heroRect.left + 2 ||
            titleRect.left >= heroRect.right - 2 ||
            titleRect.bottom <= heroRect.top + 2 ||
            titleRect.top >= heroRect.bottom - 2
          );
          if (overlap) {
            issues.push({ type: "title-hero-overlap", index, text: title.textContent?.slice(0, 40) });
          }
        }
      }

      const desc = card.querySelector(".hub-feature-tile__desc, .hub-child-subtitle");
      if (desc && hero) {
        const descRect = desc.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();
        const overlap = !(
          descRect.right <= heroRect.left + 2 ||
          descRect.left >= heroRect.right - 2 ||
          descRect.bottom <= heroRect.top + 2 ||
          descRect.top >= heroRect.bottom - 2
        );
        if (overlap) {
          issues.push({ type: "desc-hero-overlap", index });
        }
      }
    });

    const learningGroup = document.querySelector("#hub-group-learning");
    if (learningGroup) {
      const panelWidth = learningGroup.getBoundingClientRect().width;
      const minFor2Col = 272 * 2 + 12;
      if (panelWidth >= minFor2Col) {
        const grid = learningGroup.querySelector(".hub-group-card-grid");
        if (grid) {
          const style = getComputedStyle(grid);
          const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length;
          if (cols < 2) {
            issues.push({
              type: "learning-grid-not-2col",
              detail: `panel ${Math.round(panelWidth)}px expected ≥2 columns, got ${cols}`,
            });
          }
        }
      }
    }

    return { cardCount: cards.length, issues };
  }, { viewportWidth: viewport.width });
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const report = { viewports: {}, passed: true };

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768 || viewport.height < 500,
      locale: "en-US",
      colorScheme: "dark",
    });
    await installHubMocks(context);
    const page = await context.newPage();

    await signIn(page);
    await dismissCountryPromptIfVisible(page);
    await page.goto(`${BASE_URL}/parenting-hub`, { waitUntil: "networkidle", timeout: 90_000 });
    await dismissOverlays(page);
    await page.waitForSelector('[data-testid="hub-quick-actions"]', { timeout: 45_000 });
    await expandAllGroups(page);
    await page.waitForTimeout(800);

    const audit = await auditCards(page, viewport);
    report.viewports[viewport.id] = { ...audit, ...viewport };

    const shotPath = path.join(OUT_DIR, `hub-all-sections-${viewport.id}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });

    if (audit.issues.length > 0) {
      report.passed = false;
      console.error(`✗ ${viewport.label} (${viewport.width}×${viewport.height}) — ${audit.issues.length} issue(s), ${audit.cardCount} cards`);
      for (const issue of audit.issues.slice(0, 8)) {
        console.error("  ", JSON.stringify(issue));
      }
    } else {
      console.log(`✓ ${viewport.label} (${viewport.width}×${viewport.height}) — ${audit.cardCount} cards OK → ${shotPath}`);
    }

    await context.close();
  }
} catch (err) {
  report.passed = false;
  report.error = err.message;
  console.error("Verification failed:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  const reportPath = path.join(OUT_DIR, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
}
