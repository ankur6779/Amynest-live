import { HUB_TILE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { Activity, Flame, Leaf, Zap } from "lucide-react";
import type { MealEntry } from "@/features/nutrition/types/nutrition-hub.types";
import { NutritionPill } from "@/features/nutrition/components/plan/nutrition-pill";

export function MealCard({
  entry,
  emoji,
  label,
}: {
  entry: MealEntry;
  emoji: string;
  label: string;
}) {
  return (
    <div className={cn(HUB_TILE, "rounded-xl p-3 flex flex-col gap-2")}>
      <div className="flex items-center gap-1.5">
        <span className="text-base">{emoji}</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-snug">{entry.name}</p>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        <NutritionPill
          icon={<Flame className="w-3 h-3" />}
          value={entry.calories}
          label=" kcal"
          color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
        />
        <NutritionPill
          icon={<Zap className="w-3 h-3" />}
          value={entry.protein_g}
          label="g prot"
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        />
        <NutritionPill
          icon={<Activity className="w-3 h-3" />}
          value={entry.carbs_g}
          label="g carbs"
          color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        />
        <NutritionPill
          icon={<Leaf className="w-3 h-3" />}
          value={entry.fiber_g}
          label="g fiber"
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        />
      </div>
    </div>
  );
}
