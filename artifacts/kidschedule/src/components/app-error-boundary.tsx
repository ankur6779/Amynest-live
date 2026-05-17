import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[amynest:AppErrorBoundary]", this.props.label ?? "app", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
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
