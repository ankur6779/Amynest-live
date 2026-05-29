import { Link } from "wouter";
import { useTrialState } from "@/hooks/use-trial-state";
import { FF_TRIAL_STATUS_UI } from "@/lib/subscription-feature-flags";

export function SubscriptionTrialChip() {
  const { isTrialing, trialDaysRemaining, isPremium } = useTrialState();

  if (!FF_TRIAL_STATUS_UI) return null;
  if (!isTrialing || trialDaysRemaining === null) return null;
  if (isPremium && !isTrialing) return null;

  return (
    <Link
      href="/pricing"
      className="mr-2 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/25"
      data-testid="subscription-trial-chip"
    >
      Trial · {trialDaysRemaining}d
    </Link>
  );
}
