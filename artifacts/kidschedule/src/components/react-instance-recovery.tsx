import { Component, type ReactNode } from "react";

const RECOVERY_FLAG_KEY = "amynest:react-instance-recovery";
const RECOVERY_TS_KEY = "amynest:react-instance-recovery:ts";
const RECOVERY_COUNT_KEY = "amynest:react-instance-recovery:count";

const RECOVERY_WINDOW_MS = 30_000;
const MAX_RECOVERIES_IN_WINDOW = 2;

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

function tryHardReload(): void {
  if (typeof window === "undefined") return;

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
      return;
    }
    count += 1;
  } else {
    count = 1;
  }

  try {
    window.sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
    window.sessionStorage.setItem(RECOVERY_TS_KEY, String(now));
    window.sessionStorage.setItem(RECOVERY_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(now));
  window.location.replace(url.toString());
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
  recovered: boolean;
  fatal: boolean;
}

export class ReactInstanceRecovery extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { recovered: false, fatal: false };
    installGlobalRecoveryListeners();
  }

  static getDerivedStateFromError(err: unknown): Partial<State> | null {
    if (isReactInstanceCrash(err)) {
      tryHardReload();
      return { recovered: true };
    }
    return { fatal: true };
  }

  componentDidCatch(err: unknown): void {
    if (isReactInstanceCrash(err)) {
      tryHardReload();
    }
  }

  render(): ReactNode {
    if (this.state.recovered) {
      return null;
    }
    if (this.state.fatal) {
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
              Something went wrong
            </h1>
            <p style={{ opacity: 0.8, marginBottom: 20 }}>
              Please reload the page to try again.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 9999,
                background: "linear-gradient(135deg,#a855f7,#ec4899)",
                color: "#fff",
                fontWeight: 600,
                border: 0,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
