// Crash reporter — global error catching + persistent crash log.
//
// What this does:
//  1. Hooks into React Native's ErrorUtils.setGlobalHandler so ALL uncaught JS
//     errors (fatal & non-fatal) are captured, even before a screen renders.
//  2. Attaches an unhandledrejection listener for unhandled Promise rejections.
//  3. Stores the last MAX_ENTRIES crashes in AsyncStorage so the DebugPanel
//     "Crashes" tab can surface them even after a restart.
//  4. Exposes captureException / captureMessage / addBreadcrumb / setUser for
//     in-app call-sites (same surface as before — zero refactor required).
//
// To enable a real backend (Sentry, Bugsnag, etc.) once the app ships to
// production, swap the stubs below. The EXPO_PUBLIC_SENTRY_DSN convention is
// documented in the comments. All existing call-sites remain unchanged.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Constants ──────────────────────────────────────────────────────────────────

const CRASH_LOG_KEY = "@amynest_crash_log";
const MAX_ENTRIES   = 30;

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = "debug" | "info" | "warning" | "error" | "fatal";

export interface CrashEntry {
  id:        string;
  message:   string;
  stack:     string;
  context:   Record<string, unknown>;
  timestamp: string;
  isFatal:   boolean;
}

// ── In-memory ring buffer ──────────────────────────────────────────────────────

let crashLog: CrashEntry[] = [];
let initialized = false;

// ── AsyncStorage helpers ───────────────────────────────────────────────────────

async function loadCrashLog(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    if (raw) crashLog = JSON.parse(raw) as CrashEntry[];
  } catch {
    crashLog = [];
  }
}

async function persistCrashLog(): Promise<void> {
  try {
    await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(crashLog));
  } catch {
    // Storage full or unavailable — silently drop.
  }
}

function addEntry(entry: Omit<CrashEntry, "id" | "timestamp">): void {
  const full: CrashEntry = {
    ...entry,
    id:        Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
  };
  crashLog = [full, ...crashLog].slice(0, MAX_ENTRIES);
  void persistCrashLog();
}

// ── Public read/clear API (used by DebugPanel) ────────────────────────────────

export function getCrashLog(): ReadonlyArray<CrashEntry> {
  return crashLog;
}

export async function clearCrashLog(): Promise<void> {
  crashLog = [];
  await AsyncStorage.removeItem(CRASH_LOG_KEY);
}

// ── Normalise an unknown thrown value into a string ────────────────────────────

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function toStack(err: unknown): string {
  if (err instanceof Error && err.stack) return err.stack;
  return "";
}

// ── Global error handler ───────────────────────────────────────────────────────

function installGlobalHandler(): void {
  // React Native exposes ErrorUtils as a global (not an import).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EU = (global as any).ErrorUtils;
  if (!EU) return;

  const prev: ((error: Error, isFatal?: boolean) => void) | null =
    typeof EU.getGlobalHandler === "function" ? EU.getGlobalHandler() : null;

  EU.setGlobalHandler((error: Error, isFatal?: boolean) => {
    addEntry({
      message: error?.message ?? String(error),
      stack:   error?.stack   ?? "",
      context: { isFatal: !!isFatal },
      isFatal: !!isFatal,
    });

    // Always forward to the previous handler so the red box still appears in
    // __DEV__ and Expo's crash reporter (if any) remains operational.
    if (typeof prev === "function") prev(error, isFatal);
  });
}

// ── Unhandled promise rejection ────────────────────────────────────────────────

function installRejectionHandler(): void {
  // React Native polyfills this on the JS global since RN 0.65.
  // It is typed as `any` because the types differ between environments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = global as any;
  const prev = g.onunhandledrejection ?? null;

  g.onunhandledrejection = (event: { reason?: unknown }) => {
    const reason = event?.reason;
    addEntry({
      message: `Unhandled rejection: ${toMessage(reason)}`,
      stack:   toStack(reason),
      context: {},
      isFatal: false,
    });
    if (typeof prev === "function") prev(event);
  };
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initCrashReporter(): void {
  if (initialized) return;
  initialized = true;

  void loadCrashLog();
  installGlobalHandler();
  installRejectionHandler();

  // Future: enable Sentry once EXPO_PUBLIC_SENTRY_DSN is set.
  // if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  //   Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, ... });
  // }
}

// ── Public capture API ─────────────────────────────────────────────────────────

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const entry = {
    message: toMessage(err),
    stack:   toStack(err),
    context: context ?? {},
    isFatal: false,
  };
  addEntry(entry);

  if (__DEV__) {
    if (context) console.error("[crash]", err, context);
    else         console.error("[crash]", err);
  }
}

export function captureMessage(message: string, severity: Severity = "info"): void {
  if (severity === "error" || severity === "fatal" || severity === "warning") {
    addEntry({ message, stack: "", context: { severity }, isFatal: severity === "fatal" });
  }
  if (__DEV__) console.log(`[crash:${severity}]`, message);
}

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!__DEV__) return;
  if (data) console.log(`[breadcrumb:${category}]`, message, data);
  else      console.log(`[breadcrumb:${category}]`, message);
}

export function setUser(user: { id?: string; email?: string } | null): void {
  // No-op until Sentry is wired up. Kept for API surface parity.
  void user;
}
