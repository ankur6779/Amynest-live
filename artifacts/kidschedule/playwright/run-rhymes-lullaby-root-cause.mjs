#!/usr/bin/env node
/**
 * Rhymes + Infant Lullaby root-cause probe (harness only — no prod src changes).
 * Writes audit/rhymes-lullaby-root-cause.json
 */
import { chromium, devices } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT_JSON = join(REPO, "audit", "rhymes-lullaby-root-cause.json");
const OUT_MD = join(REPO, "audit", "rhymes-lullaby-root-cause.md");
const BASE = "https://www.amynest.in";
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASS = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";
const HEADED = process.argv.includes("--headed");

mkdirSync(join(REPO, "audit"), { recursive: true });

const report = {
  validatedAt: new Date().toISOString(),
  baseUrl: BASE,
  mode: HEADED ? "headed" : "headless",
  signedUrlRequests: [],
  signedUrlValidation: [],
  rhymes: {},
  infantLullaby: {},
  authCheck: {},
  consoleErrors: [],
};

async function signIn(page) {
  const t0 = Date.now();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in") && !u.pathname.includes("/login"), {
    timeout: 120_000,
  });
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(800);
  }
  const appReady = await page
    .evaluate(() => (window.__amynestAppCoreReady === true))
    .catch(() => false);
  return { latencyMs: Date.now() - t0, appCoreReady: appReady, finalUrl: page.url() };
}

function setupSignedUrlCapture(page) {
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/api/audio/signed-url/")) return;
    const t = Date.now();
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = { parseError: true };
    }
    report.signedUrlRequests.push({
      at: new Date().toISOString(),
      requestUrl: url.replace(/https:\/\/[^/]+/, "https://[redacted]"),
      status: res.status(),
      latencyMs: null,
      audioId: url.split("/signed-url/")[1]?.split("?")[0] ?? null,
      success: body?.success ?? false,
      hasSignedUrl: !!body?.signedUrl,
      expiresIn: body?.expiresIn ?? null,
      cached: body?.cached ?? null,
      title: body?.title ?? null,
      signedUrlHost: body?.signedUrl
        ? new URL(body.signedUrl).host
        : null,
    });
  });
}

