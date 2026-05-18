import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";

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
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <AppFallbackUi
          message={this.state.error.message || "An unexpected error occurred."}
          onReload={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
