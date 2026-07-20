import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useTrialState } from "@/hooks/use-trial-state";
import { pricingCheckoutHref } from "@/lib/internal-trial";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

/**
 * Active internal trial reminder — always keeps Subscribe / Upgrade visible.
 * Never routes to cancel; never fires checkout_started (that is for store start).
 */
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

  if (!FF_TRIAL_STATUS_UI || (isPremium && !isTrialing)) return null;
  if (!isTrialing || trialDaysRemaining === null) return null;

  const subscribeHref = pricingCheckoutHref("trial_banner_subscribe", "yearly");
  const upgradeHref = pricingCheckoutHref("trial_banner_upgrade", "yearly");

  const message =
    trialDaysRemaining <= 1
      ? t("subscription.trial.last_day_countdown", {
          defaultValue: "You have {{count}} day remaining in Premium.",
          count: Math.max(trialDaysRemaining, 0),
        })
      : t("subscription.trial.days_remaining", {
          defaultValue: "You have {{count}} days remaining.",
          count: trialDaysRemaining,
        });

  const trackCta = (source: string) => {
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      source,
      plan: "yearly",
      extra: { trial_days_remaining: trialDaysRemaining },
    });
    trackSubscriptionEvent({
      event: "paywall_opened",
      source,
      plan: "yearly",
      extra: { trial_days_remaining: trialDaysRemaining },
    });
  };

  return (
    <div
      className={[
        "mx-4 mb-3 flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between",
        trialExpiringSoon
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-primary/25 bg-primary/10",
      ].join(" ")}
      data-testid="subscription-trial-banner"
      data-trial-days={trialDaysRemaining}
    >
      <div className="flex min-w-0 items-center gap-2">
        {trialExpiringSoon ? (
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="font-semibold text-foreground">{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-6 sm:pl-0">
        <Link
          href={subscribeHref}
          className="text-xs font-bold text-primary underline"
          onClick={() => trackCta("trial_banner_subscribe")}
          data-testid="trial-banner-subscribe"
        >
          {t("subscription.trial.subscribe_now", {
            defaultValue: "Subscribe Now",
          })}
        </Link>
        <Link
          href={upgradeHref}
          className="text-xs font-bold text-foreground/80 underline"
          onClick={() => trackCta("trial_banner_upgrade")}
          data-testid="trial-banner-upgrade"
        >
          {t("subscription.trial.upgrade_today", {
            defaultValue: "Upgrade Today",
          })}
        </Link>
      </div>
    </div>
  );
}
