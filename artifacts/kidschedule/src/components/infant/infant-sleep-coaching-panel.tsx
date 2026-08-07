import { useEffect, useCallback } from "react";
import { Moon, Sparkles, Loader2, RefreshCw, Lock } from "lucide-react";
import { FF_INFANT_PREMIUM } from "@/lib/infant-feature-flags";
import { useInfantSleepCoach } from "@/hooks/use-infant-sleep-coach";
import {
  trackInfantSleepCoachCtaViewed,
  trackInfantSleepCoachPlanGenerated,
  trackInfantSleepCoachUpgradePromptShown,
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
    <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 px-2 py-0.5 rounded-full">
      1 free plan
    </span>
  );
}

export function InfantSleepCoachingPanel({ childId, childName, ageMonths }: Props) {
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
  } = useInfantSleepCoach(childId);

  useEffect(() => {
    if (!FF_INFANT_PREMIUM) return;
    trackInfantSleepCoachCtaViewed(childId, ageMonths);
    void loadCached();
  }, [childId, ageMonths, loadCached]);

  const handleGenerate = useCallback(
    async (forceRefresh = false) => {
      if (locked) {
        trackInfantSleepCoachUpgradePromptShown(childId, ageMonths);
        await generate(forceRefresh);
        return;
      }
      const result = await generate(forceRefresh);
      if (result) {
        trackInfantSleepCoachPlanGenerated(childId, ageMonths, { cached: false });
      }
    },
    [ageMonths, childId, generate, locked],
  );

  if (!FF_INFANT_PREMIUM) return null;

  return (
    <div
      className="rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20 p-4 space-y-3"
      data-testid="infant-sleep-coaching-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
          <div>
            <h4 className="text-sm font-bold text-foreground">AI Sleep Coach</h4>
            <p className="text-[11px] text-muted-foreground">
              Personalized plan for {childName} from nap history
            </p>
          </div>
        </div>
        {tryFree && <TryFreeBadge />}
        {isPremium && (
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300">Unlimited</span>
        )}
      </div>

      {!plan && !loading && (
        <button
          type="button"
          onClick={() => void handleGenerate()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:brightness-110 transition"
        >
          {locked ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {locked ? PREMIUM_VOICE.continueCta : "Generate sleep plan"}
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building your plan…
        </div>
      )}

      {error && (
        <p className="text-[12px] text-destructive text-center">{error}</p>
      )}

      {plan && !loading && (
        <div className="space-y-3 text-[12px]">
          <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-border/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
              Tonight
            </p>
            <p className="text-foreground leading-snug">{plan.bedtimeRecommendation}</p>
          </div>

          <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-border/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
              This week
            </p>
            <p className="text-foreground leading-snug">{plan.weeklyFocus}</p>
          </div>

          {plan.actionSteps.length > 0 && (
            <ol className="space-y-1.5 list-decimal list-inside text-foreground/90">
              {plan.actionSteps.map((step, i) => (
                <li key={i} className="leading-snug">{step}</li>
              ))}
            </ol>
          )}

          {plan.wakeWindowAdjustments.length > 0 && (
            <div className="text-muted-foreground">
              <p className="font-bold text-foreground mb-1">Wake window tweaks</p>
              <ul className="space-y-0.5">
                {plan.wakeWindowAdjustments.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

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
              ? "Refresh plan"
              : locked
                ? PREMIUM_VOICE.continueCta
                : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}
