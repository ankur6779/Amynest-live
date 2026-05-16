import { Component, type ErrorInfo, type ReactNode } from "react";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";

const RECOVERY_TS_KEY = "amynest:react-instance-recovery:ts";
const RECOVERY_COUNT_KEY = "amynest:react-instance-recovery:count";

const RECOVERY_WINDOW_MS = 30_000;
const MAX_RECOVERIES_IN_WINDOW = 1;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.message}\n${err.stack ?? ""}`;
  return String(err ?? "");
}

function isReactInstanceCrash(err: unknown): boolean {
  const message = errorMessage(err);
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

function isStaleDeployAssetError(err: unknown): boolean {
  const message = errorMessage(err);
  if (!message) return false;
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Failed to load module script") ||
    message.includes("MIME type") ||
    (message.includes("Loading chunk") && message.includes("failed"))
  );
}

function isRecoverableError(err: unknown): boolean {
  return isReactInstanceCrash(err) || isStaleDeployAssetError(err);
}

let reloadInFlight = false;

function tryAutoRecover(): boolean {
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
    /* sessionStorage may be blocked */
  }

  if (lastTs && now - lastTs < RECOVERY_WINDOW_MS) {
    if (count >= MAX_RECOVERIES_IN_WINDOW) return false;
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
  markCacheRecoveryPending();
  void handleRecoveryReload();
  return true;
}

let globalListenersInstalled = false;

function installGlobalRecoveryListeners(): void {
  if (typeof window === "undefined") return;
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;

  window.addEventListener("error", (evt) => {
    if (isRecoverableError(evt.error ?? evt.message)) {
      tryAutoRecover();
    }
  });
  window.addEventListener("unhandledrejection", (evt) => {
    if (isRecoverableError(evt.reason)) {
      tryAutoRecover();
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
    if (isRecoverableError(err)) {
      const willReload = tryAutoRecover();
      if (willReload) {
        return { reloading: true, message };
      }
      markCacheRecoveryPending();
      return { fatal: true, message };
    }
    markCacheRecoveryPending();
    return { fatal: true, message };
  }

  componentDidCatch(err: unknown, info: ErrorInfo): void {
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

  render(): ReactNode {
    if (this.state.reloading || this.state.fatal) {
      return (
        <RecoveryFallback
          reloading={this.state.reloading}
          onReload={() => {
            this.setState({ reloading: true });
            void (async () => {
              try {
                window.sessionStorage.removeItem(RECOVERY_TS_KEY);
                window.sessionStorage.removeItem(RECOVERY_COUNT_KEY);
              } catch {
                /* ignore */
              }
              markCacheRecoveryPending();
              await handleRecoveryReload();
            })();
          }}
        />
      );
    }
    return this.props.children;
  }
}

function RecoveryFallback({
  reloading,
  onReload,
}: {
  reloading: boolean;
  onReload: () => void;
}) {
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
          onClick={onReload}
          style={{
            padding: "12px 24px",
            borderRadius: 9999,
            background:
              "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)))",
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
