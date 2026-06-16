import { parseApiJson } from "@/lib/safe-json-response";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2 } from "lucide-react";
import { useListChildren } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { getMealPlan, type AgeGroupId } from "@/lib/nutrition-data";
import { getApiUrl, getAppApiBaseOrigin } from "@/lib/api";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import { getMondayBasedDayIndex } from "@/features/nutrition/lib/age-band-map";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { trackCaregiverShareCreated } from "@/features/nutrition/lib/nutrition-hub-analytics";

function childAgeMonths(c: { age: number; ageMonths?: number | null }): number {
  return c.age * 12 + (c.ageMonths ?? 0);
}

export function CaregiverSharePanel() {
  const { t } = useTranslation();
  const { foodStyle, suggestedMeal, countryProfile } = useNutritionContext();
  const { data: children = [] } = useListChildren();
  const authFetch = useAuthFetch();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!isPremium) {
      openPaywall("hub_nutrition");
      return;
    }
    if (children.length === 0) return;

    setLoading(true);
    try {
      const dayIdx = getMondayBasedDayIndex();
      const payload = {
        foodStyle,
        children: children.map((c) => {
          const ageGroupId = monthsToAgeGroupId(childAgeMonths(c)) as AgeGroupId;
          const plan = getMealPlan(ageGroupId, foodStyle, countryProfile);
          const day = plan?.days[dayIdx] ?? plan?.days[0];
          const meal = day?.veg;
          const slots = [
            { slot: "breakfast", meal: meal?.breakfast },
            { slot: "lunch", meal: meal?.lunch },
            { slot: "snack", meal: meal?.snack },
            { slot: "dinner", meal: meal?.dinner },
          ]
            .filter((s): s is { slot: string; meal: string } => !!s.meal)
            .map((s) => ({ slot: s.slot, meal: s.meal! }));

          return {
            childId: c.id,
            name: c.name,
            tonightMeal: meal?.dinner ?? null,
            dayLabel: day?.day ?? null,
            mealPlanSlots: slots,
            familyPortionMeal: suggestedMeal || meal?.dinner || null,
          };
        }),
      };

      const res = await authFetch(getApiUrl("/api/nutrition/caregiver-share"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childIds: children.map((c) => c.id),
          payload,
        }),
      });

      if (!res.ok) return;
      const json = (await parseApiJson<{ shareToken?: string }>(res));
      if (json.shareToken) {
        const origin = typeof window !== "undefined" ? window.location.origin : getAppApiBaseOrigin().replace(/\/api.*$/, "");
        setShareUrl(`${origin}/nutrition/share/${json.shareToken}`);
        trackCaregiverShareCreated(children[0]?.id ?? null, children.length);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Link2 className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("nutrition_hub.household.share_title")}
          </p>
          <p className="text-xs text-muted-foreground">{t("nutrition_hub.household.share_desc")}</p>
        </div>
      </div>
      {shareUrl ? (
        <div className="space-y-2">
          <p className="text-xs break-all text-emerald-200/90 bg-black/20 rounded-lg p-2">{shareUrl}</p>
          <p className="text-[10px] text-muted-foreground">{t("nutrition_hub.household.share_readonly")}</p>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void handleCreate()}>
          {loading ? t("nutrition_hub.household.share_creating") : t("nutrition_hub.household.share_create")}
        </Button>
      )}
      {!isPremium && (
        <p className="text-[10px] text-muted-foreground">{t("nutrition_hub.household.share_premium")}</p>
      )}
    </div>
  );
}
