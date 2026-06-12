/**
 * Independent live blocker investigation — production https://www.amynest.in
 *
 * Run:
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   npx playwright test audit/blocker-investigation.spec.ts \
 *     --config audit/playwright.blocker-investigation.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { dismissCountryPromptIfVisible, signInWithEmail } from "../artifacts/kidschedule/playwright/helpers/auth";
import { verifyAudioPlayback } from "../artifacts/kidschedule/playwright/helpers/audio-playback";
import { primeUserGesture } from "../artifacts/kidschedule/playwright/helpers/hub-navigation";

const OUT_DIR = join(process.cwd(), "audit", "screenshots", "blocker-investigation");
const REPORT_PATH = join(process.cwd(), "audit", "blocker-investigation-live.json");

mkdirSync(OUT_DIR, { recursive: true });

type BlockerResult = Record<string, unknown>;
const results: BlockerResult = {
  validatedAt: new Date().toISOString(),
  baseURL: "https://www.amynest.in",
  deployVersion: null as string | null,
  blockers: {} as Record<string, unknown>,
};

function saveResults() {
  writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
}

async function captureDeployVersion(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  results.deployVersion = await page
    .locator('meta[name="amynest-deploy"]')
    .getAttribute("content")
    .catch(() => null);
}

async function screenshotOnFail(page: Page, name: string) {
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
}

const DEV_ROUTES = [
  { path: "/debug-parity", expectRedirect: "/dashboard" },
  { path: "/dev/phonics-audio-preview", expectRedirect: "/dashboard" },
  { path: "/dev/rhymes-audio-ab", expectRedirect: "/dashboard" },
];

test.describe("Blocker investigation — live production", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await captureDeployVersion(page);
    await page.close();
    saveResults();
  });

  test("Blocker A — dev routes (guest, client-side redirect)", async ({ page }) => {
    const routeResults: Record<string, unknown>[] = [];

    for (const { path, expectRedirect } of DEV_ROUTES) {
      await page.goto(path, { waitUntil: "commit", timeout: 90_000 });
      await page.waitForURL((url) => url.pathname.includes(expectRedirect) || url.pathname.includes(path.replace(/^\//, "")), {
        timeout: 15_000,
      }).catch(() => {});
      await page.waitForTimeout(2_000);
      const finalUrl = page.url();
      const redirected = finalUrl.includes(expectRedirect);
      const stillOnDev = finalUrl.includes(path.replace(/^\//, ""));
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const hasDevSurface =
        /debug parity|phonics audio preview|rhymes audio ab/i.test(bodyText) &&
        !redirected;

      routeResults.push({
        path,
        httpNote: "SPA returns 200 for all routes; redirect is client-side",
        finalUrl,
        redirected,
        stillOnDevRoute: stillOnDev && !redirected,
        hasDevSurfaceContent: hasDevSurface,
        authRequired: false,
      });

      if (!redirected || hasDevSurface) {
        await screenshotOnFail(page, `blocker-a-fail-${path.replace(/\//g, "_")}`);
      }
    }

    // /debug/learning — auth gate check (guest)
    await page.goto("/debug/learning", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    const learningUrl = page.url();
    const onSignIn = /sign-in|login/.test(learningUrl);
    const onDebugLearning = learningUrl.includes("/debug/learning");
    const learningBody = await page.locator("body").innerText().catch(() => "");
    const showsDebugContent =
      onDebugLearning &&
      /debug learning|learning debug|skill tree/i.test(learningBody);

    routeResults.push({
      path: "/debug/learning",
      finalUrl: learningUrl,
      guestAccessible: onDebugLearning && !onSignIn,
      redirectedToSignIn: onSignIn,
      showsDebugContent,
      authRequired: !onSignIn && onDebugLearning,
    });

    const realSecurityIssue =
      routeResults.some(
        (r) =>
          r.stillOnDevRoute === true ||
          r.hasDevSurfaceContent === true ||
          (r.path === "/debug/learning" && r.guestAccessible === true && r.showsDebugContent),
      );

    results.blockers = {
      ...results.blockers,
      A_dev_routes: {
        routes: routeResults,
        redirectMechanism: "client-side SPA (DevRouteRedirect → /dashboard in IS_PROD)",
        realSecurityIssue,
        category: realSecurityIssue ? "real_production_defect" : "false_positive",
      },
    };
    saveResults();

    expect.soft(realSecurityIssue, `Dev routes should redirect in prod: ${JSON.stringify(routeResults)}`).toBe(false);
  });

  test("Blocker B — phonics audio (guest, parent, child context)", async ({ page }) => {
    type PhonicsAttempt = Record<string, unknown>;

    async function tryPhonicsPlayback(label: string, signedIn: boolean): Promise<PhonicsAttempt> {
      if (signedIn) {
        await signInWithEmail(page);
        await dismissCountryPromptIfVisible(page);
      } else {
        await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
      }

      if (signedIn) {
        await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
      }

      await page.waitForTimeout(2_000);
      await primeUserGesture(page);

      const toddler = page.getByRole("button", { name: /Audit-Toddler|toddler/i }).first();
      if (await toddler.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await toddler.click({ timeout: 8_000 });
        await page.waitForTimeout(800);
      }

      const cta = page.getByTestId("phonics-primary-cta");
      if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await cta.click({ timeout: 10_000 });
        await page.waitForTimeout(1_000);
      }

      const practice = page.getByTestId("phonics-practice-sounds");
      const practiceVisible = await practice.isVisible({ timeout: 15_000 }).catch(() => false);
      if (practiceVisible) {
        await practice.scrollIntoViewIfNeeded({ timeout: 30_000 });
      }

      const playBtn = page.locator('[data-testid^="audio-play-"]').first();
      const playVisible = await playBtn.isVisible({ timeout: 15_000 }).catch(() => false);

      let clicked = false;
      if (playVisible) {
        await playBtn.click({ timeout: 12_000 });
        clicked = true;
        await page.waitForTimeout(2_000);
      }

      const domProbe = await page.evaluate(async () => {
        const mgr = (window as Window & {
          __amynestAudioManagerRef?: { getCurrentElement?: () => HTMLAudioElement | null };
        }).__amynestAudioManagerRef;
        const audioEls = Array.from(document.querySelectorAll("audio"));
        const withSrc = audioEls.filter((a) => !!a.src);
        const mgrEl = mgr?.getCurrentElement?.();
        const src = mgrEl?.src || withSrc[0]?.src || "";
        let srcStatus: number | null = null;
        if (src) {
          try {
            const r = await fetch(src, { method: "HEAD" });
            srcStatus = r.status;
          } catch {
            srcStatus = -1;
          }
        }
        return {
          audioCount: audioEls.length,
          audioWithSrc: withSrc.length,
          srcTail: src.slice(-100),
          srcStatus,
          mgrHasElement: !!mgrEl?.src,
        };
      });

      const playback = await verifyAudioPlayback(page);

      if (!playback.ok) {
        await screenshotOnFail(page, `blocker-b-phonics-${label.replace(/\s+/g, "-").toLowerCase()}`);
      }

      return {
        label,
        signedIn,
        practiceVisible,
        playButtonVisible: playVisible,
        playClicked: clicked,
        domProbe,
        playback,
      };
    }

    const guest = await tryPhonicsPlayback("guest", false);
    const parent = await tryPhonicsPlayback("parent", true);

    // Child context — select first child if picker visible
    await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(1_500);
    const childPicker = page.locator('[data-testid^="phonics-child-"], [data-testid^="child-select-"]').first();
    if (await childPicker.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await childPicker.click({ timeout: 8_000 });
      await page.waitForTimeout(800);
    }
    const childAttempt = await tryPhonicsPlayback("parent_with_child", true);

    const anyOk = [guest, parent, childAttempt].some((a) => (a.playback as { ok: boolean }).ok);
    let category = "false_positive";
    if (!anyOk) {
      const hasPlayBtn = [guest, parent, childAttempt].some((a) => a.playButtonVisible);
      const hasSrc = [guest, parent, childAttempt].some(
        (a) => (a.domProbe as { audioWithSrc: number }).audioWithSrc > 0,
      );
      if (!hasPlayBtn) category = "ui_bug";
      else if (!hasSrc) category = "manifest_bug";
      else category = "missing_audio";
    }

    results.blockers = {
      ...results.blockers,
      B_phonics_audio: {
        attempts: { guest, parent, childAttempt },
        anyPlaybackOk: anyOk,
        realBug: !anyOk,
        category: anyOk ? "false_positive" : category,
      },
    };
    saveResults();
  });

  test("Blocker C — infant audio (demo account infant fixture)", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    // Check children ages on account
    await page.goto("/children", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(2_000);
    const childrenText = await page.locator("main").innerText().catch(() => "");
    const hasInfantChild = /0\s*[-–]\s*12\s*month|infant|0-1|under\s*1/i.test(childrenText);

    // Try parenting hub infant paths
    await page.goto("/parenting-hub", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(2_000);

    const infantTile = page.getByRole("button").filter({ hasText: /Baby Care|Infant/i }).first();
    let infantHubReached = false;
    if (await infantTile.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await infantTile.click({ timeout: 10_000 });
      infantHubReached = true;
      await page.waitForTimeout(1_500);
    }

    // Infant story attempt
    let storyResult: Record<string, unknown> = { attempted: false };
    const storyBtn = page.getByRole("button", { name: /story|watch/i }).first();
    if (await storyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await storyBtn.click({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
      storyResult = {
        attempted: true,
        playback: await verifyAudioPlayback(page),
      };
    }

    // Infant poem
    let poemResult: Record<string, unknown> = { attempted: false, reason: "no_infant_section" };
    const poemSection = page.getByTestId("infant-poems-section");
    if (await poemSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const poemPlay = poemSection.locator('[data-testid^="audio-play-"]').first();
      if (await poemPlay.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await poemPlay.click({ timeout: 10_000 });
        await page.waitForTimeout(2_000);
        poemResult = { attempted: true, playback: await verifyAudioPlayback(page) };
      }
    } else if (!hasInfantChild) {
      poemResult = { attempted: false, reason: "infant_poem_requires_infant_child" };
    }

    const storyOk = (storyResult.playback as { ok?: boolean } | undefined)?.ok === true;
    const poemOk = (poemResult.playback as { ok?: boolean } | undefined)?.ok === true;
    const testFixtureIssue = !hasInfantChild && !infantHubReached;
    const realBug = hasInfantChild && !storyOk && !poemOk;

    if (!storyOk && !poemOk) {
      await screenshotOnFail(page, "blocker-c-infant-audio");
    }

    results.blockers = {
      ...results.blockers,
      C_infant_audio: {
        hasInfantChild,
        infantHubReached,
        childrenPageSnippet: childrenText.slice(0, 500),
        story: storyResult,
        poem: poemResult,
        testFixtureIssue,
        realBug,
        category: testFixtureIssue
          ? "test_fixture_issue"
          : realBug
            ? "real_production_defect"
            : storyOk || poemOk
              ? "false_positive"
              : "audit_methodology_issue",
      },
    };
    saveResults();
  });

  test("Blocker E — Core Web Vitals (signed in)", async ({ page }) => {
    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    const pages = ["/dashboard", "/parenting-hub"];
    const cwvResults: Record<string, unknown>[] = [];

    for (const path of pages) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");

      await page.goto(path, { waitUntil: "networkidle", timeout: 120_000 }).catch(async () => {
        await page.goto(path, { waitUntil: "domcontentloaded", timeout: 120_000 });
      });
      await page.waitForTimeout(4_000);

      const metrics = await page.evaluate(() => {
        return new Promise<Record<string, number | null>>((resolve) => {
          const out: Record<string, number | null> = {
            lcp: null,
            cls: null,
            fcp: null,
            ttfb: null,
          };

          try {
            const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
            if (nav) out.ttfb = nav.responseStart - nav.requestStart;

            const paint = performance.getEntriesByType("paint");
            const fcp = paint.find((p) => p.name === "first-contentful-paint");
            if (fcp) out.fcp = fcp.startTime;

            const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
            if (lcpEntries.length) {
              out.lcp = (lcpEntries[lcpEntries.length - 1] as PerformanceEntry).startTime;
            }

            let cls = 0;
            for (const e of performance.getEntriesByType("layout-shift")) {
              const ls = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
              if (!ls.hadRecentInput) cls += ls.value ?? 0;
            }
            out.cls = cls;
          } catch {
            /* ignore */
          }

          // INP proxy: max interaction delay from Event Timing if available
          let inpProxy: number | null = null;
          try {
            const events = performance.getEntriesByType("event") as (PerformanceEntry & {
              duration?: number;
              interactionId?: number;
            })[];
            const interactions = events.filter((e) => e.interactionId && (e.duration ?? 0) > 0);
            if (interactions.length) {
              inpProxy = Math.max(...interactions.map((e) => e.duration ?? 0));
            }
          } catch {
            /* Event Timing may be unavailable */
          }

          resolve({ ...out, inpProxy });
        });
      });

      // Trigger a click to capture INP-like interaction
      await page.locator("main, body").first().click({ position: { x: 50, y: 50 }, force: true }).catch(() => {});
      await page.waitForTimeout(500);

      const postClick = await page.evaluate(() => {
        let inpProxy: number | null = null;
        const events = performance.getEntriesByType("event") as (PerformanceEntry & { duration?: number })[];
        const durations = events.map((e) => e.duration ?? 0).filter((d) => d > 0);
        if (durations.length) inpProxy = Math.max(...durations);
        return { inpProxy };
      });

      const lcpMs = metrics.lcp != null ? Math.round(metrics.lcp) : null;
      const clsVal = metrics.cls != null ? Number(metrics.cls.toFixed(4)) : null;
      const inpMs = postClick.inpProxy != null ? Math.round(postClick.inpProxy) : metrics.inpProxy != null ? Math.round(metrics.inpProxy) : null;

      cwvResults.push({
        path,
        lcpMs,
        cls: clsVal,
        inpMs,
        fcpMs: metrics.fcp != null ? Math.round(metrics.fcp) : null,
        ttfbMs: metrics.ttfb != null ? Math.round(metrics.ttfb) : null,
        lcpPass: lcpMs != null ? lcpMs <= 3000 : null,
        clsPass: clsVal != null ? clsVal <= 0.1 : null,
        inpPass: inpMs != null ? inpMs <= 200 : null,
      });

      await cdp.detach();
    }

    results.blockers = {
      ...results.blockers,
      E_performance: {
        pages: cwvResults,
        measured: true,
        note: "INP approximated via Event Timing duration; full field INP requires user interaction lab",
      },
    };
    saveResults();
  });
});
