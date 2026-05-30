import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import {
  resetAutoRecoveryCounters,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";
import { safeLogClientError, safeLogOnboardingFinish } from "@/lib/guarded-log";
import { getOnboardingRunId } from "@/lib/onboarding-telemetry";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { isCrashDebugOverlayEnabled } from "@/lib/runtime-crash-policy";
import {
  normalizeBoundaryError,
  safeInvokeBoundaryHandler,
} from "@/lib/safe-error-boundary-catch";

type Props = {
  children: ReactNode;
  label?: string;
  /** Compact fallback (e.g. menu button) instead of full-screen UI. */
  fallback?: ReactNode;
};
type State = { error: Error | null; recovering: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isCrashDebugOverlayEnabled()) {
      return { error, recovering: false };
    }
    if (shouldAttemptAutoRecovery(error)) {
      const willReload = tryAutoRecovery(`boundary:${error.message.slice(0, 40)}`);
      if (willReload) {
        return { error, recovering: true };
      }
    }
    return { error, recovering: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const err = normalizeBoundaryError(error);
    safeInvokeBoundaryHandler(this.props.label ?? "app", () => {
      console.error(
        "APP CRASH:",
        this.props.label ?? "app",
        err,
        info.componentStack,
      );
      showReactCrashOverlay(err, this.props.label ?? "app", info.componentStack ?? undefined);
      const crashMeta = {
        boundary: this.props.label ?? "app",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        onboardingStep:
          typeof window !== "undefined"
            ? (window as Window & { __amynestOnboardingStep?: string }).__amynestOnboardingStep
            : undefined,
        onboardingRunId: getOnboardingRunId(),
      };
      safeLogOnboardingFinish("APP_CRASH", {
        message: err.message,
        stack: err.stack,
        componentStack: info.componentStack,
        ...crashMeta,
      });
      safeLogClientError({
        label: this.props.label ?? "app",
        message: err.message,
        stack: [err.stack, info.componentStack].filter(Boolean).join("\n"),
        meta: crashMeta,
      });
    });
  }

  render(): ReactNode {
    if (this.state.recovering) {
      return (
        <AppFallbackUi
          reloading
          message="AmyNest is fixing itself — clearing cache and reloading."
        />
      );
    }

    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <AppFallbackUi
          message="AmyNest could not recover automatically. Tap below to reload."
          onReload={() => {
            this.setState({ recovering: true });
            void (async () => {
              resetAutoRecoveryCounters();
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
