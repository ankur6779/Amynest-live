/**
 * Pre-React production crash screen — writes directly to the DOM so errors
 * are visible even when React never mounts, chunk recovery reloads, or the
 * splash screen is still covering the page.
 */

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
  at?: string;
};

const OVERLAY_ID = "amynest-crash-overlay";
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

/** Show full-screen crash overlay — safe to call before React boots. */
export function showProductionCrashOverlay(payload: ProductionCrashPayload | string | unknown): void {
  if (typeof document === "undefined") return;

  dismissSplash();

  const bodyText = formatPayload(payload);

  persistLastCrash(payload);

  try {
    const w = window as Window & {
      __amynestLastCrash?: ProductionCrashPayload | string;
      __amynestShowCrashOverlay?: typeof showProductionCrashOverlay;
    };
    w.__amynestLastCrash = typeof payload === "string" ? payload : (payload as ProductionCrashPayload);
    w.__amynestShowCrashOverlay = showProductionCrashOverlay;
  } catch {
    /* ignore */
  }

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
      at: new Date().toISOString(),
      href: typeof window !== "undefined" ? window.location.href : undefined,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      ...extra,
    };
  }
  return {
    kind,
    message: String(err ?? "unknown error"),
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
    showProductionCrashOverlay(
      payloadFromError(event.error ?? event.message, "window.error", {
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        detail: event.message,
      }),
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
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
    at: new Date().toISOString(),
    href: typeof window !== "undefined" ? window.location.href : undefined,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}
