import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

import { trackWorksheetEvent } from "./worksheet-studio-analytics";
import { WS_ROOT, WS_MUTED_TEXT, WS_HEADING_SM, WS_PAD_X } from "./worksheet-studio-theme";
import { cn } from "@/lib/utils";

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
        <div className={cn(WS_ROOT, "flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#faf8f5] text-center", WS_PAD_X)} role="alert">
          <AlertTriangle className="h-12 w-12 text-amber-600" aria-hidden />
          <h2 className={WS_HEADING_SM}>Something went wrong</h2>
          <p className={cn("max-w-sm", WS_MUTED_TEXT)}>
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
