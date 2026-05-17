type AppFallbackUiProps = {
  title?: string;
  message?: string;
  reloading?: boolean;
  onReload?: () => void;
};

/** Never leave users on a blank screen — use for boot, auth, and fatal errors. */
export function AppFallbackUi({
  title = "Something went wrong",
  message = "AmyNest hit a problem loading. Try refreshing the page.",
  reloading = false,
  onReload,
}: AppFallbackUiProps) {
  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
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
        <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, opacity: 0.85 }}>
          {reloading ? "Clearing cache and reloading…" : message}
        </p>
        {onReload && (
          <button
            type="button"
            disabled={reloading}
            onClick={onReload}
            style={{
              padding: "14px 28px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(90deg, #7c3aed, #ec4899)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: reloading ? "wait" : "pointer",
            }}
          >
            {reloading ? "Reloading…" : "Reload AmyNest"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Imperative fallback when React cannot mount. */
export function renderCriticalFallbackHtml(
  root: HTMLElement,
  message = "AmyNest could not start. Please refresh the page.",
): void {
  const safe = message.replace(/</g, "&lt;");
  root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a061a;color:#f0e8ff;font-family:system-ui,sans-serif;text-align:center"><div><p style="font-weight:600;margin:0 0 12px;font-size:18px">Something went wrong</p><p style="opacity:0.85;margin:0 0 16px;font-size:14px;line-height:1.5">${safe}</p><button type="button" onclick="location.reload()" style="padding:12px 24px;border-radius:999px;border:none;background:linear-gradient(90deg,#7c3aed,#ec4899);color:#fff;font-weight:600;cursor:pointer">Reload</button></div></div>`;
}
