import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { showProductionCrashOverlay, showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { isCrashDebugOverlayEnabled } from "@/lib/runtime-crash-policy";

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
      // #region agent log
      agentDebugLog({
        location: "react-instance-recovery.tsx:global.error",
        message: "recoverable window error",
        data: {
          debugOverlay: isCrashDebugOverlayEnabled(),
          willRecover: !isCrashDebugOverlayEnabled(),
        },
        hypothesisId: "H2",
      });
      // #endregion
      if (isCrashDebugOverlayEnabled()) {
        showProductionCrashOverlay({
          kind: "recoverable.error",
          message: errorMessage(evt.error ?? evt.message),
        });
        return;
      }
      tryAutoRecover();
    }
  });
  window.addEventListener("unhandledrejection", (evt) => {
    if (isRecoverableError(evt.reason)) {
      // #region agent log
      agentDebugLog({
        location: "react-instance-recovery.tsx:global.rejection",
        message: "recoverable unhandled rejection",
        data: {
          debugOverlay: isCrashDebugOverlayEnabled(),
          willRecover: !isCrashDebugOverlayEnabled(),
        },
        hypothesisId: "H2",
      });
      // #endregion
      if (isCrashDebugOverlayEnabled()) {
        showProductionCrashOverlay({
          kind: "recoverable.rejection",
          message: errorMessage(evt.reason),
        });
        return;
      }
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
    // #region agent log
    agentDebugLog({
      location: "react-instance-recovery.tsx:getDerivedStateFromError",
      message: "error boundary caught",
      data: {
        msg: message.slice(0, 200),
        recoverable: isRecoverableError(err),
        debugOverlay: isCrashDebugOverlayEnabled(),
      },
      hypothesisId: "H2-H3",
    });
    // #endregion
    if (isCrashDebugOverlayEnabled()) {
      markCacheRecoveryPending();
      return { fatal: true, message };
    }
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
    if (err instanceof Error) {
      showReactCrashOverlay(err, "ReactInstanceRecovery", info.componentStack ?? undefined);
    } else {
      showProductionCrashOverlay({
        kind: "react.recovery",
        message,
        stack: info.componentStack ?? undefined,
      });
    }
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
    <AppFallbackUi
      reloading={reloading}
      onReload={onReload}
      message={
        reloading
          ? "Clearing the cache and reloading the page."
          : "Tap the button below to clear the cache and reload."
      }
    />
  );
}