async function validateSignedUrl(signedUrl, audioId) {
  const result = { audioId, signedUrlHost: new URL(signedUrl).host, checks: {} };
  try {
    const headT0 = Date.now();
    const head = await fetch(signedUrl, { method: "HEAD", redirect: "follow" });
    result.checks.head = {
      status: head.status,
      latencyMs: Date.now() - headT0,
      contentType: head.headers.get("content-type"),
      contentLength: head.headers.get("content-length"),
      acceptRanges: head.headers.get("accept-ranges"),
    };
    const rangeT0 = Date.now();
    const range = await fetch(signedUrl, {
      headers: { Range: "bytes=0-4095" },
      redirect: "follow",
    });
    result.checks.range = {
      status: range.status,
      latencyMs: Date.now() - rangeT0,
      contentType: range.headers.get("content-type"),
      contentRange: range.headers.get("content-range"),
      bytesRead: (await range.arrayBuffer()).byteLength,
    };
    result.ok =
      head.status === 200 &&
      (head.headers.get("content-type") ?? "").includes("audio") &&
      range.status === 206;
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

async function collectMediaState(page) {
  return page.evaluate(() => {
    const mgr = window.__amynestAudioManagerRef;
    const evidence = mgr?.getRecentPlaybackEvidence?.(20_000);
    const recentEl = mgr?.getRecentMediaElement?.(20_000);
    const activeEl = mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.();
    const domAudios = Array.from(document.querySelectorAll("audio")).map((a) => ({
      src: a.src ? a.src.slice(0, 80) + "…" : "",
      readyState: a.readyState,
      currentTime: a.currentTime,
      paused: a.paused,
      inDom: true,
    }));
    const player = document.querySelector('[data-testid="sleep-track-fullscreen-player"]');
    const pauseVisible = !!player?.querySelector("svg.lucide-pause, .lucide-pause");
    const loadingVisible = !!player?.querySelector(".animate-spin");
    const playVisible = !!player?.querySelector("svg.lucide-play, .lucide-play");
    return {
      audioUnlocked: typeof window.__amynestAppCoreReady !== "undefined",
      mgrExists: !!mgr,
      isAnyChannelPlaying: mgr?.isAnyChannelPlaying?.() ?? null,
      evidence: evidence
        ? {
            peakCurrentTime: evidence.peakCurrentTime,
            ended: evidence.ended,
            srcTail: evidence.src?.slice(-60) ?? null,
          }
        : null,
      recentEl: recentEl
        ? {
            srcTail: recentEl.src?.slice(-60) ?? null,
            readyState: recentEl.readyState,
            currentTime: recentEl.currentTime,
            paused: recentEl.paused,
          }
        : null,
      activeEl: activeEl
        ? {
            srcTail: activeEl.src?.slice(-60) ?? null,
            readyState: activeEl.readyState,
            currentTime: activeEl.currentTime,
            paused: activeEl.paused,
          }
        : null,
      domAudios,
      player: { pauseVisible, loadingVisible, playVisible, visible: !!player },
    };
  });
}

async function triggerRhymes(page) {
  const t0 = Date.now();
  await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
  await page.goto(`${BASE}/rhymes`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1000);
  await page.getByTestId("rhymes-page").waitFor({ state: "visible", timeout: 20_000 });
  const tile = page.locator('[data-testid^="rhyme-tile-"]').first();
  await tile.waitFor({ state: "visible", timeout: 20_000 });
  await tile.scrollIntoViewIfNeeded();
  await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
  await tile.dispatchEvent("pointerdown");
  const clickT0 = Date.now();
  await tile.click({ timeout: 15_000 });
  const player = page.getByTestId("sleep-track-fullscreen-player");
  await player.waitFor({ state: "visible", timeout: 10_000 });
  await player.locator(".animate-spin").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  const playBtn = player.locator("button.h-16.w-16");
  const needsPlay = await playBtn.locator("svg.lucide-play, .lucide-play").isVisible().catch(() => false);
  if (needsPlay) {
    await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
    await playBtn.click({ timeout: 8_000 }).catch(() => {});
  }
  await page.waitForTimeout(5000);
  const mediaAfter = await collectMediaState(page);
  const verify = await page.evaluate(async () => {
    const mgr = window.__amynestAudioManagerRef;
    const pick = () => {
      const fromRecent = mgr?.getRecentMediaElement?.(12_000);
      if (fromRecent?.src?.startsWith("http")) return fromRecent;
      const evidence = mgr?.getRecentPlaybackEvidence?.(12_000);
      if ((evidence?.peakCurrentTime ?? 0) > 0.02) {
        return mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.();
      }
      return Array.from(document.querySelectorAll("audio")).find((a) => a.src?.startsWith("http")) ?? null;
    };
    let media = null;
    for (let i = 0; i < 24; i++) {
      const ev = mgr?.getRecentPlaybackEvidence?.(12_000);
      if ((ev?.peakCurrentTime ?? 0) > 0.02) {
        return { ok: true, reason: "ok", peakCurrentTime: ev.peakCurrentTime };
      }
      media = pick();
      if (media?.src) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!media?.src) return { ok: false, reason: "no_audio_element" };
    try {
      if (media.paused && media.readyState >= 2) await media.play();
    } catch (e) {
      return { ok: false, reason: "play_failed", error: String(e) };
    }
    await new Promise((r) => setTimeout(r, 2000));
    const t1 = media.currentTime;
    return {
      ok: t1 > 0,
      reason: t1 > 0 ? "ok" : "currentTime_zero",
      currentTime: t1,
      readyState: media.readyState,
      paused: media.paused,
    };
  });
  return {
    triggerMs: Date.now() - t0,
    clickToPlayerMs: Date.now() - clickT0,
    needsPlayClick: needsPlay,
    mediaAfter,
    verify,
  };
}

async function triggerInfantLullaby(page) {
  const t0 = Date.now();
  await page.goto(`${BASE}/parenting-hub#tile-infant-hub`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2000);
  await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });

  const root = page.locator('[data-section-id="infant-hub"]');
  let hubReady = await root.isVisible({ timeout: 2000 }).catch(() => false);
  if (!hubReady) {
    const namedInfant = page.getByRole("button", { name: /Audit-Toddler|Infant/i });
    if (await namedInfant.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await namedInfant.first().click();
      await page.waitForTimeout(1000);
      hubReady = await root.isVisible({ timeout: 8000 }).catch(() => false);
    }
  }
  if (!hubReady) {
    for (let i = 0; i < 12; i++) {
      const collapsed = root.locator('button[aria-expanded="false"]');
      if ((await collapsed.count()) === 0) break;
      await collapsed.first().click({ timeout: 8000 });
      await page.waitForTimeout(450);
      if (await page.getByTestId("sleep-module-shell").isVisible({ timeout: 1000 }).catch(() => false)) {
        hubReady = true;
        break;
      }
    }
  }

  let usedRhymesFallback = false;
  if (hubReady) {
    const lullTab = page.getByRole("tab", { name: /^lullabies$/i });
    if (await lullTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lullTab.click({ timeout: 8000 });
      await page.waitForTimeout(400);
    }
    const tile = page.locator('[data-testid^="sleep-track-tile-"]').first();
    if (await tile.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
      await tile.click({ timeout: 15_000 });
      const player = page.getByTestId("sleep-track-fullscreen-player");
      await player.waitFor({ state: "visible", timeout: 10_000 });
      await player.locator(".animate-spin").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
      const playBtn = player.locator("button.h-16.w-16");
      const needsPlay = await playBtn.locator("svg.lucide-play, .lucide-play").isVisible().catch(() => false);
      if (needsPlay) {
        await playBtn.click({ timeout: 8_000 }).catch(() => {});
      }
      await page.waitForTimeout(5000);
      const mediaAfter = await collectMediaState(page);
      const verify = await page.evaluate(async () => {
        const mgr = window.__amynestAudioManagerRef;
        const ev = mgr?.getRecentPlaybackEvidence?.(12_000);
        if ((ev?.peakCurrentTime ?? 0) > 0.02) return { ok: true, reason: "ok" };
        const media =
          mgr?.getRecentMediaElement?.(12_000) ??
          Array.from(document.querySelectorAll("audio")).find((a) => a.src?.startsWith("http"));
        if (!media?.src) return { ok: false, reason: "no_audio_element" };
        await new Promise((r) => setTimeout(r, 2000));
        return { ok: media.currentTime > 0, reason: media.currentTime > 0 ? "ok" : "currentTime_zero" };
      });
      return { hubReady, usedRhymesFallback, triggerMs: Date.now() - t0, mediaAfter, verify };
    }
  }

  usedRhymesFallback = true;
  const rhymes = await triggerRhymes(page);
  return { hubReady, usedRhymesFallback, triggerMs: Date.now() - t0, ...rhymes };
}

