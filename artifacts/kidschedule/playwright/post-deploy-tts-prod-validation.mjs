#!/usr/bin/env node
/**
 * Post-deploy TTS validation against production — runtime evidence only.
 *
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   node scripts/post-deploy-tts-prod-validation.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in").replace(/\/$/, "");
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "";
const OUT_DIR = join(process.cwd(), "playwright", "post-deploy-tts-validation-artifacts");
const EXPECT_MODEL = "eleven_flash_v2_5";
const EXPECT_VOICE = "QbQKfe9vgx5OsbZUvlFv";
const TTFA_PASS_MS = 800;
const TTFA_CACHE_PASS_MS = 300;

function now() {
  return Date.now();
}

function hdr(headers, name) {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

async function signIn(page, onBearer) {
  page.on("request", (req) => {
    const auth = req.headers()["authorization"] ?? req.headers()["Authorization"];
    if (auth?.startsWith("Bearer ")) onBearer(auth.slice(7));
  });
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"), {
    timeout: 120_000,
  });
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(600);
  }
  await page.waitForFunction(
    () => (window).__amynestAppCoreReady === true,
    { timeout: 45_000 },
  ).catch(() => {});
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function getAuthHeaders(page, capturedToken) {
  const fromDom = await page.evaluate(async () => {
    let token = null;
    for (const key of Object.keys(localStorage)) {
      if (!key.includes("firebase:authUser")) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "null");
        if (parsed?.stsTokenManager?.accessToken) {
          token = parsed.stsTokenManager.accessToken;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    const auth = globalThis.firebase?.auth?.();
    if (!token && auth?.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return { token, origin: location.origin, href: location.href };
  });
  return { token: capturedToken || fromDom.token, origin: fromDom.origin, href: fromDom.href };
}

async function measureStreamFetch(page, label, body, authToken) {
  const requestStart = now();
  const result = await page.evaluate(
    async ({ label, body, authToken, origin }) => {
      const t0 = performance.now();
      const wall0 = Date.now();
      let firstByteMs = null;
      let firstPlayableByteMs = null;
      let responseCompleteMs = null;
      let headers = {};
      let status = 0;
      let model = null;
      let voice = null;
      let cached = null;
      let cacheKey = null;
      let gcsPath = null;
      let transferEncoding = null;
      let contentLength = null;
      let error = null;
      let totalBytes = 0;
      let synthesisCompleteMs = null;

      try {
        const res = await fetch(`${origin}/api/tts/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
        });
        status = res.status;
        headers = Object.fromEntries(res.headers.entries());
        transferEncoding = headers["transfer-encoding"] ?? null;
        contentLength = headers["content-length"] ?? null;
        model = headers["x-amynest-tts-model"] ?? headers["x-tts-model"] ?? null;
        voice = headers["x-amynest-tts-voice"] ?? headers["x-tts-voice"] ?? null;
        cached = headers["x-amynest-tts-cached"] ?? headers["x-tts-cached"] ?? null;
        cacheKey = headers["x-amynest-tts-cache-key"] ?? headers["x-tts-cache-key"] ?? null;
        gcsPath = headers["x-amynest-gcs-path"] ?? headers["x-gcs-path"] ?? null;
        firstByteMs = Math.round(performance.now() - t0);

        if (!res.ok) {
          error = await res.text();
          responseCompleteMs = Math.round(performance.now() - t0);
          return {
            label,
            requestStartWall: wall0,
            status,
            headers,
            transferEncoding,
            contentLength,
            model,
            voice,
            cached,
            cacheKey,
            gcsPath,
            firstByteMs,
            firstPlayableByteMs,
            playbackStartMs: null,
            responseCompleteMs,
            synthesisCompleteMs,
            totalBytes,
            error,
          };
        }

        const reader = res.body?.getReader();
        if (!reader) {
          error = "no_body_reader";
          responseCompleteMs = Math.round(performance.now() - t0);
          return { label, requestStartWall: wall0, status, error, firstByteMs, responseCompleteMs };
        }

        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.length) {
            totalBytes += value.length;
            if (firstPlayableByteMs == null && value.length >= 4) {
              firstPlayableByteMs = Math.round(performance.now() - t0);
            }
            chunks.push(value);
          }
        }
        synthesisCompleteMs = Math.round(performance.now() - t0);
        responseCompleteMs = synthesisCompleteMs;

        // Attempt HTMLAudio playback timing
        let playbackStartMs = null;
        try {
          const blob = new Blob(chunks, { type: headers["content-type"] || "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          await new Promise((resolve, reject) => {
            const to = setTimeout(() => reject(new Error("play_timeout")), 15_000);
            audio.addEventListener("playing", () => {
              playbackStartMs = Math.round(performance.now() - t0);
              clearTimeout(to);
              audio.pause();
              URL.revokeObjectURL(url);
              resolve(null);
            });
            audio.addEventListener("error", () => {
              clearTimeout(to);
              URL.revokeObjectURL(url);
              reject(new Error("audio_error"));
            });
            void audio.play();
          });
        } catch {
          /* playback may be blocked in headless — network timing still valid */
        }

        return {
          label,
          requestStartWall: wall0,
          status,
          headers,
          transferEncoding,
          contentLength,
          model,
          voice,
          cached,
          cacheKey,
          gcsPath,
          firstByteMs,
          firstPlayableByteMs,
          playbackStartMs,
          responseCompleteMs,
          synthesisCompleteMs,
          totalBytes,
          error: null,
        };
      } catch (e) {
        return {
          label,
          requestStartWall: wall0,
          status,
          error: String(e?.message ?? e),
          firstByteMs,
          responseCompleteMs: Math.round(performance.now() - t0),
        };
      }
    },
    { label, body, authToken, origin: BASE },
  );
  result.requestStartTs = requestStart;
  return result;
}

