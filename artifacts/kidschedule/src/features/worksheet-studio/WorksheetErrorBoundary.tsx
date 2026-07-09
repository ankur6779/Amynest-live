import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

import { trackWorksheetEvent } from "./worksheet-studio-analytics";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

export class WorksheetErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackWorksheetEvent("worksheet_error", { message: error.message.slice(0, 120) });
    if (import.meta.env.DEV) {
      console.error("[WorksheetStudio]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#faf8f5] px-6 text-center" role="alert">
          <AlertTriangle className="h-12 w-12 text-amber-600" aria-hidden />
          <h2 className="text-xl font-bold text-[#1e3a5f]">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your drafts are saved locally. Try again — we&apos;ll restore your work automatically.
          </p>
          <Button
            className="h-12 rounded-xl px-8 touch-manipulation"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            Recover & continue
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
