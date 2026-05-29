import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialState } from "@/hooks/use-trial-state";
import { markTrialOfferDismissed } from "@/lib/subscription-funnel-storage";

type Props = {
  source: string;
  variant?: "primary" | "secondary";
  onActivated?: () => void;
  className?: string;
};

export function SubscriptionTrialOffer({
  source,
  variant = "secondary",
  onActivated,
  className = "",
}: Props) {
  const { canStartTrial, activateTrial, entitlements } = useTrialState();
  if (!canStartTrial) return null;

  const days = entitlements?.limits.trialDays ?? 3;

  const onClick = async () => {
    const ok = await activateTrial(source);
    if (ok) onActivated?.();
  };

  if (variant === "primary") {
    return (
      <Button
        type="button"
        className={`w-full h-12 font-extrabold ${className}`}
        onClick={() => void onClick()}
        data-testid="subscription-trial-cta"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Try {days} days free — full system
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15 ${className}`}
      data-testid="subscription-trial-cta-secondary"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4" />
        Try {days} days free before you subscribe
      </span>
    </button>
  );
}

export function dismissTrialOffer(): void {
  markTrialOfferDismissed();
}
