import { Component, type ErrorInfo, type ReactNode } from "react";

const RECOVERY_TS_KEY = "amynest:react-instance-recovery:ts";
const RECOVERY_COUNT_KEY = "amynest:react-instance-recovery:count";

const RECOVERY_WINDOW_MS = 30_000;
// Cap at 1 so that Safari never sees the "A problem repeatedly occurred"
// overlay (Safari shows this after ≥3 consecutive page failures). With 1
// recovery attempt: first crash → reload once → if it crashes again the
// error screen is shown manually instead of another location.replace().
const MAX_RECOVERIES_IN_WINDOW = 1;

function isReactInstanceCrash(err: unknown): boolean {
  if (!err) return false;
  const message =
    err instanceof Error
      ? `${err.message}\n${err.stack ?? ""}`
      : String(err);
  if (!message) return false;
  return (
    message.includes("Cannot read properties of null (reading 'useState')") ||
    message.includes("Cannot read properties of null (reading 'useEffect')") ||
    message.includes("Cannot read properties of null (reading 'useContext')") ||
    message.includes("Cannot read properties of null (reading 'useReducer')") ||
    message.includes("Cannot read property 'useState' of null") ||
    message.includes("more than one copy of React in the same app") ||
    message.includes("Invalid hook call")
  );
}

async function clearAllCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    /* ignore */
  }
}

let reloadInFlight = false;

function tryHardReload(): boolean {
  if (typeof window === "undefined") return false;
  if (reloadInFlight) return true;

  const now = Date.now();
  let lastTs = 0;
  let count = 0;
  try {
    const lastTsRaw = window.sessionStorage.getItem(RECOVERY_TS_KEY);
    lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const countRaw = window.sessionStorage.getItem(RECOVERY_COUNT_KEY);
    count = countRaw ? Number(countRaw) : 0;
  } catch {
    /* sessionStorage may be blocked; fall through */
  }

  if (lastTs && now - lastTs < RECOVERY_WINDOW_MS) {
    if (count >= MAX_RECOVERIES_IN_WINDOW) {
      return false;
    }
    count += 1;
  } else {
    count = 1;
  }

  try {
    window.sessionStorage.setItem(RECOVERY_TS_KEY, String(now));
    window.sessionStorage.setItem(RECOVERY_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }

  reloadInFlight = true;

  void (async () => {
    await clearAllCaches();
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(now));
    window.location.replace(url.toString());
  })();

  return true;
}

let globalListenersInstalled = false;

function installGlobalRecoveryListeners(): void {
  if (typeof window === "undefined") return;
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;

  window.addEventListener("error", (evt) => {
    if (isReactInstanceCrash(evt.error ?? evt.message)) {
      tryHardReload();
    }
  });
  window.addEventListener("unhandledrejection", (evt) => {
    if (isReactInstanceCrash(evt.reason)) {
      tryHardReload();
    }
  });
}

interface State {
  fatal: boolean;
  reloading: boolean;
  message: string;
}

export class ReactInstanceRecovery extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { fatal: false, reloading: false, message: "" };
    installGlobalRecoveryListeners();
  }

  static getDerivedStateFromError(err: unknown): Partial<State> {
    const message =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    if (isReactInstanceCrash(err)) {
      const willReload = tryHardReload();
      if (willReload) {
        return { reloading: true, message };
      }
      return { fatal: true, message };
    }
    return { fatal: true, message };
  }

  componentDidCatch(err: unknown, info: ErrorInfo): void {
    // Log the FULL component stack so we can see the ACTUAL component that
    // threw, not just the immediate child of this error boundary. Without
    // this, every crash is reported as "occurred in <FirebaseAuthProvider>"
    // because that's what wraps everything below us in the tree — useless
    // for debugging where the bad hook call really is.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    // eslint-disable-next-line no-console
    console.error(
      "[amynest-recovery] CAUGHT:",
      message,
      "\nerror.stack:\n",
      stack ?? "(no stack)",
      "\nreact componentStack:\n",
      info.componentStack ?? "(no component stack)",
    );
  }

  private renderFallback(reloading: boolean) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b0820",
          color: "#fff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>
            {reloading ? "Refreshing AmyNest…" : "Something went wrong"}
          </h1>
          <p style={{ opacity: 0.8, marginBottom: 20, lineHeight: 1.5 }}>
            {reloading
              ? "Clearing the cache and reloading the page."
              : "Tap the button below to clear the cache and reload."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              this.setState({ reloading: true });
              void (async () => {
                try {
                  window.sessionStorage.removeItem(RECOVERY_TS_KEY);
                  window.sessionStorage.removeItem(RECOVERY_COUNT_KEY);
                } catch {
                  /* ignore */
                }
                await clearAllCaches();
                const url = new URL(window.location.href);
                url.searchParams.set("_r", String(Date.now()));
                window.location.replace(url.toString());
              })();
            }}
            style={{
              padding: "12px 24px",
              borderRadius: 9999,
              background: "linear-gradient(135deg,#a855f7,#ec4899)",
              color: "#fff",
              fontWeight: 600,
              border: 0,
              cursor: "pointer",
              fontSize: 16,
            }}
            disabled={reloading}
          >
            {reloading ? "Reloading…" : "Reload AmyNest"}
          </button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.reloading || this.state.fatal) {
      return this.renderFallback(this.state.reloading);
    }
    return this.props.children;
  }
}
