import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles } from "lucide-react";
import { useListChildren } from "@workspace/api-client-react";
import { getMealPlan } from "@/lib/nutrition-data";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import {
  dismissDiscoveryHint,
  pickPrimaryDiscoveryHint,
} from "@/features/nutrition/lib/nutrition-discovery-hints";

export function NutritionDiscoveryHints() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, childId, ageGroupId, foodStyle } = useNutritionContext();
  const { entries } = useMealMemory();
  const { data: children = [] } = useListChildren();
  const [dismissedTick, setDismissedTick] = useState(0);

  const hint = useMemo(() => {
    const hasMealPlan = !!getMealPlan(ageGroupId, foodStyle);
    return pickPrimaryDiscoveryHint({
      activeTab,
      childId,
      ageGroupId,
      hasMealPlan,
      memoryEntryCount: entries.length,
      childrenCount: children.length,
    });
  }, [activeTab, childId, ageGroupId, foodStyle, entries.length, children.length, dismissedTick]);

  if (!hint) return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-foreground">{t(hint.messageKey)}</p>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setActiveTab(hint.targetTab)}
        >
          {t(hint.ctaKey)}
        </button>
      </div>
      <button
        type="button"
        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
        aria-label={t("nutrition_hub.discovery.dismiss")}
        onClick={() => {
          dismissDiscoveryHint(hint.id, childId);
          setDismissedTick((n) => n + 1);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
