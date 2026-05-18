/**
 * Dev / QA stress utilities — exposed on `window.__amynestStress` when enabled.
 * Uses SPA navigation (popstate) instead of full reloads where possible.
 */

import { logError, getCrashCount, clearCrashLog, getCrashLog } from "@/lib/crash-logger";
import { startMemoryMonitor } from "@/lib/crash-logger";

export const STRESS_ROUTES = [
  "/dashboard",
  "/routines",
  "/routines/generate",
  "/amy-coach",
  "/parenting-hub",
  "/children",
  "/progress",
  "/insights",
  "/rewards",
  "/behavior",
  "/assistant",
  "/games",
  "/recipes",
  "/nutrition",
  "/parent-profile",
  "/pricing",
  "/environment",
  "/feedback",
  "/life-skills",
  "/study",
  "/audio-lessons",
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function basePath(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return base;
}

function navigateTo(route: string): void {
  const base = basePath();
  const path = route.startsWith("/") ? `${base}${route}` : route;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Random SPA navigation stress (default 50 cycles). */
export async function stressNavigate(n = 50): Promise<{ cycles: number; crashes: number }> {
  const startCrashes = getCrashCount();
  for (let i = 0; i < n; i++) {
    const route = STRESS_ROUTES[Math.floor(Math.random() * STRESS_ROUTES.length)]!;
    try {
      console.info("[amynest:stress] Navigating to:", route);
      navigateTo(route);
      await sleep(800);
    } catch (e) {
      logError(e, `stress-nav:${route}`);
    }
  }
  return { cycles: n, crashes: getCrashCount() - startCrashes };
}

/** Rapid click stress on a CSS selector. */
export function spamClicks(selector: string, times = 20): number {
  const el = document.querySelector(selector);
  if (!el || !(el instanceof HTMLElement)) {
    console.warn("[amynest:stress] spamClicks: element not found:", selector);
    return 0;
  }
  let fired = 0;
  for (let i = 0; i < times; i++) {
    try {
      el.click();
      fired++;
    } catch (e) {
      logError(e, `click-stress:${selector}`);
    }
  }
  return fired;
}

export type StressReport = {
  crashCount: number;
  crashes: ReturnType<typeof getCrashLog>;
};

export async function runFullStressSuite(options?: {
  navCycles?: number;
  menuClicks?: number;
}): Promise<StressReport> {
  clearCrashLog();
  const stopMemory = startMemoryMonitor(5000);
  const navCycles = options?.navCycles ?? 30;
  await stressNavigate(navCycles);
  spamClicks('[data-testid="button-mobile-menu"]', options?.menuClicks ?? 15);
  spamClicks('[data-testid="dashboard-generate-routine-btn"]', 10);
  stopMemory();
  return {
    crashCount: getCrashCount(),
    crashes: getCrashLog(),
  };
}

export type AmynestStressApi = {
  routes: readonly string[];
  stressNavigate: typeof stressNavigate;
  spamClicks: typeof spamClicks;
  runFullStressSuite: typeof runFullStressSuite;
  getCrashLog: typeof getCrashLog;
  clearCrashLog: typeof clearCrashLog;
};

declare global {
  interface Window {
    __amynestStress?: AmynestStressApi;
  }
}

export function installStressHarness(): void {
  if (typeof window === "undefined") return;
  window.__amynestStress = {
    routes: STRESS_ROUTES,
    stressNavigate,
    spamClicks,
    runFullStressSuite,
    getCrashLog,
    clearCrashLog,
  };
  console.info(
    "[amynest:stress] Harness ready — run await __amynestStress.runFullStressSuite()",
  );
}
