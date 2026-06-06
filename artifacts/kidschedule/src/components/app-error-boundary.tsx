import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { reportCrash } from "@/lib/crash-report";
import {
  executeHardReload,
  navigateToSafeRoute,
  planCrashRecovery,
  recordRecoveryAttempt,
  resetCrashRecoveryCounters,
  type RecoveryStage,
} from "@/lib/crash-recovery";
import { isCrashDebugOverlayEnabled } from "@/lib/runtime-crash-policy";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { getOnboardingRunId } from "@/lib/onboarding-telemetry";
import { getFirebaseAuth } from "@/lib/firebase";

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
};

const RECOVERY_DELAY_MS = 1000;

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    recovering: false,
    recoveryMessage: "Something went wrong. Recovering…",
    remountKey: 0,
  };

  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryStarted = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      error,
      recovering: true,
      recoveryMessage: "Something went wrong. Recovering…",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const label = this.props.label ?? "app";
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const userId = getFirebaseAuth().currentUser?.uid ?? null;

    console.error("APP CRASH:", label, error, info.componentStack);

    void reportCrash({
      kind: "react.render",
      message: error.message,
      stack: [error.stack, info.componentStack].filter(Boolean).join("\n"),
      component: label,
      userId,
      meta: {
        route,
        onboardingRunId: getOnboardingRunId(),
      },
    });

    if (isCrashDebugOverlayEnabled()) {
      showReactCrashOverlay(error, label, info.componentStack ?? undefined);
    }

    this.scheduleRecovery(error);
  }

  componentWillUnmount(): void {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
  }

  private scheduleRecovery(error: Error): void {
    if (this.recoveryStarted) return;
    this.recoveryStarted = true;

    this.recoveryTimer = setTimeout(() => {
      void this.runRecovery(planCrashRecovery(this.props.label ?? "app"), error);
    }, RECOVERY_DELAY_MS);
  }

  private async runRecovery(stage: RecoveryStage, error: Error): Promise<void> {
    recordRecoveryAttempt(stage);

    if (stage === "remount") {
      this.setState({
        error: null,
        recovering: false,
        remountKey: this.state.remountKey + 1,
      });
      this.recoveryStarted = false;
      return;
    }

    if (stage === "navigate") {
      this.setState({ recoveryMessage: "Taking you to a safe page…" });
      navigateToSafeRoute();
      return;
    }

    if (stage === "reload") {
      this.setState({ recovering: true, recoveryMessage: "Refreshing AmyNest…" });
      await executeHardReload();
      return;
    }

    this.setState({
      recovering: false,
      recoveryMessage: "AmyNest could not recover automatically. Tap below to reload.",
    });
    console.error("[amynest:recovery] manual fallback", error.message);
  }

  render(): ReactNode {
    if (this.state.recovering && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <AppFallbackUi reloading message={this.state.recoveryMessage} />;
    }

    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <AppFallbackUi
          message={this.state.recoveryMessage}
          onReload={() => {
            this.setState({ recovering: true, recoveryMessage: "Refreshing AmyNest…" });
            resetCrashRecoveryCounters();
            void executeHardReload();
          }}
        />
      );
    }

    return (
      <div key={this.state.remountKey} data-error-boundary={this.props.label ?? "app"}>
        {this.props.children}
      </div>
    );
  }
}
