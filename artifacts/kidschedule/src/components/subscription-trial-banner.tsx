import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useTrialState } from "@/hooks/use-trial-state";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

export function SubscriptionTrialBanner() {
  const { t } = useTranslation();
  const {
    isTrialing,
    trialDaysRemaining,
    trialExpiringSoon,
    checkTrialExpiry,
    isPremium,
  } = useTrialState();

  useEffect(() => {
    checkTrialExpiry();
  }, [checkTrialExpiry]);

  if (!FF_TRIAL_STATUS_UI || isPremium && !isTrialing) return null;
  if (!isTrialing || trialDaysRemaining === null) return null;

  return (
    <div
      className={[
        "mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm",
        trialExpiringSoon
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-primary/25 bg-primary/10",
      ].join(" ")}
      data-testid="subscription-trial-banner"
    >
      <div className="flex min-w-0 items-center gap-2">
        {trialExpiringSoon ? (
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="font-semibold text-foreground">
          {trialExpiringSoon
            ? t("subscription.trial.expiring", {
                defaultValue: "Trial ends soon",
                count: trialDaysRemaining,
              })
            : t("subscription.trial.active", {
                defaultValue: "{{count}} days left in your full-system trial",
                count: trialDaysRemaining,
              })}
        </span>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 text-xs font-bold text-primary underline"
        onClick={() =>
          trackSubscriptionEvent({
            event: "checkout_started",
            source: "trial_banner",
            plan: "yearly",
          })
        }
      >
        {t("subscription.trial.keep", { defaultValue: "Keep access" })}
      </Link>
    </div>
  );
}
