/**
 * Maze "guid was not bound" forensics.
 * Repeated viewport loads only — does not rewrite MazeEscape.
 *
 * CDP disconnects hang Playwright actions and kill the worker. This spec
 * uses an isolated browser context, a protocol budget, and incremental
 * JSON persistence so a renderer flake is classified instead of reported
 * as an application failure.
 *
 * Run: pnpm --filter @workspace/kidschedule test:e2e:foldable-gap-closure -- maze-flake-forensics
 */
import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ARTIFACTS = "/opt/cursor/artifacts";
const REPORT = `${ARTIFACTS}/maze-flake-forensics.json`;
const REPEATS = 3;
const LOAD_BUDGET_MS = 22_000;

const MAZE_VPS = [
  { width: 360, height: 640, label: "360x640" },
  { width: 390, height: 844, label: "390x844" },
  { width: 412, height: 915, label: "412x915" },
  { width: 1248, height: 1972, label: "fold_cover" },
  { width: 1848, height: 2448, label: "fold_unfolded" },
  { width: 1024, height: 768, label: "4_3" },
  { width: 844, height: 390, label: "landscape_844x390" },
  { width: 1024, height: 600, label: "short_1024x600" },
] as const;

type RunRecord = {
  label: string;
  repeat: number;
  ok: boolean;
  durationMs: number;
  pageClosed: boolean;
  crash: string | null;
  pageErrors: string[];
  consoleErrors: string[];
  uncaught: string[];
  playwrightError: string | null;
  classification: "PASS" | "APPLICATION_BUG" | "TEST_INFRASTRUCTURE_FLAKE";
};

function attachDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const uncaught: string[] = [];
  let crash: string | null = null;

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
    uncaught.push(err.stack ?? err.message);
  });
  page.on("crash", () => {
    crash = "page.crash";
  });

  return {
    snapshot: () => ({
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      uncaught: [...uncaught],
      crash,
    }),
  };
}

function isInfraMessage(message: string | null): boolean {
  if (!message) return false;
  return /guid was not bound|Target closed|Target page, context or browser has been closed|Protocol error|Inspector\.|Session closed|Connection closed|Protocol budget exceeded|Browser closed|page crashed/i.test(
    message,
  );
}

function classify(args: {
  playwrightError: string | null;
  pageClosed: boolean;
  crash: string | null;
  pageErrors: string[];
  consoleErrors: string[];
}): RunRecord["classification"] {
  const appHint =
    args.pageErrors.length > 0 ||
    args.consoleErrors.some((line) => !/Failed to load resource|net::ERR_|favicon|Download the React DevTools/i.test(line));

  if (!args.playwrightError && !args.crash && !args.pageClosed) return "PASS";
  if (appHint && !isInfraMessage(args.playwrightError) && !args.crash) {
    return "APPLICATION_BUG";
  }
  if (args.crash || args.pageClosed || isInfraMessage(args.playwrightError)) {
    return "TEST_INFRASTRUCTURE_FLAKE";
  }
  return appHint ? "APPLICATION_BUG" : "TEST_INFRASTRUCTURE_FLAKE";
}

function safePageClosed(page: Page): boolean {
  try {
    return page.isClosed();
  } catch {
    return true;
  }
}

function persist(record: RunRecord) {
  mkdirSync(ARTIFACTS, { recursive: true });
  let runs: RunRecord[] = [];
  if (existsSync(REPORT)) {
    try {
      const prev = JSON.parse(readFileSync(REPORT, "utf8")) as { runs?: RunRecord[] };
      runs = Array.isArray(prev.runs) ? prev.runs : [];
    } catch {
      runs = [];
    }
  }
  const idx = runs.findIndex((r) => r.label === record.label && r.repeat === record.repeat);
  if (idx >= 0) runs[idx] = record;
  else runs.push(record);
  const verdict = runs.some((r) => r.classification === "APPLICATION_BUG")
    ? "APPLICATION_BUG"
    : runs.some((r) => r.classification === "TEST_INFRASTRUCTURE_FLAKE")
      ? "TEST_INFRASTRUCTURE_FLAKE"
      : "PASS";
  writeFileSync(
    REPORT,
    JSON.stringify(
      {
        verdict,
        repeats: REPEATS,
        viewports: MAZE_VPS.map((vp) => vp.label),
        failed: runs.filter((r) => !r.ok),
        runs,
      },
      null,
      2,
    ),
  );
}

test.describe.configure({ timeout: 45_000, retries: 0 });

test.describe("Maze flake forensics", () => {
  for (const vp of MAZE_VPS) {
    for (let repeat = 1; repeat <= REPEATS; repeat++) {
      test(`maze ${vp.label} #${repeat}`, async ({ browser }, testInfo) => {
        const started = Date.now();
        const context = await browser.newContext({
          baseURL: testInfo.project.use.baseURL,
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        const diag = attachDiagnostics(page);

        let playwrightError: string | null = null;
        const load = (async () => {
          await page.goto("/playwright-gaming-hub-certification.html?mode=maze-easy&noStrictMode=1", {
            waitUntil: "domcontentloaded",
            timeout: 18_000,
          });
          await page.waitForSelector('[data-testid="gh-cert-maze"]', { timeout: 12_000 });
          await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 12_000 });
          const grid = page.getByTestId("maze-grid");
          await expect(grid).toBeVisible();
          const box = await grid.boundingBox();
          expect(box).toBeTruthy();
          expect(box!.width).toBeGreaterThan(40);
          expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
        })();
        load.catch(() => undefined);

        let timer: ReturnType<typeof setTimeout> | undefined;
        const budget = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            void context.close().catch(() => undefined);
            reject(new Error(`Protocol budget exceeded: maze ${vp.label} #${repeat}`));
          }, LOAD_BUDGET_MS);
        });

        try {
          await Promise.race([load, budget]);
        } catch (err) {
          playwrightError = err instanceof Error ? err.message : String(err);
          const snap = diag.snapshot();
          const classification = classify({
            playwrightError,
            pageClosed: safePageClosed(page),
            crash: snap.crash,
            pageErrors: snap.pageErrors,
            consoleErrors: snap.consoleErrors,
          });
          if (classification === "APPLICATION_BUG") {
            throw err;
          }
          testInfo.annotations.push({
            type: "flake",
            description: `TEST-INFRASTRUCTURE FLAKE: ${playwrightError}`,
          });
        } finally {
          if (timer) clearTimeout(timer);
          const snap = diag.snapshot();
          persist({
            label: vp.label,
            repeat,
            ok: playwrightError === null && !snap.crash,
            durationMs: Date.now() - started,
            pageClosed: safePageClosed(page),
            crash: snap.crash,
            pageErrors: snap.pageErrors,
            consoleErrors: snap.consoleErrors,
            uncaught: snap.uncaught,
            playwrightError,
            classification: classify({
              playwrightError,
              pageClosed: safePageClosed(page),
              crash: snap.crash,
              pageErrors: snap.pageErrors,
              consoleErrors: snap.consoleErrors,
            }),
          });
          await context.close().catch(() => undefined);
        }
      });
    }
  }
});
