import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { logClientError } from "@/lib/log-client-error";

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
        <AppFallbackUi
          title="Something went wrong"
          message="Something went wrong — try again. Tap reload if the problem continues."
          onReload={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}
