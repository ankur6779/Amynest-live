import { Calendar, ChefHat, User } from "lucide-react";
import {
  HUB_GLASS_SURFACE,
  ROUTINES_HUB_ACCENT,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export type RoutineShareTimelineRow = {
  time: string;
  activity: string;
  duration: number;
};

type RoutineShareCardProps = {
  childName: string;
  childPhotoUrl?: string | null;
  title: string;
  dateLabel: string;
  timeline: RoutineShareTimelineRow[];
  mealSummary: string[];
  watermark?: string;
};

export function RoutineShareCard({
  childName,
  childPhotoUrl,
  title,
  dateLabel,
  timeline,
  mealSummary,
  watermark = "AmyNest",
}: RoutineShareCardProps) {
  return (
    <div
      className={cn(
        HUB_GLASS_SURFACE,
        ROUTINES_HUB_ACCENT.border,
        "rounded-[20px] overflow-hidden",
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {childPhotoUrl ? (
            <img
              src={childPhotoUrl}
              alt={childName}
              className="w-11 h-11 rounded-full object-cover border border-amber-500/30"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <User className="h-5 w-5 text-amber-200/90" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/80">
              Caregiver schedule
            </p>
            <h3 className="font-quicksand font-bold text-base text-foreground leading-snug truncate">
              {title}
            </h3>
            <p className="text-xs text-foreground/70 mt-0.5">
              {childName} · {dateLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 max-h-52 overflow-y-auto">
        {timeline.map((row, i) => (
          <div key={`${row.time}-${i}`} className="flex gap-2.5 text-xs">
            <span className="font-bold text-amber-200/90 shrink-0 w-[4.5rem]">
              {row.time}
            </span>
            <span className="text-foreground/90 flex-1 min-w-0 leading-snug">
              {row.activity}
            </span>
            {row.duration > 0 ? (
              <span className="text-foreground/45 shrink-0">{row.duration}m</span>
            ) : null}
          </div>
        ))}
      </div>

      {mealSummary.length > 0 ? (
        <div className="px-4 py-2.5 border-t border-white/[0.08] bg-amber-500/[0.04]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300/75 mb-1.5 flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            Meals today
          </p>
          <p className="text-xs text-foreground/85 leading-relaxed">
            {mealSummary.join(" · ")}
          </p>
        </div>
      ) : null}

      <div className="px-4 py-2 flex items-center justify-between border-t border-white/[0.06]">
        <span className="text-[10px] text-foreground/40 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Shared schedule
        </span>
        <span className="text-[10px] font-semibold text-foreground/35 tracking-wide">
          {watermark}
        </span>
      </div>
    </div>
  );
}
