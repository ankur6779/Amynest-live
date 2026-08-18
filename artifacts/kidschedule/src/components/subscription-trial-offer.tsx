import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialState } from "@/hooks/use-trial-state";
import { useSubscription } from "@/hooks/use-subscription";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { useToast } from "@/hooks/use-toast";
import { markTrialOfferDismissed } from "@/lib/subscription-funnel-storage";
import { shouldShowFreeTrialPaywall } from "@/lib/trial-paywall-variant";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { logSubscriptionDebug } from "@/lib/subscription-debug";
import { isNativeAmyNestShell } from "@/lib/native-shell";

type Props = {
  source: string;
  variant?: "primary" | "secondary";
  /** Override primary CTA label. */
  ctaLabel?: string;
  onActivated?: () => void;
  className?: string;
};

/**
 * Free-trial CTA. Prefer Google Play / App Store purchase (intro trial) on
 * native shells; fall back to server startTrial for web.
 *
 * Visibility is gated by the paywall state machine (free_trial), NOT bare
 * canStartTrial — soft internal age trials must still show the explore CTA.
 */
export function SubscriptionTrialOffer({
  source,
  variant = "secondary",
  ctaLabel,
  onActivated,
  className = "",
}: Props) {
  const { canStartTrial, activateTrial, entitlements } = useTrialState();
  const { entitlementsResolved, refresh } = useSubscription();
  const nativeBilling = useNativeBilling();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const showFreeTrial = shouldShowFreeTrialPaywall(entitlements, {
    entitlementsResolved,
  });
  if (!showFreeTrial && !canStartTrial) return null;

  const primaryLabel = ctaLabel ?? "Continue with AmyNest";

  const onClick = async () => {
    if (submitting || nativeBilling.purchasing) return;
    setSubmitting(true);
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      source,
      plan: "yearly",
      extra: { intent: "start_free_trial" },
    });
    trackSubscriptionEvent({
      event: "checkout_started",
      source,
      plan: "yearly",
      extra: { intent: "start_free_trial" },
    });
    logSubscriptionDebug({
      phase: "free_trial_cta_click",
      source,
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
        unavailableReason: nativeBilling.unavailableReason,
      },
      extra: {
        canStartTrial,
        showFreeTrial,
        provider: entitlements?.provider ?? "null",
        subscriptionState: entitlements?.subscriptionState ?? "null",
      },
    });

    try {
      // Native: start Play / App Store free trial via yearly package.
      if (isNativeAmyNestShell() && nativeBilling.wrapperPresent && nativeBilling.available) {
        const res = await nativeBilling.purchase("yearly", { source });
        if (res.ok && res.isPremiumSubscriber) {
          await refresh();
          onActivated?.();
          return;
        }
        if (res.userCancelled) return;
        toast({
          title: "Couldn’t start trial",
          description: res.reason ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Web / billing unavailable: server-side internal trial start.
      const ok = await activateTrial(source);
      if (ok) {
        onActivated?.();
        return;
      }
      toast({
        title: "Couldn’t start trial",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (variant === "primary") {
    return (
      <Button
        type="button"
        className={`w-full h-12 font-extrabold ${className}`}
        onClick={() => void onClick()}
        disabled={submitting || nativeBilling.purchasing}
        data-testid="subscription-trial-cta"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {submitting || nativeBilling.purchasing ? "Starting…" : primaryLabel}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={submitting || nativeBilling.purchasing}
      className={`w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15 ${className}`}
      data-testid="subscription-trial-cta-secondary"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4" />
        Explore AmyNest — Premium is optional
      </span>
    </button>
  );
}

export function dismissTrialOffer(): void {
  markTrialOfferDismissed();
}
