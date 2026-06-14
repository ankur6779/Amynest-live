import { useTranslation } from "react-i18next";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
import { buildNutritionTimeline } from "@/features/nutrition/lib/nutrition-timeline";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";

export function NutritionTimeline() {
  const { t } = useTranslation();
  const { confidence } = useNutritionConfidence();
  const { entries } = useMealMemory();
  const { streak } = useNutritionTrackMeta();

  const events = buildNutritionTimeline({
    todayKey: dateKeyLocal(),
    streak,
    confidenceLevel: confidence.confidenceLevel,
    memoryEntries: entries,
  });

  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("nutrition_hub.household.timeline_title")}
      </p>
      <ol className="relative border-l border-white/10 ml-2 space-y-4 pl-4">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[1.35rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px]">
              {ev.emoji}
            </span>
            <p className="text-sm text-foreground">{ev.label}</p>
            <p className="text-[10px] text-muted-foreground">{ev.dateKey}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
