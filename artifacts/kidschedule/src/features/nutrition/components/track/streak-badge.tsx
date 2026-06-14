import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { streak } = useNutritionTrackMeta();

  if (streak <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200",
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
      )}
      aria-label={t("nutrition_hub.track.streak_days", { count: streak })}
    >
      <Flame className={cn("shrink-0 text-amber-400", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span className="font-semibold">
        {t("nutrition_hub.track.streak_days", { count: streak })}
      </span>
    </div>
  );
}
