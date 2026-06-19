import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import {
  resetAutoRecoveryCounters,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";
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
          onReload={() => {
            this.setState({ reloading: true });
            void (async () => {
              resetAutoRecoveryCounters();
              markCacheRecoveryPending();
              await handleRecoveryReload();
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
  onReload,
  onGoHome,
}: {
  reloading: boolean;
  errorReferenceId?: string;
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
          : "We're having trouble loading this screen.\nPlease try again."
      }
    />
  );
}
