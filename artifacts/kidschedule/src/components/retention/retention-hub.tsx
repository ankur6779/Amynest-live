import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DailyCheckInCardLazy = lazy(() =>
  import("@/components/retention/daily-check-in-card").then((m) => ({
    default: m.DailyCheckInCard,
  })),
);

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
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
      <DailyCheckInCardLazy {...props} />
    </Suspense>
  );
}
