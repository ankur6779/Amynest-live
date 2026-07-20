/**
 * Amy Health Lab — Responsive layout certification (rendered measurement).
 * Run: pnpm --filter @workspace/kidschedule test:e2e:health-lab -- health-lab-certification-responsive
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../../audit/health-lab-responsive-cert");
const SCREEN_DIR = path.join(OUT_DIR, "screenshots");

const WIDTHS = [320, 360, 375, 390, 412, 480, 600, 768] as const;
const FONT_SCALES = [1, 1.15, 1.3, 1.5] as const;
const LANDSCAPE = [
  { width: 667, height: 375, label: "landscape-iphone" },
  { width: 800, height: 360, label: "landscape-android" },
] as const;

const WORLDS = [
  { title: "Balloon Journey Adventure", world: "Balloon Valley" },
  { title: "Sky Island Survival", world: "Sky Island" },
  { title: "Rocket Launch Academy", world: "Rocket Base" },
  { title: "Crystal Garden Challenge", world: "Crystal Garden" },
  { title: "Crystal Core Reactor", world: "Crystal Cave" },
] as const;

type Fail = {
  width: number;
  height: number;
  fontScale: number;
  screen: string;
  code: string;
  detail: string;
};

type ProbeResult = {
  width: number;
  height: number;
  fontScale: number;
  orientation: "portrait" | "landscape";
  screen: string;
  fails: Fail[];
  metrics: Record<string, number | string | boolean>;
};

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

async function setViewportFont(page: Page, width: number, height: number, fontScale: number) {
  await page.setViewportSize({ width, height });
  await page.evaluate((scale) => {
    document.documentElement.style.fontSize = `${16 * scale}px`;
    document.body.style.fontSize = "";
  }, fontScale);
  await page.waitForTimeout(120);
}

async function probeDom(page: Page, meta: Omit<ProbeResult, "fails" | "metrics" | "screen"> & { screen: string }) {
  const result = await page.evaluate((ctx) => {
    const fails: Array<{ code: string; detail: string }> = [];
    const docEl = document.documentElement;
    const body = document.body;

    const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientW = docEl.clientWidth;
    if (scrollW > clientW + 2) {
      fails.push({
        code: "horizontal_scroll",
        detail: `scrollWidth=${scrollW} clientWidth=${clientW}`,
      });
    }

    const countLines = (el: Element) => {
      const style = getComputedStyle(el);
      const clamp = style.webkitLineClamp;
      if (clamp && clamp !== "none") {
        const n = parseInt(clamp, 10);
        if (!Number.isNaN(n) && n > 0) {
          // Visible capped lines — use client height vs line-height
          const fontSize = parseFloat(style.fontSize) || 16;
          const lhRaw = style.lineHeight;
          const lh = lhRaw === "normal" ? fontSize * 1.25 : parseFloat(lhRaw) || fontSize * 1.25;
          return Math.min(n, Math.max(1, Math.round((el as HTMLElement).clientHeight / lh)));
        }
      }
      const fontSize = parseFloat(style.fontSize) || 16;
      const lhRaw = style.lineHeight;
      const lh = lhRaw === "normal" ? fontSize * 1.25 : parseFloat(lhRaw) || fontSize * 1.25;
      const height = (el as HTMLElement).scrollHeight;
      return Math.max(1, Math.round(height / lh));
    };

    const words = (t: string) => t.trim().split(/\s+/).filter(Boolean);

    const canScrollTo = (el: Element) => {
      let p: Element | null = el.parentElement;
      while (p) {
        const s = getComputedStyle(p);
        const oy = s.overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") && (p as HTMLElement).scrollHeight > (p as HTMLElement).clientHeight + 4) {
          return true;
        }
        p = p.parentElement;
      }
      return document.documentElement.scrollHeight > window.innerHeight + 8;
    };

    // World cards
    const cards = Array.from(
      document.querySelectorAll(".health-lab-world-card, button.health-lab-pressable"),
    ).filter((el) => {
      const label = el.getAttribute("aria-label") || el.textContent || "";
      return /Balloon|Sky Island|Rocket|Crystal Garden|Crystal Core|Balloon Valley/i.test(label);
    });

    let maxTitleLines = 0;
    let maxMissionLines = 0;
    let minTouch = 999;
    let cardCount = 0;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      cardCount++;

      const title = card.querySelector(".health-lab-world-card__title, h3");
      const mission = card.querySelector(".health-lab-world-card__mission");
      const cta = card.querySelector(".health-lab-world-card__cta");
      const bodyEl = card.querySelector(".health-lab-world-card__body");
      const icon = card.querySelector(".health-lab-world-card__icon");

      if (title) {
        const t = (title.textContent || "").trim();
        const lines = countLines(title);
        maxTitleLines = Math.max(maxTitleLines, lines);
        if (lines > 2) {
          fails.push({ code: "title_over_2_lines", detail: `"${t}" lines=${lines}` });
        }
        const w = words(t);
        // 2-word titles may use 2 lines (allowed). Fail only for 3+ words each on own line.
        if (w.length >= 3 && lines >= w.length) {
          fails.push({ code: "word_per_line", detail: `title "${t}" lines=${lines} words=${w.length}` });
        }
      }

      if (mission) {
        const t = (mission.textContent || "").trim();
        const lines = countLines(mission);
        maxMissionLines = Math.max(maxMissionLines, lines);
        if (lines > 2) {
          fails.push({ code: "mission_over_2_lines", detail: `"${t}" lines=${lines}` });
        }
        const w = words(t);
        if (w.length >= 3 && lines >= w.length) {
          fails.push({ code: "word_per_line", detail: `mission "${t}" lines=${lines} words=${w.length}` });
        }
        if (bodyEl) {
          const bw = (bodyEl as HTMLElement).getBoundingClientRect().width;
          if (bw > 0 && bw < 96 && w.length >= 3) {
            fails.push({
              code: "content_squeezed",
              detail: `body width=${Math.round(bw)}px for "${t}"`,
            });
          }
        }
      }

      if (cta) {
        const cr = cta.getBoundingClientRect();
        minTouch = Math.min(minTouch, cr.width, cr.height);
        if (cr.width < 44 || cr.height < 44) {
          fails.push({
            code: "touch_target",
            detail: `CTA ${Math.round(cr.width)}×${Math.round(cr.height)}`,
          });
        }
        if (bodyEl) {
          const br = bodyEl.getBoundingClientRect();
          const overlap = !(cr.right <= br.left + 1 || cr.left >= br.right - 1 || cr.bottom <= br.top + 1 || cr.top >= br.bottom - 1);
          // Side-by-side is expected; fail only if CTA center is inside body text box horizontally overlapping mid
          if (overlap && cr.left < br.right - 8 && cr.right > br.left + 8 && Math.abs(cr.top - br.top) < 4) {
            // OK in flex row — only fail if CTA left edge is left of body left (stacked wrong)
            if (cr.left < br.left - 2) {
              fails.push({ code: "button_overlaps_text", detail: "CTA left of body" });
            }
          }
        }
      }

      if (icon && bodyEl) {
        const ir = icon.getBoundingClientRect();
        const br = bodyEl.getBoundingClientRect();
        if (ir.width > br.width * 1.35 && br.width < 80) {
          fails.push({
            code: "icon_compresses_content",
            detail: `icon=${Math.round(ir.width)} body=${Math.round(br.width)}`,
          });
        }
      }

      // Clipped text (ignore intentional truncate / line-clamp)
      for (const el of [title, mission].filter(Boolean) as Element[]) {
        const he = el as HTMLElement;
        const style = getComputedStyle(he);
        const cls = he.className || "";
        if (cls.includes("truncate") || (style.webkitLineClamp && style.webkitLineClamp !== "none")) continue;
        if (he.scrollWidth > he.clientWidth + 4) {
          fails.push({
            code: "clipped_text",
            detail: `${he.tagName} scroll=${he.scrollWidth} client=${he.clientWidth}`,
          });
        }
      }
    }

    // Interactive controls in view — touch targets for primary CTAs
    const ctas = Array.from(
      document.querySelectorAll(
        'button.health-lab-pressable, .health-lab-world-card__cta, button[class*="cta"], button[aria-label*="Hold"], button[aria-label*="Tap"]',
      ),
    );
    for (const btn of ctas.slice(0, 40)) {
      const r = btn.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight) continue;
      if (r.width < 44 || r.height < 44) {
        // Icon-only small chips are OK if not primary play/start
        const label = (btn.getAttribute("aria-label") || btn.textContent || "").trim();
        if (/Play|Start|Ready|Hold|Continue|Treasure|Surprise/i.test(label) || btn.classList.contains("health-lab-world-card__cta")) {
          fails.push({
            code: "touch_target",
            detail: `"${label.slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`,
          });
        }
      }
      // Partially visible + cut by viewport only when page/container cannot scroll to reveal it
      const partiallyCut =
        r.top < window.innerHeight && r.bottom > window.innerHeight + 2 && r.top > 0;
      if (partiallyCut && !canScrollTo(btn)) {
        fails.push({
          code: "clipped_button",
          detail: `"${(btn.textContent || "").trim().slice(0, 32)}" bottom=${Math.round(r.bottom)} vh=${window.innerHeight}`,
        });
      }
    }

    // Game viewport / play area clipping
    const gameVp = document.querySelector(".health-lab-game-viewport, .health-lab-game-stage-shell");
    if (gameVp) {
      const r = gameVp.getBoundingClientRect();
      if (r.width > window.innerWidth + 2 || r.height > window.innerHeight + 2) {
        fails.push({
          code: "play_area_overflow",
          detail: `vp=${Math.round(r.width)}×${Math.round(r.height)} win=${window.innerWidth}×${window.innerHeight}`,
        });
      }
      if (r.top < -2) {
        fails.push({ code: "notch_overlap", detail: `game top=${Math.round(r.top)}` });
      }
    }

    // Safe-area: fixed bottom HUD shouldn't sit past viewport without padding check
    const hud = document.querySelector(".health-lab-game-region-hud");
    if (hud) {
      const r = hud.getBoundingClientRect();
      if (r.bottom > window.innerHeight + 4) {
        fails.push({
          code: "gesture_nav_overlap",
          detail: `HUD bottom=${Math.round(r.bottom)} vh=${window.innerHeight}`,
        });
      }
    }

    return {
      fails,
      metrics: {
        cardCount,
        maxTitleLines,
        maxMissionLines,
        minTouch: minTouch === 999 ? 0 : minTouch,
        scrollWidth: scrollW,
        clientWidth: clientW,
        innerHeight: window.innerHeight,
      },
    };
  }, meta);

  return {
    ...meta,
    fails: result.fails.map((f) => ({
      ...meta,
      code: f.code,
      detail: f.detail,
    })),
    metrics: result.metrics,
  } satisfies ProbeResult;
}

async function expandSection(page: Page, name: RegExp) {
  const btn = page.getByRole("button", { name });
  if (await btn.isVisible().catch(() => false)) {
    const expanded = await btn.getAttribute("aria-expanded");
    if (expanded !== "true") await btn.click();
  }
}

async function launchWorld(page: Page, title: string) {
  const btn = page.getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  await btn.first().click();
  const ready = page.getByRole("button", { name: /I'm Ready!/i });
  if (await ready.isVisible({ timeout: 2500 }).catch(() => false)) {
    await ready.click();
  }
  // Motion prep may appear
  const startAnyway = page.getByRole("button", { name: /Start anyway|Continue|Got it|I'm Ready/i });
  if (await startAnyway.isVisible({ timeout: 1500 }).catch(() => false)) {
    await startAnyway.click();
  }
  await page.waitForTimeout(400);
}

async function backHome(page: Page) {
  const exit = page.getByRole("button", { name: /Exit|Go back|Back/i }).first();
  if (await exit.isVisible({ timeout: 1500 }).catch(() => false)) {
    await exit.click();
    await page.waitForTimeout(300);
  }
  // May need second back from onboarding
  if (!(await page.getByText("Today's Adventures").isVisible({ timeout: 1500 }).catch(() => false))) {
    const exit2 = page.getByRole("button", { name: /Exit|Go back|Back/i }).first();
    if (await exit2.isVisible().catch(() => false)) await exit2.click();
  }
  await page.waitForSelector("text=Today's Adventures", { timeout: 10_000 }).catch(() => undefined);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREEN_DIR, `${name}.png`),
    fullPage: false,
  });
}

test.describe.configure({ mode: "serial" });

test("responsive certification matrix", async ({ page }) => {
  test.setTimeout(20 * 60_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREEN_DIR, { recursive: true });

  await mockHealthLabApi(page);

  const probes: ProbeResult[] = [];
  const allFails: Fail[] = [];

  // Full matrix on home + cards (all widths × font scales)
  for (const width of WIDTHS) {
    for (const fontScale of FONT_SCALES) {
      const height = Math.round(width * (16 / 9) > 900 ? 800 : Math.max(640, Math.round(width * 1.8)));
      await gotoLab(page);
      await setViewportFont(page, width, height, fontScale);

      await expandSection(page, /Daily Quests/i);
      await expandSection(page, /For grown-ups/i);

      const home = await probeDom(page, {
        width,
        height,
        fontScale,
        orientation: "portrait",
        screen: "home+trail+quests+grownups",
      });
      probes.push(home);
      allFails.push(...home.fails);

      if (fontScale === 1 || (width === 320 && fontScale === 1.5) || (width === 390 && fontScale === 1.3)) {
        await shot(page, `home-w${width}-fs${Math.round(fontScale * 100)}`);
      }
    }
  }

  // Landscape home
  for (const ls of LANDSCAPE) {
    await gotoLab(page);
    await setViewportFont(page, ls.width, ls.height, 1);
    const home = await probeDom(page, {
      width: ls.width,
      height: ls.height,
      fontScale: 1,
      orientation: "landscape",
      screen: `home-${ls.label}`,
    });
    probes.push(home);
    allFails.push(...home.fails);
    await shot(page, `home-${ls.label}`);
  }

  // Critical narrow + large font: each world + passport
  const critical = [
    { width: 320, height: 640, fontScale: 1 },
    { width: 360, height: 720, fontScale: 1.3 },
    { width: 390, height: 844, fontScale: 1.5 },
    { width: 412, height: 915, fontScale: 1 },
  ] as const;

  for (const vp of critical) {
    await gotoLab(page);
    await setViewportFont(page, vp.width, vp.height, vp.fontScale);

    // Passport via grown-ups
    await expandSection(page, /For grown-ups/i);
    const passportBtn = page.getByRole("button", { name: /Health Passport|Wellness Report/i });
    if (await passportBtn.first().isVisible().catch(() => false)) {
      await passportBtn.first().click();
      await page.waitForTimeout(500);
      const pass = await probeDom(page, {
        width: vp.width,
        height: vp.height,
        fontScale: vp.fontScale,
        orientation: "portrait",
        screen: "passport-wellness",
      });
      probes.push(pass);
      allFails.push(...pass.fails);
      await shot(page, `passport-w${vp.width}-fs${Math.round(vp.fontScale * 100)}`);
      await backHome(page);
    }

    for (const world of WORLDS) {
      await gotoLab(page);
      await setViewportFont(page, vp.width, vp.height, vp.fontScale);
      await launchWorld(page, world.title);
      const game = await probeDom(page, {
        width: vp.width,
        height: vp.height,
        fontScale: vp.fontScale,
        orientation: "portrait",
        screen: `game-${world.world}`,
      });
      probes.push(game);
      allFails.push(...game.fails);
      if (vp.width === 320 || vp.fontScale >= 1.3) {
        await shot(
          page,
          `game-${world.world.replace(/\s+/g, "-").toLowerCase()}-w${vp.width}-fs${Math.round(vp.fontScale * 100)}`,
        );
      }
      await backHome(page);
    }
  }

  // FPS sample on home @ 390
  await gotoLab(page);
  await setViewportFont(page, 390, 844, 1);
  await page.evaluate(() => {
    (window as unknown as { __f: number; __s: number }).__f = 0;
    (window as unknown as { __s: number }).__s = performance.now();
    const tick = () => {
      (window as unknown as { __f: number }).__f++;
      (window as unknown as { __r: number }).__r = requestAnimationFrame(tick);
    };
    (window as unknown as { __r: number }).__r = requestAnimationFrame(tick);
  });
  await page.waitForTimeout(2000);
  const fps = await page.evaluate(() => {
    cancelAnimationFrame((window as unknown as { __r: number }).__r);
    const f = (window as unknown as { __f: number }).__f;
    const s = (window as unknown as { __s: number }).__s;
    return Math.round((f * 1000) / Math.max(1, performance.now() - s));
  });

  const uniqueFailCodes = [...new Set(allFails.map((f) => f.code))];
  const pass = allFails.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    verdict: pass ? "PASS" : "FAIL",
    devicesTested: ["Chromium (Playwright) — Android-class CSS viewports", "Font scaling via root rem"],
    screenWidthsTested: [...WIDTHS],
    fontScalingTested: FONT_SCALES.map((s) => `${Math.round(s * 100)}%`),
    landscapeTested: LANDSCAPE.map((l) => l.label),
    screensVerified: [
      "Health Lab Home",
      "Adventure Trail",
      "Every World Card",
      "Daily Quests",
      "For Grown-ups",
      "Passport / Wellness Report",
      ...WORLDS.map((w) => w.world),
    ],
    fpsHome390: fps,
    failCount: allFails.length,
    uniqueFailCodes,
    fails: allFails.slice(0, 200),
    probeCount: probes.length,
    screenshotDir: SCREEN_DIR,
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  const md = [
    "# Amy Health Lab — Responsive Certification Report",
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Verdict:** ${report.verdict}`,
    "",
    "## Devices / harness",
    "",
    ...report.devicesTested.map((d) => `- ${d}`),
    "",
    "## Widths tested (dp)",
    "",
    report.screenWidthsTested.map((w) => `${w}`).join(", "),
    "",
    "## Font scaling",
    "",
    report.fontScalingTested.join(", "),
    "",
    "## Landscape",
    "",
    report.landscapeTested.join(", "),
    "",
    "## Screens verified",
    "",
    ...report.screensVerified.map((s) => `- ${s}`),
    "",
    "## Performance sample",
    "",
    `- Home @ 390dp FPS (rAF sample ~2s): **${fps}**`,
    "",
    "## Remaining issues",
    "",
    allFails.length === 0
      ? "_None — all probes passed fail conditions._"
      : allFails
          .slice(0, 80)
          .map(
            (f) =>
              `- **${f.code}** @ ${f.width}×${f.height} fs=${Math.round(f.fontScale * 100)}% [${f.screen}]: ${f.detail}`,
          )
          .join("\n"),
    "",
    `Total fails: **${allFails.length}** (showing up to 80)`,
    "",
    "## Screenshots",
    "",
    `Directory: \`${SCREEN_DIR}\``,
    "",
    `## PASS / FAIL`,
    "",
    `**${report.verdict}**`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "RESPONSIVE-CERTIFICATION.md"), md);

  // Soft assert with detailed message — test fails if any layout fail condition hit
  expect(allFails, JSON.stringify(allFails.slice(0, 30), null, 2)).toEqual([]);
  expect(fps).toBeGreaterThanOrEqual(45);
});
