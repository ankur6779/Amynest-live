import { Component, type ErrorInfo, type ReactNode } from "react";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { logClientError } from "@/lib/log-client-error";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";

type Props = {
  children: ReactNode;
  label?: string;
  /** Compact fallback (e.g. menu button) instead of full-screen UI. */
  fallback?: ReactNode;
};
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // #region agent log
    agentDebugLog({
      location: "app-error-boundary.tsx:componentDidCatch",
      message: "react crash caught",
      data: {
        label: this.props.label ?? "app",
        errMsg: error.message,
        errName: error.name,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        stackTop: (error.stack ?? "").slice(0, 400),
      },
      hypothesisId: "H3-H5",
    });
    // #endregion
    console.error(
      "APP CRASH:",
      this.props.label ?? "app",
      error,
      info.componentStack,
    );
    showReactCrashOverlay(error, this.props.label ?? "app", info.componentStack ?? undefined);
    void logClientError({
      label: this.props.label ?? "app",
      message: error.message,
      stack: [error.stack, info.componentStack].filter(Boolean).join("\n"),
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
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
            zIndex: 999998,
            padding: 20,
            overflow: "auto",
            fontSize: 12,
          }}
        >
          <h2>🔥 React Crash ({this.props.label ?? "app"})</h2>
          <pre>{this.state.error.stack ?? this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
