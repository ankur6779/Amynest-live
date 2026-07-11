import { patchBootDiagnostics, recordBootError } from "@/lib/boot-store";
import {
  installCrashLoggerHandlers,
  logError as logCrashError,
  setNativeConsoleError,
} from "@/lib/crash-logger";
import { installProductionCrashOverlay } from "@/lib/production-crash-overlay";
import { isBenignRuntimeError } from "@/lib/runtime-crash-policy";
import { trackStartupFunnelFailure } from "@/lib/startup-funnel";

const TAG = "[amynest:boot]";

type ErrorEntry = {
  ts: number;
  source: string;
  message: string;
  detail?: string;
};

const recentErrors: ErrorEntry[] = [];
const MAX_ERRORS = 20;

function recordError(source: string, message: string, detail?: string): void {
  const entry = { ts: Date.now(), source, message, detail };
  recentErrors.push(entry);
  if (recentErrors.length > MAX_ERRORS) recentErrors.shift();
  recordBootError(source, new Error(detail ? `${message} | ${detail}` : message));
  try {
    (window as Window & { __amynestRecentErrors?: ErrorEntry[] }).__amynestRecentErrors =
      recentErrors;
  } catch {
    /* ignore */
  }
}

function formatUnknown(err: unknown): string {
  if (err instanceof Error) return `${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  return String(err ?? "unknown");
}

let installed = false;

/** Install before React mounts — logs all critical runtime failures. */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  installCrashLoggerHandlers();
  installProductionCrashOverlay();

  window.addEventListener("error", (event) => {
    const err = event.error ?? event.message;
    if (isBenignRuntimeError(err)) {
      event.preventDefault();
      return;
    }
    const msg = event.message || "Script error";
    const detail = [
      event.filename,
      event.lineno != null ? `line ${event.lineno}` : "",
      event.error ? formatUnknown(event.error) : "",
    ]
      .filter(Boolean)
      .join(" | ");
    logCrashError(err, `boot:${detail}`);
    recordError("window.onerror", msg, detail);
    trackStartupFunnelFailure("javascript_exception", event.error ?? msg, {
      failureFile: event.filename,
      failureLine: event.lineno ?? undefined,
    });
    event.preventDefault();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignRuntimeError(event.reason)) {
      event.preventDefault();
      return;
    }
    const msg = formatUnknown(event.reason);
    logCrashError(event.reason, "boot:unhandledrejection");
    recordError("unhandledrejection", msg);
    trackStartupFunnelFailure("javascript_exception", event.reason ?? msg);
    event.preventDefault();
  });

  const originalError = console.error.bind(console);
  setNativeConsoleError(originalError);

  let recordingConsoleError = false;
  console.error = (...args: unknown[]) => {
    originalError(...args);
    if (recordingConsoleError) return;
    recordingConsoleError = true;
    try {
      const message = args.map((a) => formatUnknown(a)).join(" ");
      const entry = { ts: Date.now(), source: "console.error", message, detail: undefined };
      recentErrors.push(entry);
      if (recentErrors.length > MAX_ERRORS) recentErrors.shift();
      try {
        (window as Window & { __amynestRecentErrors?: ErrorEntry[] }).__amynestRecentErrors =
          recentErrors;
      } catch {
        /* ignore */
      }
      patchBootDiagnostics({
        lastError: `console.error: ${message.slice(0, 500)}`,
      });
    } finally {
      recordingConsoleError = false;
    }
  };

  (window as Window & { __amynestGetRecentErrors?: () => ErrorEntry[] }).__amynestGetRecentErrors =
    () => [...recentErrors];

  console.info(`${TAG} Global error handlers installed`);
}

export function logBootContext(): void {
  if (typeof window === "undefined") return;
  console.info(`${TAG} Boot context`, {
    hostname: window.location.hostname,
    origin: window.location.origin,
    pathname: window.location.pathname,
    href: window.location.href,
    userAgent: navigator.userAgent,
    displayMode:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)").matches
          ? "standalone-pwa"
          : "browser"
        : "unknown",
  });
}
