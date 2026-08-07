import { useEffect, useCallback, useState } from "react";
import { Utensils, Sparkles, Loader2, RefreshCw, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { FF_INFANT_PREMIUM } from "@/lib/infant-feature-flags";
import { useInfantFeedingPlan } from "@/hooks/use-infant-feeding-plan";
import {
  trackInfantFeedingPlanCtaViewed,
  trackInfantFeedingPlanGenerated,
  trackInfantFeedingPlanUpgradePromptShown,
} from "@/lib/infant-hub-analytics";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";

type Props = {
  childId: number;
  childName: string;
  ageMonths: number;
};

function TryFreeBadge() {
  const quietRoom = useParentHubQuietModule();
  if (quietRoom) return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200 px-2 py-0.5 rounded-full">
      1 free plan
    </span>
  );
}

export function InfantFeedingPlanPanel({ childId, childName, ageMonths }: Props) {
  const [dayIdx, setDayIdx] = useState(0);
  const {
    plan,
    generatedAt,
    loading,
    error,
    locked,
    tryFree,
    isPremium,
    loadCached,
    generate,
  } = useInfantFeedingPlan(childId);

  useEffect(() => {
    if (!FF_INFANT_PREMIUM || ageMonths < 6) return;
    trackInfantFeedingPlanCtaViewed(childId, ageMonths);
    void loadCached();
  }, [childId, ageMonths, loadCached]);

  const handleGenerate = useCallback(
    async (forceRefresh = false) => {
      if (locked) {
        trackInfantFeedingPlanUpgradePromptShown(childId, ageMonths);
        await generate(forceRefresh);
        return;
      }
      const result = await generate(forceRefresh);
      if (result) {
        trackInfantFeedingPlanGenerated(childId, ageMonths, { cached: false });
        setDayIdx(0);
      }
    },
    [ageMonths, childId, generate, locked],
  );

  if (!FF_INFANT_PREMIUM || ageMonths < 6) return null;

  const day = plan?.days[dayIdx];

  return (
    <div
      className="rounded-2xl border border-orange-200/60 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 p-4 space-y-3 mt-4"
      data-testid="infant-feeding-plan-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          <div>
            <h4 className="text-sm font-bold text-foreground">7-Day Feeding Roadmap</h4>
            <p className="text-[11px] text-muted-foreground">
              Solids plan for {childName} (6–24 mo)
            </p>
          </div>
        </div>
        {tryFree && <TryFreeBadge />}
        {isPremium && (
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-300">Unlimited</span>
        )}
      </div>

      {!plan && !loading && (
        <button
          type="button"
          onClick={() => void handleGenerate()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:brightness-110 transition"
        >
          {locked ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {locked ? PREMIUM_VOICE.continueCta : "Generate feeding roadmap"}
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building your roadmap…
        </div>
      )}

      {error && (
        <p className="text-[12px] text-destructive text-center">{error}</p>
      )}

      {plan && !loading && (
        <div className="space-y-3 text-[12px]">
          <p className="text-foreground/90 leading-snug">{plan.roadmapSummary}</p>

          {plan.portionGuidance && (
            <p className="text-muted-foreground italic">{plan.portionGuidance}</p>
          )}

          {day && (
            <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDayIdx((i) => Math.max(0, i - 1))}
                  disabled={dayIdx === 0}
                  className="p-1 text-muted-foreground disabled:opacity-30"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-bold text-foreground">{day.day}</p>
                <button
                  type="button"
                  onClick={() => setDayIdx((i) => Math.min((plan.days.length ?? 1) - 1, i + 1))}
                  disabled={dayIdx >= (plan.days.length ?? 1) - 1}
                  className="p-1 text-muted-foreground disabled:opacity-30"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {Object.entries(day.meals).map(([slot, meal]) => (
                <div key={slot} className="border-t border-border/30 pt-2 first:border-0 first:pt-0">
                  <p className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-300">
                    {slot.replace("_", " ")}
                  </p>
                  <p className="font-medium text-foreground">{meal.name}</p>
                  <p className="text-muted-foreground">{meal.texture} · {meal.portion}</p>
                </div>
              ))}
            </div>
          )}

          {(plan.allergyIntroductionRoadmap?.length ?? 0) > 0 ? (
            <div className="text-muted-foreground">
              <p className="font-bold text-foreground mb-1">Allergy introduction roadmap</p>
              <ul className="space-y-0.5">
                {plan.allergyIntroductionRoadmap!.map((item) => (
                  <li key={`${item.week}-${item.food}`}>
                    • Week {item.week}: {item.food} — {item.method}
                  </li>
                ))}
              </ul>
            </div>
          ) : plan.allergyIntroTimeline.length > 0 ? (
            <div className="text-muted-foreground">
              <p className="font-bold text-foreground mb-1">Allergy intro order</p>
              <ul className="space-y-0.5">
                {plan.allergyIntroTimeline.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {generatedAt && (
            <p className="text-[10px] text-muted-foreground text-center">
              Generated {new Date(generatedAt).toLocaleDateString()}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleGenerate(true)}
            disabled={locked && !isPremium}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className="h-3 w-3" />
            {isPremium
              ? "Refresh roadmap"
              : locked
                ? PREMIUM_VOICE.continueCta
                : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}
