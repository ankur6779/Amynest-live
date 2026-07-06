import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { isExpiredInternalTrial, pricingCheckoutHref } from "@/lib/internal-trial";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";

/** Shown on dashboard when an internal trial has ended — does not block app usage. */
export function SubscriptionTrialExpiredBanner() {
  const { t } = useTranslation();
  const { entitlements } = useSubscription();

  if (!FF_TRIAL_STATUS_UI || !isExpiredInternalTrial(entitlements)) return null;

  const href = pricingCheckoutHref("trial_expired_banner");

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
              defaultValue: "Your free trial has ended",
            })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("subscription.trial.expired_body", {
              defaultValue:
                "Continue Premium to keep your routines, parenting tools, and progress.",
            })}
          </p>
          <Link
            href={href}
            className="mt-2 inline-flex text-xs font-bold text-primary underline"
            onClick={() =>
              trackSubscriptionEvent({
                event: "checkout_started",
                source: "trial_expired_banner",
                plan: "yearly",
              })
            }
          >
            {t("subscription.trial.continue_premium", {
              defaultValue: "Continue Premium",
            })}
          </Link>
        </div>
      </div>
    </div>
  );
}