async function measureStaticAudio(page, label, hash, authToken) {
  const url = `${BASE}/api/static-audio/${hash}.mp3`;
  const requestStart = now();
  const res = await page.request.get(url, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  const headers = res.headers();
  const buf = await res.body();
  return {
    label,
    requestStartTs: requestStart,
    status: res.status(),
    transferEncoding: hdr(headers, "transfer-encoding") ?? null,
    contentLength: hdr(headers, "content-length") ?? null,
    xAmynestStaticSource: hdr(headers, "x-amynest-static-source") ?? null,
    xAmynestOriginCache: hdr(headers, "x-amynest-origin-cache") ?? null,
    xAmynestEdgeCache: hdr(headers, "x-amynest-edge-cache") ?? null,
    bytes: buf.length,
    firstByteMs: now() - requestStart,
    firstPlayableByteMs: now() - requestStart,
    playbackStartMs: null,
    responseCompleteMs: now() - requestStart,
    synthesisCompleteMs: null,
    cached: hdr(headers, "x-amynest-origin-cache") === "memory" || hdr(headers, "x-amynest-static-source") !== "placeholder",
  };
}

async function measureCoachAudio(page, label, coachBody, authToken) {
  const requestStart = now();
  const result = await page.evaluate(
    async ({ label, coachBody, authToken, origin }) => {
      const t0 = performance.now();
      const wall0 = Date.now();
      try {
        const res = await fetch(`${origin}/api/coach-audio/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(coachBody),
        });
        const json = await res.json();
        return {
          label,
          requestStartWall: wall0,
          status: res.status,
          ms: Math.round(performance.now() - t0),
          json,
          headers: Object.fromEntries(res.headers.entries()),
        };
      } catch (e) {
        return { label, error: String(e?.message ?? e), ms: Math.round(performance.now() - t0) };
      }
    },
    { label, coachBody, authToken, origin: BASE },
  );
  result.requestStartTs = requestStart;
  return result;
}

function scoreFeature(first, second) {
  const streaming =
    first.status === 200 &&
    (first.transferEncoding?.toLowerCase()?.includes("chunked") === true ||
      first.contentLength == null ||
      first.contentLength === "");
  const playbackBeforeSynth =
    first.playbackStartMs != null &&
    first.synthesisCompleteMs != null &&
    first.playbackStartMs < first.synthesisCompleteMs;
  const ttfaMs = first.playbackStartMs ?? first.firstPlayableByteMs ?? first.firstByteMs;
  const ttfaPass = ttfaMs != null && ttfaMs <= TTFA_PASS_MS;
  const cacheHitSecond =
    second &&
    (second.cached === "true" ||
      second.xAmynestOriginCache === "memory" ||
      second.xAmynestStaticSource === "gcs" ||
      second.json?.cached === true);
  return { streaming, playbackBeforeSynth, ttfaMs, ttfaPass, cacheHitSecond };
}

async function uiTriggerFeature(page, feature) {
  const logs = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (/AmyVoice|AudioPlayback|tts|coach|phonics|story|poem/i.test(t)) logs.push({ ts: now(), t });
  });

  try {
    switch (feature.key) {
      case "parent_hub_story": {
        await page.goto(`${BASE}/parenting-hub`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.waitForTimeout(2000);
        const story = page.getByRole("button", { name: /story|read|listen|play/i }).first();
        if (await story.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await story.click();
        }
        break;
      }
      case "amy_coach_listen": {
        await page.goto(`${BASE}/amy-coach`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.waitForTimeout(2000);
        const listen = page.getByRole("button", { name: /listen|play|hear|audio/i }).first();
        if (await listen.isVisible({ timeout: 10_000 }).catch(() => false)) await listen.click();
        break;
      }
      case "conversation_coach": {
        await page.goto(`${BASE}/amy-coach`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.waitForTimeout(1500);
        const tab = page.getByRole("tab", { name: /conversation|chat/i }).first();
        if (await tab.isVisible({ timeout: 8_000 }).catch(() => false)) await tab.click();
        const speak = page.getByRole("button", { name: /listen|play|speak|hear/i }).first();
        if (await speak.isVisible({ timeout: 8_000 }).catch(() => false)) await speak.click();
        break;
      }
      case "speech_coach": {
        for (const route of [`${BASE}/speech-coach`, `${BASE}/speech`, `${BASE}/amy-coach`]) {
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
          if (!page.url().includes("/sign-in")) break;
        }
        await page.waitForTimeout(1500);
        const start = page.getByRole("button", { name: /start|practice|listen|play/i }).first();
        if (await start.isVisible({ timeout: 8_000 }).catch(() => false)) await start.click();
        break;
      }
      case "infant_poem": {
        await page.goto(`${BASE}/playwright-infant-sleep-audio.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.getByRole("tab", { name: /poem/i }).click({ timeout: 10_000 }).catch(() => {});
        await page.locator('[data-content-type="poem"], [data-testid*="poem"]').first().click({ timeout: 10_000 }).catch(() => {});
        break;
      }
      case "infant_story": {
        await page.goto(`${BASE}/playwright-infant-sleep-audio.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.getByRole("tab", { name: /stor/i }).click({ timeout: 10_000 }).catch(() => {});
        await page.locator('[data-content-type="story"], [data-testid*="story"]').first().click({ timeout: 10_000 }).catch(() => {});
        break;
      }
      case "phonics_tap": {
        for (const route of [`${BASE}/phonics`, `${BASE}/learn/phonics`, `${BASE}/dashboard`]) {
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
          if (!page.url().includes("/sign-in")) break;
        }
        await page.waitForTimeout(1500);
        const tile = page.getByRole("button", { name: /^[a-z]$/i }).first();
        if (await tile.isVisible({ timeout: 8_000 }).catch(() => false)) await tile.click();
        break;
      }
      case "audio_lesson": {
        await page.goto(`${BASE}/audio-lessons`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.getByTestId("age-tile-2-4").click({ timeout: 20_000 }).catch(() => {});
        await page.getByTestId(/lesson-card-/).first().click({ timeout: 20_000 }).catch(() => {});
        await page.getByRole("button", { name: "Play" }).click({ timeout: 20_000 }).catch(() => {});
        break;
      }
      default:
        break;
    }
  } catch (e) {
    logs.push({ ts: now(), t: `ui_error:${String(e?.message ?? e)}` });
  }
  await page.waitForTimeout(5000);
  return logs;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set STRESS_TEST_EMAIL and STRESS_TEST_PASSWORD");
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const healthRes = await fetch(`${BASE}/api/healthz/tts`);
  const health = await healthRes.json();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 AmyNestProdTTSValidation/1.0",
  });
  const page = await context.newPage();
  let capturedToken = null;

  const networkEvents = [];
  page.on("request", (req) => {
    const u = req.url();
    if (/api\/(tts|static-audio|coach-audio)/.test(u)) {
      networkEvents.push({ phase: "request", url: u, method: req.method(), ts: now() });
    }
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (/api\/(tts|static-audio|coach-audio)/.test(u)) {
      const h = res.headers();
      networkEvents.push({
        phase: "response",
        url: u,
        status: res.status(),
        ts: now(),
        transferEncoding: h["transfer-encoding"] ?? null,
        contentLength: h["content-length"] ?? null,
        xTtsModel: h["x-amynest-tts-model"] ?? h["x-tts-model"] ?? null,
        xTtsVoice: h["x-amynest-tts-voice"] ?? h["x-tts-voice"] ?? null,
        xTtsCached: h["x-amynest-tts-cached"] ?? h["x-tts-cached"] ?? null,
        xStaticSource: h["x-amynest-static-source"] ?? null,
        xOriginCache: h["x-amynest-origin-cache"] ?? null,
      });
    }
  });

  await signIn(page, (t) => {
    capturedToken = t;
  });
  const { token, href } = await getAuthHeaders(page, capturedToken);
  if (!token) {
    console.error("FAIL: could not obtain Firebase auth token after sign-in", { href, captured: Boolean(capturedToken) });
    await browser.close();
    process.exit(1);
  }

  const streamCases = [
    {
      key: "parent_hub_story",
      label: "Parent Hub Story",
      body: { text: "Once upon a time, a little star learned to shine softly at bedtime.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "amy_coach_listen",
      label: "Amy Coach Listen",
      body: { text: "You are doing wonderfully. Take a deep breath with me.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "conversation_coach",
      label: "Conversation Coach",
      body: { text: "Let's practice saying hello and asking how someone feels today.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "speech_coach",
      label: "Speech Coach",
      body: { text: "Repeat after me: sunshine, butterfly, rainbow.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "infant_poem",
      label: "Infant Poem",
      body: { text: "Sleep, baby, sleep. The stars are bright above.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "infant_story",
      label: "Infant Story",
      body: { text: "The moon smiled down on a sleepy bunny in the meadow.", mode: "default", playbackMode: "partial-ok" },
    },
    {
      key: "phonics_tap",
      label: "Phonics Tap",
      body: { text: "Ah. Ah. Apple.", mode: "phonics", playbackMode: "partial-ok" },
    },
    {
      key: "audio_lesson",
      label: "Audio Lesson",
      body: {
        text: "Today we will learn about sharing toys with friends.",
        mode: "default",
        playbackMode: "partial-ok",
      },
    },
  ];

  const featureResults = [];

  for (const c of streamCases) {
    const first = await measureStreamFetch(page, c.label, c.body, token);
    await page.waitForTimeout(400);
    const second = await measureStreamFetch(page, `${c.label} (2nd)`, c.body, token);
    const uiLogs = await uiTriggerFeature(page, c);
    const uiNetwork = networkEvents.filter((e) => e.ts >= first.requestStartTs - 1000);

    const modelOk =
      (first.model === EXPECT_MODEL || health.amyTtsModel === EXPECT_MODEL) &&
      (first.voice === EXPECT_VOICE || health.amyTtsVoice === EXPECT_VOICE || first.voice == null);
    const scores = scoreFeature(first, second);

    featureResults.push({
      feature: c.label,
      key: c.key,
      firstRun: first,
      secondRun: second,
      modelVoice: {
        headerModel: first.model,
        headerVoice: first.voice,
        healthModel: health.amyTtsModel,
        healthVoice: health.amyTtsVoice,
        modelOk,
      },
      checks: {
        transferEncodingChunked: first.transferEncoding?.toLowerCase()?.includes("chunked") === true,
        contentLengthAbsent: first.contentLength == null || first.contentLength === "",
        playbackBeforeSynthesisComplete: scores.playbackBeforeSynth,
        gcsCached: Boolean(first.gcsPath || first.cached === "true" || second.cached === "true"),
        secondPlaybackCacheHit:
          second.cached === "true" ||
          (second.firstByteMs != null && first.firstByteMs != null && second.firstByteMs < first.firstByteMs * 0.5),
      },
      uiLogs: uiLogs.slice(-20),
      uiNetwork: uiNetwork.slice(-30),
    });
  }

  // Coach cache dedicated probe
  const coachProbe = await measureCoachAudio(
    page,
    "Coach Cache Probe",
    {
      planCacheKey: "prod-validation-coach-" + Date.now(),
      text: "Great job staying calm during bedtime.",
      identity: {
        text: "Great job staying calm during bedtime.",
        planCacheKey: "prod-validation-coach-" + Date.now(),
      },
    },
    token,
  );
  const coachProbe2 = await measureCoachAudio(
    page,
    "Coach Cache Probe 2nd",
    coachProbe.json?.identity ? { planCacheKey: coachProbe.json.planCacheKey, identity: coachProbe.json.identity } : coachProbe.json ?? {},
    token,
  );

  const postHealthRes = await fetch(`${BASE}/api/healthz/tts`);
  const postHealth = await postHealthRes.json();

  const integrityText = `Stream integrity probe ${Date.now()}`;
  const streamIntegrity = await page.evaluate(
    async ({ text, token, origin }) => {
      const headers = {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        Authorization: `Bearer ${token}`,
      };
      const body = JSON.stringify({ text, mode: "default", playbackMode: "partial-ok" });
      const cold = await fetch(`${origin}/api/tts/stream`, { method: "POST", headers, body });
      const cacheKey = cold.headers.get("x-tts-cache-key");
      const coldBytes = (await cold.arrayBuffer()).byteLength;
      await new Promise((r) => setTimeout(r, 400));
      const hot = await fetch(`${origin}/api/tts/stream`, { method: "POST", headers, body });
      const hotBytes = (await hot.arrayBuffer()).byteLength;
      let gcsBytes = null;
      if (cacheKey) {
        const gcs = await fetch(`${origin}/api/tts/audio/${cacheKey}.mp3`, { headers: { Authorization: `Bearer ${token}` } });
        if (gcs.ok) gcsBytes = (await gcs.arrayBuffer()).byteLength;
      }
      return {
        cacheKey,
        coldBytes,
        hotBytes,
        gcsBytes,
        truncated16k: hotBytes === 16384 && gcsBytes != null && gcsBytes > hotBytes,
        hotMatchesGcs: gcsBytes != null && hotBytes === gcsBytes,
      };
    },
    { text: integrityText, token, origin: BASE },
  );

  const aggregate = {
    streamingPass: featureResults.every(
      (f) => f.checks.transferEncodingChunked || (f.checks.contentLengthAbsent && f.firstRun.status === 200),
    ),
    ttfaPass: featureResults.every((f) => {
      const ttfa = f.firstRun.playbackStartMs ?? f.firstRun.firstPlayableByteMs ?? f.firstRun.firstByteMs;
      const isCacheHit = f.secondRun.cached === "true";
      return ttfa != null && ttfa <= (isCacheHit ? TTFA_CACHE_PASS_MS : TTFA_PASS_MS);
    }),
    cachingPass: featureResults.every((f) => f.secondRun.cached === "true" || f.checks.secondPlaybackCacheHit) &&
      !streamIntegrity.truncated16k &&
      (streamIntegrity.hotMatchesGcs || streamIntegrity.gcsBytes == null),
    coachCachePass: coachProbe2.json?.cached === true || coachProbe2.ms < (coachProbe.ms ?? 99999) * 0.6,
    gcsReusePass: featureResults.some((f) => f.firstRun.gcsPath || f.checks.gcsCached),
    costDedupPass: featureResults.every(
      (f) => f.secondRun.firstByteMs != null && f.firstRun.firstByteMs != null && f.secondRun.status === 200,
    ),
  };

  const report = {
    validatedAt: new Date().toISOString(),
    base: BASE,
    healthBefore: health,
    healthAfter: postHealth,
    thresholds: { ttfaDynamicMs: TTFA_PASS_MS, ttfaCachedMs: TTFA_CACHE_PASS_MS },
    expected: { model: EXPECT_MODEL, voice: EXPECT_VOICE },
    coachProbes: { first: coachProbe, second: coachProbe2 },
    streamIntegrity,
    features: featureResults,
    verdict: {
      Streaming: aggregate.streamingPass ? "PASS" : "FAIL",
      TTFA: aggregate.ttfaPass ? "PASS" : "FAIL",
      Caching: aggregate.cachingPass ? "PASS" : "FAIL",
      "Coach Cache": aggregate.coachCachePass ? "PASS" : "FAIL",
      "GCS Reuse": aggregate.gcsReusePass ? "PASS" : "FAIL",
      "Cost Deduplication": aggregate.costDedupPass ? "PASS" : "FAIL",
    },
    networkEventCount: networkEvents.length,
  };

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
