/**
 * Pre-React production crash screen — writes directly to the DOM so errors
 * are visible even when React never mounts, chunk recovery reloads, or the
 * splash screen is still covering the page.
 */

import {
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { generateErrorReferenceId } from "@/lib/crash-report";
import { canAttemptAutoRecovery, navigateToSafeRoute } from "@/lib/crash-recovery";
import {
  isBenignRuntimeError,
  isInfiniteRenderError,
  shouldShowProductionCrashOverlay,
} from "@/lib/runtime-crash-policy";

export type ProductionCrashPayload = {
  kind: string;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  col?: number;
  href?: string;
  route?: string;
  detail?: string;
  errorId?: string;
  at?: string;
};

const OVERLAY_ID = "amynest-crash-overlay";
const SAFE_OVERLAY_ID = "amynest-safe-recovery-overlay";
const LAST_CRASH_KEY = "__amynest_last_crash_v1";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dismissSplash(): void {
  try {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      window.setTimeout(() => splash.remove(), 200);
    }
  } catch {
    /* best-effort */
  }
}

function homePath(): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/dashboard`.replace(/\/{2,}/g, "/");
}

function silentLogCrash(payload: ProductionCrashPayload): void {
  void import("@/lib/crash-report").then(({ reportCrash }) =>
    reportCrash({
      kind: payload.kind,
      message: payload.message,
      stack: payload.stack,
      component: payload.detail,
      errorId: payload.errorId,
      meta: {
        source: payload.source,
        line: payload.line,
        col: payload.col,
        href: payload.href,
        route: payload.route,
      },
    }),
  );
}

/** User-safe full-screen recovery — no stack traces or internal details. */
export function showUserSafeRecoveryOverlay(options?: {
  message?: string;
  errorReferenceId?: string;
  showActions?: boolean;
}): void {
  if (typeof document === "undefined") return;
  dismissSplash();

  const message =
    options?.message ??
    "We're having trouble loading this screen.\nPlease try again.";
  const errorId = options?.errorReferenceId;
  const showActions = options?.showActions ?? true;

  let el = document.getElementById(SAFE_OVERLAY_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = SAFE_OVERLAY_ID;
    el.setAttribute("role", "alert");
    el.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:linear-gradient(175deg,#0a061a 0%,#120a2e 55%,#050010 100%)",
      "color:#f0e8ff",
      "font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      "text-align:center",
    ].join(";");
    (document.body ?? document.documentElement).appendChild(el);
  }

  const safeMessage = escapeHtml(message).replace(/\\n/g, "<br>");
  const refHtml = errorId
    ? `<p style="margin:20px 0 0;font-size:12px;opacity:0.55;font-family:ui-monospace,monospace">Reference: ${escapeHtml(errorId)}</p>`
    : "";
  const actionsHtml = showActions
    ? `<div style="display:flex;flex-direction:column;gap:12px;align-items:center;margin-top:20px">` +
      `<button type="button" id="amynest-safe-retry" style="padding:14px 28px;border-radius:999px;border:none;background:linear-gradient(90deg,#7c3aed,#ec4899);color:#fff;font-weight:600;cursor:pointer;min-width:200px;font-size:16px">Try Again</button>` +
      `<button type="button" id="amynest-safe-home" style="padding:14px 28px;border-radius:999px;border:1px solid rgba(233,213,255,0.35);background:transparent;color:#e9d5ff;font-weight:600;cursor:pointer;min-width:200px;font-size:16px">Go Home</button>` +
      `</div>`
    : `<p style="margin:12px 0 0;opacity:0.85;font-size:14px">Please wait a moment.</p>`;

  el.innerHTML =
    '<div style="max-width:420px">' +
    `<p style="margin:0 0 8px;font-size:22px;font-weight:700">Something went wrong</p>` +
    `<p style="margin:0;opacity:0.85;font-size:15px;line-height:1.55">${safeMessage}</p>` +
    actionsHtml +
    refHtml +
    "</div>";

  if (showActions) {
    document.getElementById("amynest-safe-retry")?.addEventListener("click", () => {
      location.reload();
    });
    document.getElementById("amynest-safe-home")?.addEventListener("click", () => {
      const target = homePath();
      if (location.pathname === target || location.pathname.endsWith("/dashboard")) {
        location.reload();
      } else {
        location.assign(target);
      }
    });
  }
}

function formatPayload(payload: ProductionCrashPayload | string | unknown): string {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && "message" in payload) {
    return JSON.stringify(
      {
        ...(payload as ProductionCrashPayload),
        at: (payload as ProductionCrashPayload).at ?? new Date().toISOString(),
        href:
          (payload as ProductionCrashPayload).href ??
          (typeof window !== "undefined" ? window.location.href : undefined),
        route:
          (payload as ProductionCrashPayload).route ??
          (typeof window !== "undefined" ? window.location.pathname : undefined),
      },
      null,
      2,
    );
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload ?? "unknown crash");
  }
}

function persistLastCrash(payload: ProductionCrashPayload | string | unknown): void {
  try {
    const entry = {
      savedAt: Date.now(),
      href: typeof window !== "undefined" ? window.location.href : undefined,
      payload,
    };
    localStorage.setItem(LAST_CRASH_KEY, JSON.stringify(entry));
  } catch {
    /* storage may be blocked */
  }
}

export function readPersistedLastCrash(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_CRASH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function errFromPayload(payload: ProductionCrashPayload | string | unknown): unknown {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && "message" in payload) {
    return new Error(String((payload as ProductionCrashPayload).message));
  }
  return payload;
}

function normalizePayload(
  payload: ProductionCrashPayload | string | unknown,
): ProductionCrashPayload {
  if (typeof payload === "string") {
    return {
      kind: "unknown",
      message: payload,
      errorId: generateErrorReferenceId(),
      at: new Date().toISOString(),
    };
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const p = payload as ProductionCrashPayload;
    return {
      ...p,
      errorId: p.errorId ?? generateErrorReferenceId(),
      at: p.at ?? new Date().toISOString(),
      href: p.href ?? (typeof window !== "undefined" ? window.location.href : undefined),
      route: p.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    };
  }
  return {
    kind: "unknown",
    message: String(payload ?? "unknown error"),
    errorId: generateErrorReferenceId(),
    at: new Date().toISOString(),
  };
}

/** Full-screen crash overlay — safe to call before React boots. */
export function showProductionCrashOverlay(payload: ProductionCrashPayload | string | unknown): void {
  if (typeof document === "undefined") return;

  const normalized = normalizePayload(payload);
  const kind = normalized.kind;
  const err = errFromPayload(normalized);
  const showDebugOverlay = shouldShowProductionCrashOverlay(err, kind);

  persistLastCrash(normalized);
  silentLogCrash(normalized);

  if (isInfiniteRenderError(err)) {
    if (canAttemptAutoRecovery()) {
      navigateToSafeRoute();
    } else {
      showUserSafeRecoveryOverlay({
        errorReferenceId: normalized.errorId,
        showActions: true,
      });
    }
    return;
  }

  if (!showDebugOverlay) {
    const willAutoRecover =
      canAttemptAutoRecovery() && shouldAttemptAutoRecovery(err) && tryAutoRecovery(kind);
    showUserSafeRecoveryOverlay({
      errorReferenceId: normalized.errorId,
      showActions: !willAutoRecover,
    });
    return;
  }

  try {
    const w = window as Window & {
      __amynestDiagOnly?: boolean;
      __amynestLastCrash?: ProductionCrashPayload | string;
      __amynestShowCrashOverlay?: typeof showProductionCrashOverlay;
      __amynestRefreshDiagPanel?: () => void;
    };
    w.__amynestLastCrash = normalized;
    w.__amynestShowCrashOverlay = showProductionCrashOverlay;
    if (w.__amynestDiagOnly) {
      w.__amynestRefreshDiagPanel?.();
      return;
    }
  } catch {
    /* ignore */
  }

  dismissSplash();

  const bodyText = formatPayload(normalized);

  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.setAttribute("role", "alert");
    el.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "background:#000",
      "color:#0f0",
      "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
      "padding:20px",
      "margin:0",
      "overflow:auto",
      "white-space:pre-wrap",
      "word-break:break-word",
      "-webkit-overflow-scrolling:touch",
    ].join(";");
    (document.body ?? document.documentElement).appendChild(el);
  }

  el.innerHTML =
    '<h2 style="color:#f55;margin:0 0 12px;font-size:16px">🔥 APP CRASH DETECTED</h2>' +
    '<p style="color:#9f9;margin:0 0 10px">Screenshot this screen and share crash.message + crash.stack.</p>' +
    `<pre style="margin:0">${escapeHtml(bodyText)}</pre>`;
}

function payloadFromError(err: unknown, kind: string, extra?: Partial<ProductionCrashPayload>): ProductionCrashPayload {
  if (err instanceof Error) {
    return {
      kind,
      message: err.message,
      stack: err.stack,
      errorId: generateErrorReferenceId(),
      at: new Date().toISOString(),
      href: typeof window !== "undefined" ? window.location.href : undefined,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      ...extra,
    };
  }
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message?: string; stack?: string };
    return {
      kind,
      message: e.message ?? String(err),
      stack: e.stack,
      errorId: generateErrorReferenceId(),
      at: new Date().toISOString(),
      href: typeof window !== "undefined" ? window.location.href : undefined,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      ...extra,
    };
  }
  return {
    kind,
    message: String(err ?? "unknown error"),
    errorId: generateErrorReferenceId(),
    at: new Date().toISOString(),
    href: typeof window !== "undefined" ? window.location.href : undefined,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...extra,
  };
}

let installed = false;

/** Idempotent — installs DOM overlay hooks before React mounts. */
export function installProductionCrashOverlay(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const w = window as Window & {
    __amynestShowCrashOverlay?: typeof showProductionCrashOverlay;
  };
  w.__amynestShowCrashOverlay = showProductionCrashOverlay;

  window.addEventListener("error", (event) => {
    const err = event.error ?? event.message;
    if (isBenignRuntimeError(err)) {
      event.preventDefault();
      return;
    }
    showProductionCrashOverlay(
      payloadFromError(err, "window.error", {
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        detail: event.message,
      }),
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignRuntimeError(event.reason)) {
      event.preventDefault();
      return;
    }
    showProductionCrashOverlay(payloadFromError(event.reason, "unhandledrejection"));
  });
}

export function showReactCrashOverlay(error: Error, label?: string, componentStack?: string): void {
  showProductionCrashOverlay({
    kind: "react.render",
    message: error.message,
    stack: [error.stack, componentStack ? `--- React component stack ---\n${componentStack}` : ""]
      .filter(Boolean)
      .join("\n"),
    detail: label,
    errorId: generateErrorReferenceId(),
    at: new Date().toISOString(),
    href: typeof window !== "undefined" ? window.location.href : undefined,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}
