import type { CSSProperties } from "react";

type AppFallbackUiProps = {
  title?: string;
  message?: string;
  reloading?: boolean;
  errorReferenceId?: string;
  onReload?: () => void;
  onTryAgain?: () => void;
  onGoHome?: () => void;
};

const BTN_STYLE: CSSProperties = {
  padding: "14px 28px",
  borderRadius: 999,
  border: "none",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

/** Never leave users on a blank screen — use for boot, auth, and fatal errors. */
export function AppFallbackUi({
  title = "Something went wrong",
  message = "We're having trouble loading this screen.\nPlease try again.",
  reloading = false,
  errorReferenceId,
  onReload,
  onTryAgain,
  onGoHome,
}: AppFallbackUiProps) {
  const displayMessage = reloading
    ? "Clearing cache and reloading…"
    : message.replace(/\\n/g, "\n");

  const primaryAction = onTryAgain ?? onReload;
  const showSecondary = Boolean(onGoHome);

  return (
    <div
      role="alert"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        color: "#f0e8ff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700 }}>
          {reloading ? "Refreshing AmyNest…" : title}
        </h1>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            lineHeight: 1.55,
            opacity: 0.85,
            whiteSpace: "pre-line",
          }}
        >
          {displayMessage}
        </p>
        {!reloading && (primaryAction || onGoHome) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
            }}
          >
            {primaryAction && (
              <button
                type="button"
                disabled={reloading}
                onClick={primaryAction}
                style={{
                  ...BTN_STYLE,
                  background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                  color: "#fff",
                  cursor: reloading ? "wait" : "pointer",
                  minWidth: 200,
                }}
              >
                Try Again
              </button>
            )}
            {showSecondary && onGoHome && (
              <button
                type="button"
                disabled={reloading}
                onClick={onGoHome}
                style={{
                  ...BTN_STYLE,
                  background: "transparent",
                  color: "#e9d5ff",
                  border: "1px solid rgba(233, 213, 255, 0.35)",
                  minWidth: 200,
                }}
              >
                Go Home
              </button>
            )}
          </div>
        )}
        {errorReferenceId && !reloading && (
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 12,
              opacity: 0.55,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            Reference: {errorReferenceId}
          </p>
        )}
      </div>
    </div>
  );
}

/** Imperative fallback when React cannot mount. */
export function renderCriticalFallbackHtml(
  root: HTMLElement,
  options?: {
    message?: string;
    errorReferenceId?: string;
  },
): void {
  const message =
    options?.message ??
    "We're having trouble loading this screen.\nPlease try again.";
  const safe = message.replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const refHtml = options?.errorReferenceId
    ? `<p style="margin:16px 0 0;font-size:12px;opacity:0.55;font-family:ui-monospace,monospace">Reference: ${options.errorReferenceId.replace(/</g, "&lt;")}</p>`
    : "";
  const base = (typeof window !== "undefined" ? (import.meta.env.BASE_URL ?? "/") : "/")
    .replace(/\/$/, "");
  const homePath = `${base}/dashboard`.replace(/\/{2,}/g, "/");

  root.innerHTML =
    `<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(175deg,#0a061a 0%,#120a2e 55%,#050010 100%);color:#f0e8ff;font-family:system-ui,sans-serif;text-align:center">` +
    `<div style="max-width:420px">` +
    `<p style="font-weight:700;margin:0 0 12px;font-size:22px">Something went wrong</p>` +
    `<p style="opacity:0.85;margin:0 0 20px;font-size:15px;line-height:1.55">${safe}</p>` +
    `<div style="display:flex;flex-direction:column;gap:12px;align-items:center">` +
    `<button type="button" onclick="location.reload()" style="padding:14px 28px;border-radius:999px;border:none;background:linear-gradient(90deg,#7c3aed,#ec4899);color:#fff;font-weight:600;cursor:pointer;min-width:200px;font-size:16px">Try Again</button>` +
    `<button type="button" onclick="location.assign('${homePath}')" style="padding:14px 28px;border-radius:999px;border:1px solid rgba(233,213,255,0.35);background:transparent;color:#e9d5ff;font-weight:600;cursor:pointer;min-width:200px;font-size:16px">Go Home</button>` +
    `</div>${refHtml}</div></div>`;
}