async function checkAuthOnSignedUrlEndpoint(page) {
  const catalogRes = await page.request.get(`${BASE}/api/audio/rhymes/catalog`);
  const catalog = catalogRes.ok() ? await catalogRes.json() : null;
  const firstId = catalog?.items?.[0]?.id ?? catalog?.rhymes?.[0]?.id ?? "twinkle-twinkle";
  const guestRes = await page.request.get(`${BASE}/api/audio/signed-url/${encodeURIComponent(firstId)}`);
  let guestBody = null;
  try {
    guestBody = await guestRes.json();
  } catch {
    guestBody = {};
  }
  return {
    catalogStatus: catalogRes.status(),
    catalogCount: catalog?.items?.length ?? catalog?.rhymes?.length ?? null,
    testAudioId: firstId,
    guestSignedUrlStatus: guestRes.status(),
    guestSuccess: guestBody?.success ?? false,
    guestHasUrl: !!guestBody?.signedUrl,
  };
}

async function runProbe() {
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push({ text: msg.text().slice(0, 300), at: new Date().toISOString() });
    }
  });

  setupSignedUrlCapture(page);

  report.authCheck = await checkAuthOnSignedUrlEndpoint(page);
  report.authCheck.signIn = await signIn(page);

  report.rhymes = await triggerRhymes(page);
  report.rhymes.signedUrlRequests = report.signedUrlRequests.filter((r) =>
    report.rhymes.mediaAfter?.evidence?.srcTail?.includes(r.audioId?.slice(-8) ?? "___") ||
    true,
  );

  for (const req of report.signedUrlRequests) {
    if (!req.hasSignedUrl) continue;
    const fullRes = await page.request.get(
      `${BASE}/api/audio/signed-url/${encodeURIComponent(req.audioId)}`,
    );
    const body = fullRes.ok() ? await fullRes.json() : null;
    if (body?.signedUrl) {
      const validation = await validateSignedUrl(body.signedUrl, req.audioId);
      report.signedUrlValidation.push(validation);
    }
  }

  report.infantLullaby = await triggerInfantLullaby(page);

  await browser.close();
  return report;
}

