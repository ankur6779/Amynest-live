import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DailyCheckInCardLazy = lazy(() =>
  import("@/components/retention/daily-check-in-card").then((m) => ({
    default: m.DailyCheckInCard,
  })),
);

/** Swallows retention render failures so Dashboard never crashes. */
class RetentionSectionBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[retention] section render failed — hiding widget", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function RetentionHubSection(props: {
  childName?: string | null;
  routineCompletionPct?: number;
  hasTodayRoutine: boolean;
  onGenerateRoutine: () => void;
  tipText?: string;
  learningHref?: string;
  learningLabel?: string;
}) {
  return (
    <RetentionSectionBoundary>
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <DailyCheckInCardLazy {...props} />
      </Suspense>
    </RetentionSectionBoundary>
  );
}
