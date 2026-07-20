import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import {
  isExpiredInternalTrial,
  isInternalTrial,
  pricingCheckoutHref,
} from "@/lib/internal-trial";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

/**
 * Premium CTA after first-routine value.
 * Mid-trial: upgrade nudge (Subscribe Now) — never cancel-only.
 * Free (non-trial): Go Premium after activation.
 * Expired trial: handled by trial-ended fullscreen / expired banner.
 */
export function SubscriptionPostActivationBanner() {
  const { t } = useTranslation();
  const { entitlements } = useSubscription();

  if (!entitlements) return null;
  if (entitlements.isPremiumSubscriber) return null;
  if (isExpiredInternalTrial(entitlements)) return null;
  if (!hasFirstRoutineActivationProgress()) return null;

  const midTrial = isInternalTrial(entitlements);
  const source = midTrial ? "post_activation_trial_upgrade" : "post_activation_banner";
  const href = pricingCheckoutHref(source, "yearly");

  return (
    <div
      className="mx-4 mb-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3"
      data-testid="subscription-post-activation-banner"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {midTrial
              ? t("subscription.post_activation.trial_title", {
                  defaultValue: "Loving your routines? Upgrade today",
                })
              : t("subscription.post_activation.title", {
                  defaultValue: "Unlock the full AmyNest experience",
                })}
          </span>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs font-bold text-primary underline"
          data-testid="post-activation-banner-cta"
          onClick={() => {
            trackSubscriptionEvent({
              event: "subscribe_clicked",
              source,
              plan: "yearly",
            });
            trackSubscriptionEvent({
              event: "paywall_opened",
              source,
              plan: "yearly",
            });
          }}
        >
          {midTrial
            ? t("subscription.trial.subscribe_now", {
                defaultValue: "Subscribe Now",
              })
            : t("subscription.post_activation.cta", {
                defaultValue: "Go Premium",
              })}
        </Link>
      </div>
    </div>
  );
}
