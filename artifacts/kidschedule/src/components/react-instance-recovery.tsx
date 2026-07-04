import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import {
  resetAutoRecoveryCounters,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";
import { clearRefreshCompleteFlag } from "@/lib/refresh-orchestrator";
import { canAttemptAutoRecovery, navigateToSafeRoute } from "@/lib/crash-recovery";
import { showProductionCrashOverlay, showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { isCrashDebugOverlayEnabled, isInfiniteRenderError } from "@/lib/runtime-crash-policy";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.message}\n${err.stack ?? ""}`;
  return String(err ?? "");
}

let globalListenersInstalled = false;

function installGlobalRecoveryListeners(): void {
  if (typeof window === "undefined") return;
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;

  window.addEventListener("error", (evt) => {
    if (!shouldAttemptAutoRecovery(evt.error ?? evt.message)) return;
    if (isCrashDebugOverlayEnabled()) {
      showProductionCrashOverlay({
        kind: "recoverable.error",
        message: errorMessage(evt.error ?? evt.message),
      });
      return;
    }
    tryAutoRecovery("window.error");
  });

  window.addEventListener("unhandledrejection", (evt) => {
    if (!shouldAttemptAutoRecovery(evt.reason)) return;
    if (isCrashDebugOverlayEnabled()) {
      showProductionCrashOverlay({
        kind: "recoverable.rejection",
        message: errorMessage(evt.reason),
      });
      return;
    }
    tryAutoRecovery("unhandledrejection");
  });
}

interface State {
  fatal: boolean;
  reloading: boolean;
  errorReferenceId?: string;
  reloadMessage?: string;
}

export class ReactInstanceRecovery extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { fatal: false, reloading: false };
    installGlobalRecoveryListeners();
  }

  private refreshFailsafeTimer: ReturnType<typeof setTimeout> | null = null;

  private clearRefreshFailsafe(): void {
    if (this.refreshFailsafeTimer) {
      clearTimeout(this.refreshFailsafeTimer);
      this.refreshFailsafeTimer = null;
    }
  }

  private armRefreshFailsafe(): void {
    this.clearRefreshFailsafe();
    this.refreshFailsafeTimer = setTimeout(() => {
      console.error("[Refresh] Timeout");
      this.setState({
        reloading: false,
        fatal: true,
        reloadMessage: "Refresh timed out.\nPlease try again or go home.",
      });
    }, 10_000);
  }

  componentWillUnmount(): void {
    this.clearRefreshFailsafe();
  }

  static getDerivedStateFromError(err: unknown): Partial<State> {
    if (isCrashDebugOverlayEnabled()) {
      markCacheRecoveryPending();
      return { fatal: true };
    }
    if (isInfiniteRenderError(err)) {
      if (canAttemptAutoRecovery()) {
        navigateToSafeRoute();
        return { reloading: true };
      }
      return { fatal: true };
    }
    if (canAttemptAutoRecovery() && shouldAttemptAutoRecovery(err)) {
      const willReload = tryAutoRecovery("react.boundary");
      if (willReload) {
        return { reloading: true };
      }
    }
    markCacheRecoveryPending();
    return { fatal: true };
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
    void import("@/lib/crash-report-loader").then((m) =>
      m.reportReactRecoveryCrash({
        message,
        stack,
        componentStack: info.componentStack ?? undefined,
      }).then((report) => {
        this.setState({ errorReferenceId: report.errorId });
      }),
    );
    if (isCrashDebugOverlayEnabled()) {
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
  }

  render(): ReactNode {
    if (this.state.reloading || this.state.fatal) {
      return (
        <RecoveryFallback
          reloading={this.state.reloading}
          errorReferenceId={this.state.errorReferenceId}
          message={this.state.reloadMessage}
          onReload={() => {
            this.setState({ reloading: true, fatal: false, reloadMessage: undefined });
            this.armRefreshFailsafe();
            void (async () => {
              resetAutoRecoveryCounters();
              clearRefreshCompleteFlag();
              markCacheRecoveryPending();
              const outcome = await handleRecoveryReload({
                reason: "react_instance_manual",
                force: true,
                onTimeout: () => {
                  this.setState({
                    reloading: false,
                    fatal: true,
                    reloadMessage: "Refresh timed out.\nPlease try again or go home.",
                  });
                },
              });
              this.clearRefreshFailsafe();
              if (outcome !== "scheduled" && outcome !== "skipped_in_flight") {
                this.setState({
                  reloading: false,
                  fatal: true,
                  reloadMessage: "We're having trouble loading this screen.\nPlease try again.",
                });
              }
            })();
          }}
          onGoHome={() => navigateToSafeRoute()}
        />
      );
    }
    return this.props.children;
  }
}

function RecoveryFallback({
  reloading,
  errorReferenceId,
  message,
  onReload,
  onGoHome,
}: {
  reloading: boolean;
  errorReferenceId?: string;
  message?: string;
  onReload: () => void;
  onGoHome: () => void;
}) {
  return (
    <AppFallbackUi
      reloading={reloading}
      errorReferenceId={errorReferenceId}
      onTryAgain={onReload}
      onGoHome={onGoHome}
      message={
        reloading
          ? "AmyNest is fixing itself — clearing cache and reloading."
          : message ??
            "We're having trouble loading this screen.\nPlease try again."
      }
    />
  );
}
