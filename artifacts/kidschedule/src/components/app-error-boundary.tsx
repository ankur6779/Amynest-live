import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { getAppQueryClient } from "@/lib/app-query-client";
import {
  executeHardReload,
  navigateToSafeRoute,
  recordRecoveryAttempt,
  resetCrashRecoveryCounters,
  type RecoveryStage,
} from "@/lib/crash-recovery";
import { clearRefreshCompleteFlag } from "@/lib/refresh-orchestrator";
import { isCrashDebugOverlayEnabled } from "@/lib/runtime-crash-policy";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  planComponentCrashRecovery,
  recordRecoveryStageComplete,
} from "@/lib/self-healing/orchestrator";

type Props = {
  children: ReactNode;
  label?: string;
  /** Compact fallback (e.g. menu button) instead of full-screen UI. */
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
  recovering: boolean;
  recoveryMessage: string;
  remountKey: number;
  errorReferenceId?: string;
};

const RECOVERY_DELAY_MS = 1000;
const REFRESH_FAILSAFE_MS = 10_000;

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    recovering: false,
    recoveryMessage: "Something went wrong. Recovering…",
    remountKey: 0,
  };

  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshFailsafeTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryStarted = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      error,
      recovering: false,
      recoveryMessage: "Something went wrong. Recovering…",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const label = this.props.label ?? "app";
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const userId = getFirebaseAuth().currentUser?.uid ?? null;

    console.error("APP CRASH:", label, error, info.componentStack);

    if (isCrashDebugOverlayEnabled()) {
      showReactCrashOverlay(error, label, info.componentStack ?? undefined);
    }

    void planComponentCrashRecovery({
      error,
      component: label,
      componentStack: info.componentStack ?? undefined,
      userId,
      queryClient: getAppQueryClient() ?? undefined,
    }).then((plan) => {
      this.setState({ errorReferenceId: plan.errorReferenceId });

      if (plan.skipAutoRecovery) {
        this.showManualRecovery(
          plan.outcome === "quarantined"
            ? "This screen was paused to keep AmyNest stable.\nPlease try again or go home."
            : undefined,
        );
        return;
      }

      this.scheduleRecovery(plan.stage, error);
    });
  }

  componentWillUnmount(): void {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.clearRefreshFailsafe();
  }

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
      this.showManualRecovery(
        "Refresh timed out.\nPlease try again or go home.",
      );
    }, REFRESH_FAILSAFE_MS);
  }

  private showManualRecovery(message?: string): void {
    this.recoveryStarted = true;
    this.setState({
      recovering: false,
      recoveryMessage:
        message ?? "We're having trouble loading this screen.\nPlease try again.",
    });
  }

  private scheduleRecovery(stage: RecoveryStage, error: Error): void {
    if (this.recoveryStarted) return;
    this.recoveryStarted = true;

    this.recoveryTimer = setTimeout(() => {
      void this.runRecovery(stage, error);
    }, RECOVERY_DELAY_MS);
  }

  private async runRecovery(stage: RecoveryStage, error: Error): Promise<void> {
    const label = this.props.label ?? "app";
    recordRecoveryAttempt(stage);

    if (stage === "remount") {
      this.setState({
        error: null,
        recovering: false,
        remountKey: this.state.remountKey + 1,
      });
      this.recoveryStarted = false;
      recordRecoveryStageComplete(stage, label, true);
      return;
    }

    if (stage === "navigate") {
      this.setState({ recoveryMessage: "Taking you to a safe page…" });
      const ok = navigateToSafeRoute();
      recordRecoveryStageComplete(stage, label, ok);
      return;
    }

    if (stage === "reload") {
      this.setState({ recovering: true, recoveryMessage: "Refreshing AmyNest…" });
      this.armRefreshFailsafe();
      const ok = await executeHardReload({
        onTimeout: () => {
          this.showManualRecovery(
            "Refresh timed out.\nPlease try again or go home.",
          );
        },
      });
      this.clearRefreshFailsafe();
      if (!ok) {
        this.showManualRecovery();
        recordRecoveryStageComplete(stage, label, false);
        return;
      }
      recordRecoveryAttempt(stage);
      recordRecoveryStageComplete(stage, label, true);
      return;
    }

    this.setState({
      recovering: false,
      recoveryMessage: "We're having trouble loading this screen.\nPlease try again.",
    });
    recordRecoveryStageComplete(stage, label, false);
    console.error("[amynest:recovery] manual fallback", error.message);
  }

  private handleTryAgain = (): void => {
    resetCrashRecoveryCounters();
    this.recoveryStarted = false;
    this.setState({
      error: null,
      recovering: false,
      remountKey: this.state.remountKey + 1,
      recoveryMessage: "Something went wrong. Recovering…",
    });
  };

  private handleGoHome = (): void => {
    resetCrashRecoveryCounters();
    navigateToSafeRoute();
  };

  render(): ReactNode {
    if (this.state.recovering && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <AppFallbackUi
          reloading
          message={this.state.recoveryMessage}
          errorReferenceId={this.state.errorReferenceId}
        />
      );
    }

    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <AppFallbackUi
          message={this.state.recoveryMessage}
          errorReferenceId={this.state.errorReferenceId}
          onTryAgain={this.handleTryAgain}
          onGoHome={this.handleGoHome}
          onReload={() => {
            this.setState({ recovering: true, recoveryMessage: "Refreshing AmyNest…" });
            resetCrashRecoveryCounters();
            clearRefreshCompleteFlag();
            this.armRefreshFailsafe();
            void executeHardReload({
              force: true,
              onTimeout: () => {
                this.showManualRecovery(
                  "Refresh timed out.\nPlease try again or go home.",
                );
              },
            }).then((ok) => {
              this.clearRefreshFailsafe();
              if (!ok) {
                this.showManualRecovery();
              }
            });
          }}
        />
      );
    }

    return (
      <div
        key={this.state.remountKey}
        data-error-boundary={this.props.label ?? "app"}
        className="flex min-h-0 flex-1 flex-col"
      >
        {this.props.children}
      </div>
    );
  }
}
