import type { DayArcChip } from "@/lib/routine-detail-premium";
import { cn } from "@/lib/utils";

type RoutineDayArcStripProps = {
  segments: DayArcChip[];
};

export function RoutineDayArcStrip({ segments }: RoutineDayArcStripProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[11px] font-semibold"
      role="status"
      aria-label="Day progress"
    >
      {segments.map((seg, idx) => (
        <span key={seg.id} className="inline-flex items-center gap-1">
          {idx > 0 ? (
            <span className="text-foreground/25 mx-0.5" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1",
              seg.emphasis ? "text-amber-200/95" : "text-foreground/75",
            )}
          >
            <span aria-hidden>{seg.emoji}</span>
            {seg.label}
          </span>
        </span>
      ))}
    </div>
  );
}
