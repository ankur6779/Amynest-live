import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/**
 * Speech Coach living skeleton — sanctuary continuity (not marketplace chrome).
 * Matches Today's Help hero + quiet paths seating.
 */
export function SpeechCoachSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 p-4"
      role="status"
      aria-label="Preparing a calm practice space with you"
      aria-busy="true"
      data-testid="speech-coach-skeleton"
    >
      <ShimmerBlock className="h-4 w-20 rounded-lg bg-white/10" />
      <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.55)]">
        <ShimmerBlock className="h-44 w-full rounded-none bg-white/5" />
        <div className="space-y-2 p-4">
          <ShimmerBlock className="mx-auto h-16 w-[92%] rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="mt-3 h-3 w-28 rounded bg-white/10" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
        </div>
      </div>
      <ShimmerBlock className="h-12 w-full rounded-[1.05rem] bg-white/8" />
    </div>
  );
}
