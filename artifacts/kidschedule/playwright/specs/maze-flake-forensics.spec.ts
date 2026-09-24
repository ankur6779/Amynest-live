/**
 * Maze "guid was not bound" forensics.
 * Repeated viewport loads only — does not rewrite MazeEscape.
 *
 * Run: pnpm --filter @workspace/kidschedule test:e2e:foldable-gap-closure -- maze-flake-forensics
 */
import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const ARTIFACTS = "/opt/cursor/artifacts";
const REPEATS = 3;

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

const runs: RunRecord[] = [];

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

function classify(args: {
  playwrightError: string | null;
  pageClosed: boolean;
  crash: string | null;
  pageErrors: string[];
  consoleErrors: string[];
}): RunRecord["classification"] {
  const infraHint =
    /guid was not bound|Target closed|Target page, context or browser has been closed|Protocol error|Inspector\.|Session closed|Connection closed/i;
  const appHint =
    args.pageErrors.length > 0 ||
    args.consoleErrors.some((line) => !/Failed to load resource|net::ERR_|favicon|Download the React DevTools/i.test(line));

  if (!args.playwrightError && !args.crash && !args.pageClosed) return "PASS";
  if (appHint && !infraHint.test(args.playwrightError ?? "") && !args.crash) {
    return "APPLICATION_BUG";
  }
  if (args.crash || args.pageClosed || infraHint.test(args.playwrightError ?? "")) {
    return "TEST_INFRASTRUCTURE_FLAKE";
  }
  return appHint ? "APPLICATION_BUG" : "TEST_INFRASTRUCTURE_FLAKE";
}

test.describe.configure({ timeout: 60_000, retries: 0 });

test.describe("Maze flake forensics", () => {
  for (const vp of MAZE_VPS) {
    for (let repeat = 1; repeat <= REPEATS; repeat++) {
      test(`maze ${vp.label} #${repeat}`, async ({ page }) => {
        const started = Date.now();
        const diag = attachDiagnostics(page);
        await page.setViewportSize({ width: vp.width, height: vp.height });

        let playwrightError: string | null = null;
        try {
          await page.goto("/playwright-gaming-hub-certification.html?mode=maze-easy&noStrictMode=1", {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          });
          await page.waitForSelector('[data-testid="gh-cert-maze"]', { timeout: 20_000 });
          await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 20_000 });
          const grid = page.getByTestId("maze-grid");
          await expect(grid).toBeVisible();
          const box = await grid.boundingBox();
          expect(box).toBeTruthy();
          expect(box!.width).toBeGreaterThan(40);
          expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
        } catch (err) {
          playwrightError = err instanceof Error ? err.message : String(err);
          throw err;
        } finally {
          const snap = diag.snapshot();
          const record: RunRecord = {
            label: vp.label,
            repeat,
            ok: playwrightError === null && !snap.crash,
            durationMs: Date.now() - started,
            pageClosed: page.isClosed(),
            crash: snap.crash,
            pageErrors: snap.pageErrors,
            consoleErrors: snap.consoleErrors,
            uncaught: snap.uncaught,
            playwrightError,
            classification: classify({
              playwrightError,
              pageClosed: page.isClosed(),
              crash: snap.crash,
              pageErrors: snap.pageErrors,
              consoleErrors: snap.consoleErrors,
            }),
          };
          runs.push(record);
        }
      });
    }
  }

  test.afterAll(() => {
    mkdirSync(ARTIFACTS, { recursive: true });
    const verdict = runs.some((r) => r.classification === "APPLICATION_BUG")
      ? "APPLICATION_BUG"
      : runs.some((r) => r.classification === "TEST_INFRASTRUCTURE_FLAKE")
        ? "TEST_INFRASTRUCTURE_FLAKE"
        : "PASS";
    writeFileSync(
      `${ARTIFACTS}/maze-flake-forensics.json`,
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
  });
});
