/**
 * Amy Health Lab — Full release regression (immersive lifecycle + layout smoke).
 * Run: pnpm --filter @workspace/kidschedule test:e2e:health-lab -- health-lab-certification-regression
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../../audit/health-lab-release-regression");
const SCREEN_DIR = path.join(OUT_DIR, "screenshots");

const WIDTHS = [320, 360, 390, 412, 480, 600, 768] as const;

type Check = {
  id: string;
  category: string;
  name: string;
  pass: boolean;
  detail?: string;
  screenshot?: string;
};

const results: Check[] = [];

function record(check: Check) {
  results.push(check);
  if (!check.pass) {
    console.error(`[FAIL] ${check.category}/${check.id}: ${check.detail ?? check.name}`);
  }
}

function mockHealthLabApi(page: Page) {
  let serverProfile: Record<string, unknown> | null = null;
  return page.route("**/api/health-lab/**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() === "GET" && url.includes("/profile/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/dashboard/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, dashboard: { sessions: 0, streakDays: 0, level: 1, totalXp: 0 } }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/history/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, history: serverProfile?.gameHistory ?? [] }),
      });
      return;
    }
    if (req.method() === "POST") {
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      if (body.profile) serverProfile = body.profile as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    await route.continue();
  });
}

async function gotoLab(page: Page) {
  await page.goto("/playwright-health-lab.html?childId=42&childName=Riya");
  await page.waitForSelector("text=Amy Health Lab", { timeout: 30_000 });
  await page.waitForSelector('[class*="health-lab-world-card"], button:has-text("Balloon")', {
    timeout: 30_000,
  });
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(SCREEN_DIR, file), fullPage: false });
  return file;
}

async function launchBalloonGameplay(page: Page) {
  await page.getByRole("button", { name: /Balloon Journey Adventure/i }).click();
  await page.getByRole("button", { name: /Start Journey/i }).click();
  await expect(page.getByLabel("Hold to inflate balloon")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(450);
}

async function readImmersiveState(page: Page) {
  return page.evaluate(() => ({
    hostCount: document.querySelectorAll("[data-health-lab-immersive-host]").length,
    immersiveClass: document.documentElement.classList.contains("health-lab-immersive"),
    bodyOverflow: document.body.style.overflow,
    hostTop: document.querySelector("[data-health-lab-immersive-host]")?.getBoundingClientRect().top ?? null,
    hostZ: document.querySelector("[data-health-lab-immersive-host]")
      ? getComputedStyle(document.querySelector("[data-health-lab-immersive-host]")!).zIndex
      : null,
    topBarTop: document.querySelector(".health-lab-topbar-glass")?.getBoundingClientRect().top ?? null,
    hudBottom: document.querySelector(".health-lab-game-region-hud")?.getBoundingClientRect().bottom ?? null,
    innerHeight: window.innerHeight,
  }));
}

async function invokeAppBack(page: Page) {
  return page.evaluate(async () => {
    const { invokePageBackHandler } = await import("../../src/lib/page-back-handler.ts");
    return invokePageBackHandler();
  });
}

async function probeLayout(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(0, 0);
    const fails: string[] = [];
    const vh = document.documentElement.clientHeight;
    const vw = document.documentElement.clientWidth;
    const host = document.querySelector("[data-health-lab-immersive-host]");
    if (host) {
      const r = host.getBoundingClientRect();
      if (r.top < -2) fails.push(`host_top=${Math.round(r.top)}`);
      if (r.width > vw + 4) fails.push(`host_width=${Math.round(r.width)}`);
      if (r.height > vh + 4) fails.push(`host_height=${Math.round(r.height)}`);
      const topBar = document.querySelector(".health-lab-topbar-glass");
      if (topBar) {
        const tb = topBar.getBoundingClientRect();
        if (tb.top < r.top - 2) fails.push(`topbar_above_host top=${Math.round(tb.top)} hostTop=${Math.round(r.top)}`);
        if (tb.top < 0) fails.push(`topbar_clipped top=${Math.round(tb.top)}`);
      }
      const hud = document.querySelector(".health-lab-game-region-hud");
      if (hud) {
        const hb = hud.getBoundingClientRect();
        if (hb.bottom > vh + 4) {
          fails.push(`hud_past_viewport bottom=${Math.round(hb.bottom)} vh=${vh}`);
        }
      }
    }
    return fails;
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
});

test.afterAll(() => {
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  const verdict = failCount === 0 ? "PASS" : "FAIL";
  const blockers = results.filter((r) => !r.pass);

  const report = {
    generatedAt: new Date().toISOString(),
    verdict,
    passCount,
    failCount,
    checks: results,
    blockers,
    screenshotDir: SCREEN_DIR,
    suites: [
      "health-lab-certification-regression (this file)",
      "Run separately: health-lab-certification.spec.ts",
      "Run separately: health-lab-certification-responsive.spec.ts",
      "Run separately: vitest health-lab.test.ts",
    ],
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  const md = [
    "# Amy Health Lab — Release Regression Report",
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Verdict:** **${verdict}**`,
    "",
    `Checks: **${passCount} passed**, **${failCount} failed**`,
    "",
    "## Categories",
    "",
    ...["immersive", "navigation", "orientation", "back", "lifecycle", "scroll", "safe_area", "responsive"].map(
      (cat) => {
        const catChecks = results.filter((r) => r.category === cat);
        const catFail = catChecks.filter((r) => !r.pass).length;
        return `- **${cat}**: ${catChecks.length - catFail}/${catChecks.length} pass`;
      },
    ),
    "",
    "## Blockers",
    "",
    blockers.length === 0
      ? "_None._"
      : blockers.map((b) => `- **${b.id}** (${b.category}): ${b.detail ?? b.name}`).join("\n"),
    "",
    "## Screenshots",
    "",
    `Directory: \`${SCREEN_DIR}\``,
    "",
    ...results
      .filter((r) => r.screenshot)
      .map((r) => `- \`${r.screenshot}\` — ${r.name}`),
    "",
    "## Full checklist",
    "",
    ...results.map((r) => `- [${r.pass ? "x" : " "}] **${r.id}** — ${r.name}${r.detail ? `: ${r.detail}` : ""}`),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "RELEASE-REGRESSION.md"), md);
});

test("immersive mode entry activates host above chrome", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await launchBalloonGameplay(page);
  const state = await readImmersiveState(page);
  const layoutFails = await probeLayout(page);
  const ss = await shot(page, "01-immersive-entry-balloon");

  record({
    id: "immersive-host-mounted",
    category: "immersive",
    name: "Immersive host portaled to body",
    pass: state.hostCount === 1,
    detail: `hostCount=${state.hostCount}`,
    screenshot: ss,
  });
  record({
    id: "immersive-root-class",
    category: "immersive",
    name: "html.health-lab-immersive class applied",
    pass: state.immersiveClass,
  });
  record({
    id: "immersive-body-scroll-lock",
    category: "scroll",
    name: "Body overflow hidden during immersive",
    pass: state.bodyOverflow === "hidden",
    detail: `overflow=${state.bodyOverflow}`,
  });
  record({
    id: "immersive-z-index",
    category: "immersive",
    name: "Host z-index above app chrome (≥100)",
    pass: state.hostZ !== null && Number(state.hostZ) >= 100,
    detail: `zIndex=${state.hostZ}`,
  });
  record({
    id: "immersive-no-top-clip",
    category: "immersive",
    name: "Game host and top bar not clipped at top",
    pass: layoutFails.length === 0,
    detail: layoutFails.join("; ") || undefined,
  });
});

test("immersive mode exit restores DOM and scroll", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.evaluate(() => {
    document.body.style.overflow = "scroll";
  });

  await launchBalloonGameplay(page);
  await page.getByRole("button", { name: /^Exit$/i }).first().click();
  await page.waitForSelector("text=Today's Adventures", { timeout: 10_000 });

  const state = await readImmersiveState(page);
  const ss = await shot(page, "02-immersive-exit-home");

  record({
    id: "immersive-host-removed",
    category: "immersive",
    name: "Immersive host removed after exit",
    pass: state.hostCount === 0,
    detail: `hostCount=${state.hostCount}`,
    screenshot: ss,
  });
  record({
    id: "immersive-class-removed",
    category: "immersive",
    name: "html.health-lab-immersive class removed",
    pass: !state.immersiveClass,
  });
  record({
    id: "scroll-restored",
    category: "scroll",
    name: "Body overflow restored after exit",
    pass: state.bodyOverflow === "scroll",
    detail: `overflow=${state.bodyOverflow}`,
  });
});

test("navigation: home → progress → home", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);

  const grownUps = page.getByRole("button", { name: /For grown-ups/i });
  if ((await grownUps.getAttribute("aria-expanded")) !== "true") await grownUps.click();
  await page.getByRole("button", { name: /^Progress$/ }).click();
  await expect(page.getByText("Your Progress")).toBeVisible();
  await page.getByRole("button", { name: /Go back|Back/i }).first().click();
  await expect(page.getByText("Today's Adventures")).toBeVisible();

  record({
    id: "nav-progress-roundtrip",
    category: "navigation",
    name: "Progress screen round-trip",
    pass: true,
    screenshot: await shot(page, "03-nav-progress-home"),
  });
});

test("browser / Android back handler exits game then prep", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);

  await page.getByRole("button", { name: /Balloon Journey Adventure/i }).click();
  await expect(page.getByText("Mission Briefing")).toBeVisible();

  const fromOnboarding = await invokeAppBack(page);
  await expect(page.getByText("Today's Adventures")).toBeVisible({ timeout: 10_000 });

  await launchBalloonGameplay(page);
  const fromGame = await invokeAppBack(page);
  await expect(page.getByText("Today's Adventures")).toBeVisible({ timeout: 10_000 });

  record({
    id: "back-from-onboarding",
    category: "back",
    name: "App back handler exits onboarding to home",
    pass: fromOnboarding === true,
  });
  record({
    id: "back-from-gameplay",
    category: "back",
    name: "App back handler exits gameplay to home (Android back proxy)",
    pass: fromGame === true,
    screenshot: await shot(page, "04-back-from-game-home"),
  });
});

test("motion prep cancel via back restores home without host leak", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);

  await page.getByRole("button", { name: /Sky Island Survival/i }).click();
  await expect(page.getByRole("button", { name: /I'm Ready!/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.waitForSelector("text=Today's Adventures", { timeout: 10_000 });

  const state = await readImmersiveState(page);
  record({
    id: "motion-prep-cancel-cleanup",
    category: "immersive",
    name: "Motion prep cancel removes immersive host",
    pass: state.hostCount === 0 && !state.immersiveClass,
    detail: `hosts=${state.hostCount} class=${state.immersiveClass}`,
    screenshot: await shot(page, "05-motion-prep-cancel"),
  });
});

test("orientation change during gameplay keeps layout valid", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await launchBalloonGameplay(page);
  await shot(page, "06-orientation-portrait-balloon");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(350);
  const layoutFails = await probeLayout(page);
  const ss = await shot(page, "07-orientation-landscape-balloon");

  record({
    id: "orientation-landscape-layout",
    category: "orientation",
    name: "Landscape gameplay passes layout probes",
    pass: layoutFails.length === 0,
    detail: layoutFails.join("; ") || undefined,
    screenshot: ss,
  });
});

test("background / resume preserves immersive host", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);
  await launchBalloonGameplay(page);

  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);

  const state = await readImmersiveState(page);
  const stillPlayable = await page.getByLabel("Hold to inflate balloon").isVisible();

  record({
    id: "visibility-resume-host",
    category: "lifecycle",
    name: "visibilitychange keeps immersive host mounted",
    pass: state.hostCount === 1 && state.immersiveClass,
  });
  record({
    id: "visibility-resume-controls",
    category: "lifecycle",
    name: "Gameplay controls visible after resume",
    pass: stillPlayable,
    screenshot: await shot(page, "08-background-resume"),
  });
});

test("memory cleanup after repeated enter/exit cycles", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);

  for (let i = 0; i < 5; i++) {
    await launchBalloonGameplay(page);
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await page.waitForSelector("text=Today's Adventures", { timeout: 10_000 });
  }

  const state = await readImmersiveState(page);
  record({
    id: "memory-no-host-leak",
    category: "lifecycle",
    name: "No immersive host leak after 5 cycles",
    pass: state.hostCount === 0 && !state.immersiveClass,
    detail: `hosts=${state.hostCount}`,
    screenshot: await shot(page, "09-memory-cleanup"),
  });
});

test("safe-area host padding and HUD within viewport", async ({ page }) => {
  await mockHealthLabApi(page);
  await gotoLab(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
  });

  await launchBalloonGameplay(page);
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const host = document.querySelector("[data-health-lab-immersive-host]") as HTMLElement | null;
    if (!host) return { ok: false, reason: "no host" };
    const style = getComputedStyle(host);
    const padTop = parseFloat(style.paddingTop) || 0;
    const topBar = document.querySelector(".health-lab-topbar-glass");
    const tbTop = topBar?.getBoundingClientRect().top ?? 0;
    const hud = document.querySelector(".health-lab-game-region-hud");
    const hudBottom = hud?.getBoundingClientRect().bottom ?? 0;
    return {
      ok: padTop >= 40 && tbTop >= 40 && hudBottom <= window.innerHeight + 2,
      padTop,
      tbTop,
      hudBottom,
      innerHeight: window.innerHeight,
    };
  });

  const ss = await shot(page, "10-safe-area-notch");

  record({
    id: "safe-area-top-padding",
    category: "safe_area",
    name: "Host respects safe-area-inset-top (notch proxy 47px)",
    pass: metrics.ok === true,
    detail:
      typeof metrics === "object" && "padTop" in metrics
        ? `padTop=${metrics.padTop} topBar=${metrics.tbTop} hudBottom=${metrics.hudBottom}`
        : String((metrics as { reason?: string }).reason),
    screenshot: ss,
  });

  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
});

test("responsive immersive layout smoke at all breakpoints", async ({ page }) => {
  await mockHealthLabApi(page);
  const fails: string[] = [];

  for (const width of WIDTHS) {
    const height = Math.max(640, Math.round(width * 1.85));
    await gotoLab(page);
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await launchBalloonGameplay(page);
    const layoutFails = await probeLayout(page);
    if (layoutFails.length > 0) {
      fails.push(`${width}dp: ${layoutFails.join(",")}`);
    }
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await page.waitForSelector("text=Today's Adventures", { timeout: 10_000 }).catch(() => undefined);
  }

  if (fails.length === 0) {
    await gotoLab(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await launchBalloonGameplay(page);
    await shot(page, "11-responsive-smoke-390");
  }

  record({
    id: "responsive-breakpoints",
    category: "responsive",
    name: "Balloon gameplay layout valid at 320–768dp",
    pass: fails.length === 0,
    detail: fails.slice(0, 5).join(" | ") || undefined,
  });
});

test("final regression gate", async () => {
  const failed = results.filter((r) => !r.pass);
  expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
});
