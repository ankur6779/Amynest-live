import { ChevronRight, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useContinueJourney, useIntentMutations } from "@/hooks/use-intent-recovery";
import { useActionNavigation } from "@/hooks/use-action-navigation";
import { setActiveIntentId } from "@/hooks/use-intent-interruption-tracker";
import { trackHubExecutiveEvent } from "@/lib/hub-executive-analytics";

export function ContinueJourneyCard() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useContinueJourney();
  const { transition } = useIntentMutations();
  const { navigateAction } = useActionNavigation();

  if (isLoading || isError || !data?.hasUnfinished || !data.topIntent) {
    return null;
  }

  const intent = data.topIntent;

  const handleContinue = () => {
    trackHubExecutiveEvent("hub_executive_primary_action_tap", {
      actionId: intent.intentId,
      surface: "continue_journey",
    });
    setActiveIntentId(intent.intentId);
    void transition.mutateAsync({ intentId: intent.intentId, state: "started" });
    navigateAction(
      {
        actionTarget: intent.actionTarget as import("@workspace/action-routing").ActionTarget,
        href: intent.href,
        entityId: null,
      },
      { source: "hub_card" },
    );
    void transition.mutateAsync({ intentId: intent.intentId, state: "in_progress" });
  };

  const handleDismiss = () => {
    void transition.mutateAsync({ intentId: intent.intentId, state: "abandoned" });
    setActiveIntentId(null);
  };

  return (
    <section
      className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 mb-3"
      aria-labelledby="continue-journey-title"
      data-testid="continue-journey-card"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-500/15 p-2 shrink-0">
          <RotateCcw className="h-4 w-4 text-amber-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id="continue-journey-label"
            className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-0.5"
          >
            {t("parent_hub.continue_journey.label", { defaultValue: "Continue where you left off" })}
          </p>
          <h3 id="continue-journey-title" className="text-sm font-bold text-foreground leading-snug">
            {intent.title}
          </h3>
          {intent.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{intent.subtitle}</p>
          )}
          {data.amyLine && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
              {data.amyLine}
            </p>
          )}
          {intent.progressPct > 0 && (
            <div
              className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs"
              role="progressbar"
              aria-valuenow={intent.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${intent.progressPct}%` }}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button type="button" size="sm" onClick={handleContinue}>
              {t("parent_hub.continue_journey.continue", { defaultValue: "Continue" })}
              <ChevronRight className="h-4 w-4 ml-0.5" aria-hidden="true" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleDismiss}>
              {t("parent_hub.continue_journey.dismiss", { defaultValue: "Not now" })}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
