import { Component, type ErrorInfo, type ReactNode } from "react";
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
