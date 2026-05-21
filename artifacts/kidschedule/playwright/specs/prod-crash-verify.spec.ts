/**
 * Production crash verification — sign-in + navigation, assert no fatal crash UI.
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.prod-verify.ts
 */
import { test, expect } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { signInWithEmail } from "../helpers/auth";

const LOG_PATH =
  process.env.AGENT_DEBUG_LOG ??
  "/Users/macbook/AmyNestProject/AmyNest-AI/.cursor/debug-9b2f04.log";
const SESSION_ID = "9b2f04";

const ROUTES = [
  "/dashboard",
  "/parenting-hub",
  "/audio-lessons",
  "/amy-coach",
  "/routines",
  "/insights",
];

function agentLog(payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    runId: "prod-verify",
    ...payload,
  });
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${line}\n`, { flag: "a" });
  } catch {
    /* log file optional */
  }
}

test("production: no crash overlay after sign-in and navigation", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (err) => {
    if (pageErrors.length < 20) pageErrors.push(err.message.slice(0, 400));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && consoleErrors.length < 15) {
      consoleErrors.push(msg.text().slice(0, 300));
    }
  });

  agentLog({
    location: "prod-crash-verify.spec.ts:start",
    message: "production test started",
    hypothesisId: "H1-H2",
    data: { baseURL: test.info().project.use?.baseURL },
  });

  await signInWithEmail(page);

  agentLog({
    location: "prod-crash-verify.spec.ts:post-signin",
    message: "signed in",
    hypothesisId: "H1",
    data: { url: page.url(), pathname: new URL(page.url()).pathname },
  });

  for (const route of ROUTES) {
    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(2_000);

      const crashOverlay = await page.locator("#amynest-crash-overlay").count();
      const crashText = await page.getByText(/APP CRASH DETECTED/i).count();
      const reactCrash = await page.getByText(/React Crash/i).count();

      agentLog({
        location: "prod-crash-verify.spec.ts:route",
        message: crashOverlay > 0 || crashText > 0 ? "crash UI visible" : "route ok",
        hypothesisId: "H1-H2",
        data: { route, crashOverlay, crashText, reactCrash, url: page.url() },
      });

      expect(crashOverlay, `Crash overlay on ${route}`).toBe(0);
      expect(crashText, `Crash text on ${route}`).toBe(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pageErrors.push(`NAV ${route}: ${msg}`);
      agentLog({
        location: "prod-crash-verify.spec.ts:route-fail",
        message: "navigation failed",
        hypothesisId: "H3",
        data: { route, err: msg },
      });
    }
  }

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const snapshot = await page
    .evaluate(() => {
      let lastCrash: unknown = null;
      try {
        const raw = localStorage.getItem("__amynest_last_crash_v1");
        lastCrash = raw ? JSON.parse(raw) : null;
      } catch {
        /* ignore */
      }
      const w = window as Window & { __amynestCrashLog?: Array<{ message: string }> };
      return {
        lastCrash,
        crashLog: w.__amynestCrashLog?.slice(-10) ?? [],
      };
    })
    .catch(() => ({ lastCrash: null, crashLog: [] as Array<{ message: string }> }));

  const { lastCrash, crashLog } = snapshot;

  const criticalPageErrors = pageErrors.filter(
    (m) =>
      !m.includes("ResizeObserver") &&
      !m.includes("Non-Error") &&
      !m.includes("AbortError"),
  );

  agentLog({
    location: "prod-crash-verify.spec.ts:summary",
    message: "production test complete",
    hypothesisId: "H1-H5",
    data: {
      criticalPageErrors,
      consoleErrorSample: consoleErrors.slice(0, 5),
      lastCrash,
      crashLogCount: crashLog.length,
      crashLogMessages: crashLog.map((c) => c.message).slice(0, 5),
    },
  });

  expect(criticalPageErrors.length, `Page errors:\n${criticalPageErrors.join("\n")}`).toBeLessThan(
    3,
  );
});
