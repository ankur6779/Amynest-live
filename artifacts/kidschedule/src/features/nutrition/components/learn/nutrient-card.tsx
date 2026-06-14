import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgeGroupId, Nutrient } from "@/lib/nutrition-data";
import { formatDailyNeed } from "@/features/nutrition/lib/format-daily-need";

export function NutrientCard({
  nutrient,
  ageGroupId,
  onClick,
  compact = false,
}: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onClick: () => void;
  compact?: boolean;
}) {
  const need = nutrient.dailyNeeds[ageGroupId];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 rounded-xl sm:rounded-2xl border border-white/[0.08]",
        "bg-gradient-to-br from-white/[0.04] to-white/[0.02]",
        "text-left flex flex-col items-stretch transition-all duration-[220ms] ease-[ease]",
        "hover:-translate-y-0.5 hover:border-emerald-400/25 hover:shadow-[0_0_16px_rgba(52,211,153,0.12)]",
        "active:scale-[0.985]",
        compact ? "p-3 min-h-[104px] sm:min-h-0 sm:p-4" : "p-4",
      )}
    >
      <div className={cn("flex items-start justify-between", compact ? "mb-1.5" : "mb-2")}>
        <span className={compact ? "text-2xl sm:text-3xl" : "text-3xl"}>{nutrient.emoji}</span>
        <ChevronRight className="hidden sm:block h-4 w-4 mt-1 opacity-50 group-hover:opacity-100 transition-opacity text-emerald-300/80 shrink-0" />
      </div>
      <h3
        className={cn(
          "font-bold text-foreground truncate w-full",
          compact ? "text-sm sm:text-base" : "text-base",
        )}
      >
        {nutrient.name}
      </h3>
      <p
        className={cn(
          "text-xs text-muted-foreground/70 italic",
          compact ? "hidden sm:block mb-2" : "mb-2",
        )}
      >
        {nutrient.tagline}
      </p>
      <div
        className={cn(
          "rounded-lg font-semibold bg-white/[0.06] border border-white/[0.08] mt-auto",
          compact ? "px-2 py-1 text-[11px] sm:text-xs" : "px-2 py-1 text-xs",
        )}
      >
        <span className="text-emerald-200/90 line-clamp-2 sm:line-clamp-none">{formatDailyNeed(need)}</span>
      </div>
    </button>
  );
}
