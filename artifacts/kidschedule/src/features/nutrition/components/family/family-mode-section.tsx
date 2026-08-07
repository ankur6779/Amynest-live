import { safeJsonResponse } from "@/lib/safe-json-response";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Brain, Globe, Loader2, RefreshCw, Search, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { usePaywall } from "@/contexts/paywall-context";
import type { FamilyPortionResult } from "@/features/nutrition/types/nutrition-hub.types";
import { NUTRITION_FAMILY_AI_FEATURE } from "@/features/nutrition/lib/constants";
import { PortionScale } from "@/features/nutrition/components/family/portion-scale";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { isNutritionLivingV1Enabled } from "@/lib/nutrition/living-room";

export function FamilyModeSection() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const usage = useFeatureUsage();
  const { openPaywall } = usePaywall();
  const { suggestedMeal } = useNutritionContext();
  const familyLocked = usage.isFeatureLocked(NUTRITION_FAMILY_AI_FEATURE);
  const familyTryFree = !usage.isPremium && !usage.hasUsedFeature(NUTRITION_FAMILY_AI_FEATURE);
  const [dishInput, setDishInput] = useState("");
  const [result, setResult] = useState<FamilyPortionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (suggestedMeal && !dishInput) setDishInput(suggestedMeal);
  }, [suggestedMeal]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useCallback(
    async (forceRefresh = false) => {
      const dish = dishInput.trim();
      if (!dish) return;
      if (
        !usage.isPremium &&
        (familyLocked || (forceRefresh && usage.hasUsedFeature(NUTRITION_FAMILY_AI_FEATURE)))
      ) {
        openPaywall("hub_nutrition");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/meals/family-portions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_name: dish, forceRefresh }),
        });
        if (res.status === 402) {
          const j = ((await safeJsonResponse(res).then((p) => (p.ok ? p.data : {})))) as { error?: string; feature?: string };
          if (j.error === "feature_locked" || j.feature === NUTRITION_FAMILY_AI_FEATURE) {
            openPaywall("hub_nutrition");
            return;
          }
        }
        if (!res.ok) {
          const j = ((await safeJsonResponse(res).then((p) => (p.ok ? p.data : {})))) as { error?: string };
          throw new Error(j.error ?? `Server error ${res.status}`);
        }
        const { readResolvedApiJson } = await import("@/lib/poll-result");
        const data = await readResolvedApiJson<FamilyPortionResult>(res, authFetch);
        setResult(data ?? null);
        if (familyTryFree) {
          usage.markFeatureUsed(NUTRITION_FAMILY_AI_FEATURE);
          usage.markFeatureUsed("hub_nutrition");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [authFetch, dishInput, usage, familyLocked, familyTryFree, openPaywall],
  );

  return (
    <LockedBlock locked={familyLocked && !result}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4">
          <Users className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
              {t("nutrition_hub.family.section_title")}
              {familyTryFree && !isNutritionLivingV1Enabled() ? <TryFreeBadge /> : null}
            </p>
            <p className="text-sm text-foreground">{t("nutrition_hub.family.section_desc")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="family-dish-input">
            {t("nutrition_hub.family.enter_dish")}
          </label>
          <div className="flex gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="family-dish-input"
                value={dishInput}
                onChange={(e) => setDishInput(e.target.value)}
                placeholder={t("nutrition_hub.family.dish_placeholder")}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <Button
              type="button"
              onClick={() => generate()}
              disabled={loading || !dishInput.trim()}
              className="gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {t("nutrition_hub.family.generate_btn")}
            </Button>
          </div>

          {suggestedMeal && dishInput !== suggestedMeal && (
            <button
              type="button"
              onClick={() => setDishInput(suggestedMeal)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition"
            >
              <Globe className="w-3 h-3" />
              {t("nutrition_hub.family.use_from_planner", { meal: suggestedMeal })}
            </button>
          )}
        </div>

        {!result && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
            <span className="text-4xl block">🍽️</span>
            <p className="text-sm text-muted-foreground">{t("nutrition_hub.family.empty_hint")}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-1/3 rounded-full bg-muted" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl border bg-muted/30" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 ml-0 gap-1"
                onClick={() => generate(true)}
              >
                <RefreshCw className="w-3 h-3" /> {t("nutrition_hub.family.error_retry")}
              </Button>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-xl">{result.meal}</h3>
              {result.allergy_note && (
                <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                  {t("nutrition_hub.family.allergy_modified")}
                </Badge>
              )}
            </div>

            <PortionScale portions={result.portions} />

            {result.feeding_tip && (
              <div className="rounded-xl bg-muted border border-border p-3 flex items-start gap-2">
                <Brain className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    {t("nutrition_hub.family.feeding_tip_label")}
                  </p>
                  <p className="text-sm text-foreground">{result.feeding_tip}</p>
                </div>
              </div>
            )}

            {result.allergy_note && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{result.allergy_note}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">{t("nutrition_hub.family.smart_text")}</p>
              <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => generate(true)}>
                <RefreshCw className="w-3.5 h-3.5" /> {t("nutrition_hub.family.regenerate")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </LockedBlock>
  );
}
