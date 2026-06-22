/**
 * Full-app route certification — signed-in traversal of major protected routes.
 *
 * Run (production):
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.full-app-cert.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { dismissCountryPromptIfVisible, signInWithEmail } from "../helpers/auth";

const OUT_DIR = join(process.cwd(), "playwright", "full-app-cert-artifacts");
const REPORT_PATH = join(OUT_DIR, "report.json");

/** Major protected surfaces — excludes admin/dev and deep dynamic slugs. */
const ROUTES = [
  "/dashboard",
  "/parenting-hub",
  "/audio-lessons",
  "/amy-coach",
  "/speech-coach",
  "/phonics",
  "/routines",
  "/insights",
  "/progress",
  "/games",
  "/nutrition",
  "/parent-profile",
  "/pricing",
  "/study",
  "/environment",
];

type RouteResult = {
  route: string;
  verdict: "PASS" | "FAIL";
  httpStatus: number | null;
  crashOverlay: number;
  notFound: number;
  consoleErrors: string[];
  pageErrors: string[];
  error: string | null;
};

function writeReport(results: RouteResult[], consoleErrors: string[]): void {
  const report = {
    validatedAt: new Date().toISOString(),
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in",
    routes: results,
    overall: results.every((r) => r.verdict === "PASS") ? "PASS" : "FAIL",
    consoleErrorSample: consoleErrors.slice(0, 20),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

test.describe("Full app certification", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("traverse major routes without crash, 404, or fatal console errors", async ({ page }) => {
    const globalConsoleErrors: string[] = [];
    const globalPageErrors: string[] = [];
    const results: RouteResult[] = [];

    page.on("pageerror", (err) => {
      if (globalPageErrors.length < 30) globalPageErrors.push(err.message.slice(0, 400));
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (
        text.includes("ResizeObserver") ||
        text.includes("Non-Error") ||
        text.includes("AbortError")
      ) {
        return;
      }
      if (globalConsoleErrors.length < 30) globalConsoleErrors.push(text.slice(0, 300));
    });

    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    for (const route of ROUTES) {
      const routeConsoleErrors: string[] = [];
      const routePageErrors: string[] = [];
      const onConsole = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (text.includes("ResizeObserver") || text.includes("AbortError")) return;
        routeConsoleErrors.push(text.slice(0, 200));
      };
      const onPageError = (err: Error) => {
        routePageErrors.push(err.message.slice(0, 200));
      };

      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      let httpStatus: number | null = null;
      let error: string | null = null;
      let crashOverlay = 0;
      let notFound = 0;

      try {
        const response = await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        httpStatus = response?.status() ?? null;
        await page.waitForTimeout(1_500);
        await dismissCountryPromptIfVisible(page);

        crashOverlay = await page.locator("#amynest-crash-overlay").count();
        notFound = await page.getByText(/404|page not found|route failed/i).count();

        expect(crashOverlay, `Crash overlay on ${route}`).toBe(0);
        expect(notFound, `404 UI on ${route}`).toBe(0);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }

      const pass = error == null && crashOverlay === 0 && notFound === 0;
      results.push({
        route,
        verdict: pass ? "PASS" : "FAIL",
        httpStatus,
        crashOverlay,
        notFound,
        consoleErrors: routeConsoleErrors.slice(0, 5),
        pageErrors: routePageErrors.slice(0, 5),
        error,
      });
      writeReport(results, globalConsoleErrors);

      expect.soft(error, `${route} navigation`).toBeNull();
      expect.soft(crashOverlay, `Crash overlay on ${route}`).toBe(0);
    }

    expect(results.every((r) => r.verdict === "PASS")).toBe(true);
  });
});
