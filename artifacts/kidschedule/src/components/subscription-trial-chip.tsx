import { Link } from "wouter";
import { useTrialState } from "@/hooks/use-trial-state";
import { pricingCheckoutHref } from "@/lib/internal-trial";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

/** Header chip — countdown + Subscribe Now (never cancel-only). */
export function SubscriptionTrialChip() {
  const { isTrialing, trialDaysRemaining, isPremium } = useTrialState();

  if (!FF_TRIAL_STATUS_UI) return null;
  if (!isTrialing || trialDaysRemaining === null) return null;
  if (isPremium && !isTrialing) return null;

  const href = pricingCheckoutHref("trial_chip", "yearly");

  return (
    <Link
      href={href}
      className="mr-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/25"
      data-testid="subscription-trial-chip"
      onClick={() => {
        trackSubscriptionEvent({
          event: "subscribe_clicked",
          source: "trial_chip",
          plan: "yearly",
          extra: { trial_days_remaining: trialDaysRemaining },
        });
      }}
    >
      {trialDaysRemaining}d left · Subscribe
    </Link>
  );
}
