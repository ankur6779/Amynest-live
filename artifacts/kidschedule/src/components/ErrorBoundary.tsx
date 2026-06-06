import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { reportCrash } from "@/lib/crash-report";
import { navigateToSafeRoute } from "@/lib/crash-recovery";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";
import { isCrashDebugOverlayEnabled, isInfiniteRenderError } from "@/lib/runtime-crash-policy";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null; errorReferenceId?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("React crash:", this.props.label ?? "root", error, info);

    void reportCrash({
      kind: "react.render",
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      component: this.props.label ?? "root",
    }).then((report) => {
      this.setState({ errorReferenceId: report.errorId });
    });

    if (isCrashDebugOverlayEnabled()) {
      showReactCrashOverlay(error, this.props.label ?? "root", info.componentStack ?? undefined);
    }

    if (isInfiniteRenderError(error)) {
      navigateToSafeRoute();
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      if (isCrashDebugOverlayEnabled()) {
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "#000",
              color: "#0f0",
              zIndex: 999999,
              padding: 20,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            <h2>🔥 React Crash</h2>
            <pre>{this.state.error.stack ?? this.state.error.message}</pre>
          </div>
        );
      }

      return (
        <AppFallbackUi
          errorReferenceId={this.state.errorReferenceId}
          onTryAgain={() => this.setState({ error: null, errorReferenceId: undefined })}
          onGoHome={() => navigateToSafeRoute()}
        />
      );
    }
    return this.props.children;
  }
}
