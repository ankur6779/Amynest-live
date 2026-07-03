import { Component, type ErrorInfo, type ReactNode } from "react";
import { PhonicsUnavailableFallback } from "@/components/phonics-unavailable-fallback";
import { reportCrash } from "@/lib/crash-report";
import { getPhonicsManifestValidation } from "@/lib/phonics-manifest-validation";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

type Props = {
  children: ReactNode;
  childName?: string;
};

type State = { error: Error | null; remountKey: number };

/** Phonics render failures — unified crash spine + safe fallback (never white-screen). */
export class PhonicsErrorBoundary extends Component<Props, State> {
  state: State = { error: null, remountKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const validation = getPhonicsManifestValidation();
    console.error("Phonics render failure", error, info.componentStack);
    recordPhonicsTelemetry("phonics_render_crash", {
      message: error.message,
      manifestVersion: validation.manifestVersion,
      libraryVersion: validation.libraryVersion,
      assetCount: validation.assetCount,
    });
    void reportCrash({
      kind: "react.render",
      message: error.message,
      stack: error.stack,
      component: "Phonics",
      componentStack: info.componentStack ?? undefined,
      meta: {
        manifestVersion: validation.manifestVersion,
        libraryVersion: validation.libraryVersion,
        assetCount: validation.assetCount,
        errors: validation.errors,
      },
    });
  }

  private handleRetry = (): void => {
    this.setState((s) => ({ error: null, remountKey: s.remountKey + 1 }));
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <PhonicsUnavailableFallback
          childName={this.props.childName}
          onRetry={this.handleRetry}
        />
      );
    }
    return <div key={this.state.remountKey}>{this.props.children}</div>;
  }
}
