import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { usePaywall } from "@/contexts/paywall-context";
import { HUB_GLASS_SURFACE, HUB_TILE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CloudSnow,
  Flame,
  Globe,
  Leaf,
  RefreshCw,
  Sun,
  Wind,
  Zap,
} from "lucide-react";
import type { DayPlan, WeatherType } from "@/features/nutrition/types/nutrition-hub.types";
import { NUTRITION_WEEK_PLAN_FEATURE } from "@/features/nutrition/lib/constants";
import { MEAL_TIME_KEYS } from "@/features/nutrition/lib/meal-slots";
import { isNutritionLivingV1Enabled } from "@/lib/nutrition/living-room";
import { MealCard } from "@/features/nutrition/components/plan/meal-card";
import { MealPlanDaySelector } from "@/features/nutrition/components/plan/meal-plan-day-selector";
import { NutritionPill } from "@/features/nutrition/components/plan/nutrition-pill";
import { PlanLoadingSkeleton } from "@/features/nutrition/components/plan/plan-loading-skeleton";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { safeJsonResponse } from "@/lib/safe-json-response";

const MEAL_PLAN_GENERATE_TIMEOUT_MS = 60_000;

export function AIMealPlanSection() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const usage = useFeatureUsage();
  const { openPaywall } = usePaywall();
  const { setSuggestedMeal, selectedDay, setSelectedDay } = useNutritionContext();
  const mealLocked = usage.isFeatureLocked(NUTRITION_WEEK_PLAN_FEATURE);
  const mealTryFree = !usage.isPremium && !usage.hasUsedFeature(NUTRITION_WEEK_PLAN_FEATURE);
  const [weather, setWeather] = useState<WeatherType>("moderate");
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayIdx = selectedDay;

  useEffect(() => {
    if (plan && plan[dayIdx]) {
      setSuggestedMeal(plan[dayIdx].meals.lunch.name);
    }
  }, [plan, dayIdx, setSuggestedMeal]);

  const generate = useCallback(
    async (forceRefresh = false) => {
      if (
        !usage.isPremium &&
        (mealLocked || (forceRefresh && usage.hasUsedFeature(NUTRITION_WEEK_PLAN_FEATURE)))
      ) {
        openPaywall("hub_nutrition");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/meals/week-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weather, forceRefresh }),
        }, MEAL_PLAN_GENERATE_TIMEOUT_MS);
        if (res.status === 402) {
          const parsed = await safeJsonResponse<{ error?: string; feature?: string }>(res);
          const j = parsed.ok ? parsed.data : {};
          if (j.error === "feature_locked" || j.feature === NUTRITION_WEEK_PLAN_FEATURE) {
            openPaywall("hub_nutrition");
            return;
          }
        }
        if (!res.ok) {
          const parsed = await safeJsonResponse<{ error?: string }>(res);
          throw new Error(parsed.ok ? parsed.data.error ?? `Server error ${res.status}` : `Server error ${res.status}`);
        }
        const { readResolvedApiJson } = await import("@/lib/poll-result");
        const data = await readResolvedApiJson<{ plan: DayPlan[]; generatedAt: string }>(res, authFetch);
        setPlan(data?.plan ?? []);
        setGeneratedAt(data?.generatedAt ?? "");
        setSelectedDay(0);
        void import("@/lib/premium-moment-notify").then(({ notifyPremiumMoment }) => {
          notifyPremiumMoment("meal_plan", { source: "nutrition_week_plan" });
        });
        if (mealTryFree) {
          usage.markFeatureUsed(NUTRITION_WEEK_PLAN_FEATURE);
          usage.markFeatureUsed("hub_nutrition");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [authFetch, weather, usage, mealLocked, mealTryFree, openPaywall, setSelectedDay],
  );

  const day = plan?.[dayIdx];

  const WEATHER_OPTIONS: { val: WeatherType; label: string; icon: React.ReactNode }[] = [
    { val: "hot", label: t("nutrition_hub.ai_plan.weather_hot"), icon: <Sun className="w-3.5 h-3.5" /> },
    { val: "moderate", label: t("nutrition_hub.ai_plan.weather_moderate"), icon: <Wind className="w-3.5 h-3.5" /> },
    { val: "cold", label: t("nutrition_hub.ai_plan.weather_cold"), icon: <CloudSnow className="w-3.5 h-3.5" /> },
  ];

  const dayShorts = t("nutrition_hub.days", { returnObjects: true }) as string[];

  return (
    <LockedBlock locked={mealLocked && !plan}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t("nutrition_hub.ai_plan.title")}
              {mealTryFree && !isNutritionLivingV1Enabled() ? <TryFreeBadge /> : null}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("nutrition_hub.ai_plan.subtitle")}</p>
          </div>
          {generatedAt && (
            <span className="text-xs text-muted-foreground self-end">
              {t("nutrition_hub.ai_plan.generated", { date: new Date(generatedAt).toLocaleDateString() })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">{t("nutrition_hub.ai_plan.weather_label")}</span>
          <div className="flex rounded-full border border-white/[0.1] overflow-hidden bg-[rgba(18,28,60,0.72)]">
            {WEATHER_OPTIONS.map(({ val, label, icon }) => (
              <button
                key={val}
                type="button"
                onClick={() => setWeather(val)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                  weather === val
                    ? "bg-[rgba(255,184,0,0.18)] text-foreground"
                    : "hover:bg-white/[0.05] text-muted-foreground",
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {!plan && !loading && (
          <div className={cn(HUB_GLASS_SURFACE, "border border-dashed border-emerald-400/35 p-6 text-center space-y-3")}>
            <span className="text-4xl block">🤖</span>
            <p className="font-semibold text-foreground">{t("nutrition_hub.ai_plan.generate_cta")}</p>
            <p className="text-sm text-muted-foreground">{t("nutrition_hub.ai_plan.generate_desc")}</p>
            <Button type="button" onClick={() => generate(false)} className="gap-2">
              <Zap className="w-4 h-4" /> {t("nutrition_hub.ai_plan.generate_btn")}
            </Button>
          </div>
        )}

        {loading && <PlanLoadingSkeleton />}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("nutrition_hub.ai_plan.error_title")}</p>
              <p className="mt-0.5">{error}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => generate(true)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("nutrition_hub.ai_plan.retry")}
              </Button>
            </div>
          </div>
        )}

        {plan && !loading && (
          <>
            <MealPlanDaySelector
              labels={plan.map((_, i) => (Array.isArray(dayShorts) ? dayShorts[i] : "") ?? "")}
              selectedIndex={dayIdx}
              onSelect={setSelectedDay}
            />

            {day && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MEAL_TIME_KEYS.map((mt) => (
                  <MealCard key={mt.key} entry={day.meals[mt.key]} emoji={mt.emoji} label={t(mt.labelKey)} />
                ))}
              </div>
            )}

            {day &&
              (() => {
                const totals = MEAL_TIME_KEYS.reduce(
                  (acc, mt) => ({
                    calories: acc.calories + day.meals[mt.key].calories,
                    protein_g: acc.protein_g + day.meals[mt.key].protein_g,
                    carbs_g: acc.carbs_g + day.meals[mt.key].carbs_g,
                    fiber_g: acc.fiber_g + day.meals[mt.key].fiber_g,
                  }),
                  { calories: 0, protein_g: 0, carbs_g: 0, fiber_g: 0 },
                );
                return (
                  <div className={cn(HUB_TILE, "rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between")}>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {t("nutrition_hub.ai_plan.daily_total")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <NutritionPill
                        icon={<Flame className="w-3 h-3" />}
                        value={totals.calories}
                        label=" kcal"
                        color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      />
                      <NutritionPill
                        icon={<Zap className="w-3 h-3" />}
                        value={totals.protein_g}
                        label="g protein"
                        color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      />
                      <NutritionPill
                        icon={<Activity className="w-3 h-3" />}
                        value={totals.carbs_g}
                        label="g carbs"
                        color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      />
                      <NutritionPill
                        icon={<Leaf className="w-3 h-3" />}
                        value={totals.fiber_g}
                        label="g fiber"
                        color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      />
                    </div>
                  </div>
                );
              })()}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => generate(true)}
                disabled={loading}
              >
                <RefreshCw className="w-3.5 h-3.5" /> {t("nutrition_hub.ai_plan.regenerate")}
              </Button>
            </div>
          </>
        )}
      </div>
    </LockedBlock>
  );
}
