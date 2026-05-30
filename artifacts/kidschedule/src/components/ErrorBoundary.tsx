import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { showReactCrashOverlay } from "@/lib/production-crash-overlay";
import {
  normalizeBoundaryError,
  safeInvokeBoundaryHandler,
} from "@/lib/safe-error-boundary-catch";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const err = normalizeBoundaryError(error);
    safeInvokeBoundaryHandler(this.props.label ?? "root", () => {
      console.error("React crash:", this.props.label ?? "root", err, info);
      showReactCrashOverlay(err, this.props.label ?? "root", info.componentStack ?? undefined);
    });
  }

  render(): ReactNode {
    if (this.state.error) {
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
    return this.props.children;
  }
}
