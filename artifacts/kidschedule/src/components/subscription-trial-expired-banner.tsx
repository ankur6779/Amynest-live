import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";
import { shouldShowTrialEndedPaywall } from "@/lib/trial-paywall-variant";

/**
 * Fallback banner when fullscreen trial-ended was dismissed (cooldown).
 * Primary conversion path is /subscription-trial-ended.
 */
export function SubscriptionTrialExpiredBanner() {
  const { t } = useTranslation();
  const { entitlements, entitlementsResolved } = useSubscription();

  if (
    !FF_TRIAL_STATUS_UI
    || !shouldShowTrialEndedPaywall(entitlements, { entitlementsResolved })
  ) {
    return null;
  }

  const href = "/subscription-trial-ended";

  return (
    <div
      className="mx-4 mb-3 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 to-primary/10 px-4 py-3"
      data-testid="subscription-trial-expired-banner"
    >
      <div className="flex items-start gap-3">
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {t("subscription.trial.expired_title", {
              defaultValue: "Your free exploration has ended",
            })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("subscription.trial.expired_body", {
              defaultValue:
                "Upgrade for unlimited guidance, learning, and family insights.",
            })}
          </p>
          <Link
            href={href}
            className="mt-2 inline-flex text-xs font-bold text-primary underline"
            data-testid="trial-expired-banner-cta"
            onClick={() => {
              trackSubscriptionEvent({
                event: "subscribe_clicked",
                source: "trial_expired_banner",
                plan: "yearly",
              });
              trackSubscriptionEvent({
                event: "paywall_opened",
                source: "trial_expired_banner",
                plan: "yearly",
              });
            }}
          >
            {t("subscription.trial.continue_premium", {
              defaultValue: "Continue My Child's Journey",
            })}
          </Link>
        </div>
      </div>
    </div>
  );
}