async function main() {
  const headlessReport = await runProbe();
  writeFileSync(OUT_JSON, JSON.stringify(headlessReport, null, 2));

  let headedReport = null;
  if (!HEADED) {
    process.argv.push("--headed");
    headedReport = await (async () => {
      const browser = await chromium.launch({ headless: false });
      const context = await browser.newContext({ ...devices["Pixel 5"] });
      const page = await context.newPage();
      setupSignedUrlCapture(page);
      await signIn(page);
      const rhymes = await triggerRhymes(page);
      await browser.close();
      return { rhymesVerify: rhymes.verify, mediaAfter: rhymes.mediaAfter };
    })();
  }

  headlessReport.headedComparison = headedReport;

  const productBug = headlessReport.rhymes.verify?.ok === false && headedReport?.rhymesVerify?.ok === false;
  const harnessBug =
    headlessReport.rhymes.verify?.reason === "no_audio_element" &&
    (headlessReport.rhymes.mediaAfter?.player?.pauseVisible ||
      (headlessReport.rhymes.mediaAfter?.evidence?.peakCurrentTime ?? 0) > 0);
  const signedUrlIssue = report.signedUrlValidation.some((v) => v.ok === false);
  const authIssue =
    headlessReport.authCheck.guestSignedUrlStatus !== 200 || !headlessReport.authCheck.guestSuccess;

  const md = buildMarkdown(headlessReport, { productBug, harnessBug, signedUrlIssue, authIssue });
  writeFileSync(OUT_MD, md);
  writeFileSync(OUT_JSON, JSON.stringify(headlessReport, null, 2));
  console.log(md);
}

function buildMarkdown(r, verdicts) {
  const conf = computeConfidence(r, verdicts);
  return `# Rhymes + Infant Lullaby Root Cause

\`\`\`
Product Bug: ${verdicts.productBug ? "YES" : "NO"}
Harness Bug: ${verdicts.harnessBug ? "YES" : "NO"}
Signed URL Issue: ${verdicts.signedUrlIssue ? "YES" : "NO"}
Auth Issue: ${verdicts.authIssue ? "YES" : "NO"}
Confidence: ${conf}%
\`\`\`

## Evidence

${formatEvidence(r)}
`;
}

function computeConfidence(r, v) {
  let score = 50;
  if (r.signedUrlValidation.length > 0 && r.signedUrlValidation.every((x) => x.ok)) score += 15;
  if (r.authCheck.guestSuccess) score += 10;
  if (r.rhymes.verify?.ok) score += 15;
  if (r.infantLullaby.verify?.ok) score += 10;
  if (v.harnessBug) score -= 20;
  return Math.min(95, Math.max(40, score));
}

function formatEvidence(r) {
  const lines = [];
  lines.push(`- Probe at ${r.validatedAt}, mode=${r.mode}, base=${r.baseUrl}`);
  lines.push(`- Auth: sign-in ${r.authCheck.signIn?.latencyMs}ms, appCoreReady=${r.authCheck.signIn?.appCoreReady}`);
  lines.push(
    `- Guest signed-url endpoint: HTTP ${r.authCheck.guestSignedUrlStatus}, success=${r.authCheck.guestSuccess}, catalogCount=${r.authCheck.catalogCount}`,
  );
  for (const req of r.signedUrlRequests) {
    lines.push(
      `- Signed URL fetch [${req.audioId}]: HTTP ${req.status}, success=${req.success}, host=${req.signedUrlHost}`,
    );
  }
  for (const v of r.signedUrlValidation) {
    lines.push(
      `- URL validation [${v.audioId}]: head=${v.checks.head?.status}, type=${v.checks.head?.contentType}, range=${v.checks.range?.status}, ok=${v.ok}`,
    );
  }
  lines.push(
    `- Rhymes verify: ${r.rhymes.verify?.reason}, peakCT=${r.rhymes.mediaAfter?.evidence?.peakCurrentTime ?? "n/a"}, player pause=${r.rhymes.mediaAfter?.player?.pauseVisible}`,
  );
  lines.push(
    `- Infant lullaby: hubReady=${r.infantLullaby.hubReady}, fallback=${r.infantLullaby.usedRhymesFallback}, verify=${r.infantLullaby.verify?.reason}`,
  );
  if (r.headedComparison) {
    lines.push(
      `- Headed vs headless rhymes: headless=${r.rhymes.verify?.reason}, headed=${r.headedComparison.rhymesVerify?.reason}`,
    );
  }
  if (r.consoleErrors.length) {
    lines.push(`- Console errors: ${r.consoleErrors.length} (first: ${r.consoleErrors[0]?.text?.slice(0, 120)})`);
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
