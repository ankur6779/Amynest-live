import { recordBootError } from "@/lib/boot-store";

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

  window.addEventListener("error", (event) => {
    const msg = event.message || "Script error";
    const detail = [
      event.filename,
      event.lineno != null ? `line ${event.lineno}` : "",
      event.error ? formatUnknown(event.error) : "",
    ]
      .filter(Boolean)
      .join(" | ");
    console.error(`${TAG} window.onerror`, msg, detail || "");
    recordError("window.onerror", msg, detail);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = formatUnknown(event.reason);
    console.error(`${TAG} unhandledrejection`, msg);
    recordError("unhandledrejection", msg);
  });

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(`${TAG} console.error`, ...args);
    const message = args.map((a) => formatUnknown(a)).join(" ");
    recordError("console.error", message);
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
