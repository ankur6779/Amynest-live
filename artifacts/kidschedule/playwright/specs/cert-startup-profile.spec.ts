/**
 * Cert fixture startup profiling — NO gameplay interaction.
 */
import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";

const OUT = path.join(process.cwd(), "certification/output/cert-startup-profile");
const REPORT = path.join(OUT, "report.json");

const EXPECTED: string[] = [
  "pageGoto",
  "moduleEval",
  "reactRootCreated",
  "certAppRender",
  "mazeHostMounted",
  "mazeGameMounted",
  "gameShellMounted",
  "mazeGridFirstRender",
  "roundInitialized",
];

type StartupRun = {
  runIndex: number;
  pass: boolean;
  durationMs: number;
  lastCheckpoint: string | null;
  firstMissing: string | null;
  disconnectBeforeGameplay: boolean | null;
  lastError: { message: string; stack?: string } | null;
  checkpoints: Array<{ name: string; msSinceOrigin: number; detail?: string }>;
  timings: Record<string, number>;
  abortedReason: string | null;
};

type StartupReport = {
  at: string;
  runs: StartupRun[];
  conclusion: {
    lastSuccessfulCheckpoint: string | null;
    firstCheckpointNeverReached: string | null;
    callStack: string | null;
    disconnectBeforeGameplay: boolean;
    confidence: number;
    evidence: string[];
  };
};

function saveReport(r: StartupReport): void {
  fs.mkdirSync(OUT, { recursive: true });
  r.at = new Date().toISOString();
  fs.writeFileSync(REPORT, JSON.stringify(r, null, 2));
}

async function readStartup(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const s = window.__certStartupExport?.() ?? window.__certStartup;
    if (!s) return null;
    return {
      lastCheckpoint: s.lastCheckpoint?.name ?? null,
      lastError: s.lastError,
      checkpoints: s.checkpoints.map((c) => ({
        name: c.name,
        msSinceOrigin: c.msSinceOrigin,
        detail: c.detail,
        stack: c.stack,
      })),
    };
  }).catch(() => null);
}

async function runStartupProfile(
  page: import("@playwright/test").Page,
  runIndex: number,
): Promise<StartupRun> {
  return Promise.race([
    runStartupProfileInner(page, runIndex),
    new Promise<StartupRun>((resolve) => {
      setTimeout(() => {
        resolve({
          runIndex,
          pass: false,
          durationMs: 45_000,
          lastCheckpoint: null,
          firstMissing: EXPECTED[0] ?? null,
          disconnectBeforeGameplay: true,
          lastError: null,
          checkpoints: [],
          timings: {},
          abortedReason: "hardTimeout45s",
        });
      }, 45_000);
    }),
  ]);
}

async function runStartupProfileInner(
  page: import("@playwright/test").Page,
  runIndex: number,
): Promise<StartupRun> {
  const start = Date.now();
  let abortedReason: string | null = null;
  let startup = null as Awaited<ReturnType<typeof readStartup>>;

  try {
    const launchMark = Date.now();
    await page.goto(
      "/playwright-gaming-hub-certification.html?mode=maze-easy&startupTrace=1",
      { timeout: 25_000, waitUntil: "domcontentloaded" },
    );
    await page.evaluate(() => {
      localStorage.setItem("amynest_startup_trace", "1");
      window.__certStartupMark?.("pageGoto");
    });

    await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 15_000 }).catch(() => {
      abortedReason = "mazeGridTimeout";
    });

    for (let i = 0; i < 20; i++) {
      startup = await readStartup(page);
      if (startup?.checkpoints.some((c) => c.name === "roundInitialized")) break;
      await page.waitForTimeout(250);
    }

    if (!startup) abortedReason = abortedReason ?? "startupExportUnavailable";
  } catch (e) {
    abortedReason = e instanceof Error ? e.message : String(e);
    startup = await readStartup(page).catch(() => null);
  }

  const reached = new Set(startup?.checkpoints.map((c) => c.name) ?? []);
  const firstMissing = EXPECTED.find((e) => !reached.has(e)) ?? null;
  const lastCheckpoint = startup?.lastCheckpoint ?? null;

  const gameplayCheckpoints = new Set(["firstInteraction", "firstMoveAccepted"]);
  const disconnectBeforeGameplay =
    lastCheckpoint != null ? !gameplayCheckpoints.has(lastCheckpoint) : null;

  const timings: Record<string, number> = {};
  for (const c of startup?.checkpoints ?? []) {
    timings[c.name] = c.msSinceOrigin;
  }
  timings.browserLaunchToGoto = Date.now() - start;

  const pass =
    !abortedReason &&
    reached.has("roundInitialized") &&
    reached.has("mazeGridFirstRender");

  return {
    runIndex,
    pass,
    durationMs: Date.now() - start,
    lastCheckpoint,
    firstMissing,
    disconnectBeforeGameplay,
    lastError: startup?.lastError
      ? { message: startup.lastError.message, stack: startup.lastError.stack }
      : null,
    checkpoints: startup?.checkpoints ?? [],
    timings,
    abortedReason,
  };
}

function evaluate(runs: StartupRun[]): StartupReport["conclusion"] {
  const allCheckpoints = runs.flatMap((r) => r.checkpoints.map((c) => c.name));
  const lastByRun = runs.map((r) => r.lastCheckpoint).filter(Boolean) as string[];
  const missingByRun = runs.map((r) => r.firstMissing).filter(Boolean) as string[];

  const lastSuccessful = lastByRun.sort().at(-1) ?? null;
  const firstNever = missingByRun[0] ?? null;

  const stack =
    runs.find((r) => r.lastError?.stack)?.lastError?.stack ??
    runs.flatMap((r) => r.checkpoints).find((c) => c.stack)?.stack ??
    null;

  const beforeGameplay = runs.every((r) => r.disconnectBeforeGameplay !== false);

  const passCount = runs.filter((r) => r.pass).length;
  const confidence =
    passCount === runs.length
      ? 90
      : passCount === 0 && lastSuccessful && beforeGameplay
        ? 75
        : 45;

  return {
    lastSuccessfulCheckpoint: lastSuccessful,
    firstCheckpointNeverReached: firstNever,
    callStack: stack,
    disconnectBeforeGameplay: beforeGameplay,
    confidence,
    evidence: runs.map(
      (r) =>
        `run${r.runIndex}: pass=${r.pass} last=${r.lastCheckpoint} missing=${r.firstMissing} abort=${r.abortedReason} ms=${r.durationMs}`,
    ),
  };
}

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
  await page.addInitScript(() => {
    window.__certStartup = {
      origin: performance.timeOrigin,
      lastCheckpoint: null,
      checkpoints: [],
      lastError: null,
    };
  });
});

test("cert startup profile — 1 quick run", async ({ page }) => {
  test.setTimeout(60_000);
  const run = await runStartupProfile(page, 0);
  saveReport({
    at: new Date().toISOString(),
    runs: [run],
    conclusion: evaluate([run]),
  });
});

test("cert startup profile — 3 runs, no gameplay", async ({ page }) => {
  test.setTimeout(360_000);
  const runs: StartupRun[] = [];

  for (let i = 0; i < 3; i++) {
    runs.push(await runStartupProfile(page, i));
    const report: StartupReport = {
      at: new Date().toISOString(),
      runs,
      conclusion: evaluate(runs),
    };
    saveReport(report);
  }
});
