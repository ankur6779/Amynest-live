import { Component, type ErrorInfo, type ReactNode } from "react";
import { PhonicsUnavailableFallback } from "@/components/phonics-unavailable-fallback";
import { logClientError } from "@/lib/log-client-error";
import { getPhonicsManifestValidation } from "@/lib/phonics-manifest-validation";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

type Props = {
  children: ReactNode;
  childName?: string;
};

type State = { error: Error | null };

/** Phonics render failures — logs manifest context and shows a safe fallback (never white-screen). */
export class PhonicsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

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
    void logClientError({
      label: "Phonics",
      message: error.message,
      stack: error.stack,
      meta: {
        componentStack: info.componentStack,
        manifestVersion: validation.manifestVersion,
        libraryVersion: validation.libraryVersion,
        assetCount: validation.assetCount,
        errors: validation.errors,
      },
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return <PhonicsUnavailableFallback childName={this.props.childName} />;
    }
    return this.props.children;
  }
}
