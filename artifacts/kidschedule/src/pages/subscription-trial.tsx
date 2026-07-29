import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialState } from "@/hooks/use-trial-state";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionTrialOffer } from "@/components/subscription-trial-offer";
import { markOnboardingTrialSeen } from "@/lib/subscription-funnel-storage";
import { POST_ONBOARDING_ACTIVATION_PATH } from "@/lib/onboarding-navigation";
import { FF_POST_ONBOARDING_TRIAL } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { shouldShowFreeTrialPaywall } from "@/lib/trial-paywall-variant";
import { isNativeAmyNestShell } from "@/lib/native-shell";

export default function SubscriptionTrialPage() {
  const [, setLocation] = useLocation();
  const { canStartTrial, isTrialing, entitlements } = useTrialState();
  const { isPremium, entitlementsResolved } = useSubscription();
  const days = entitlements?.limits.trialDays ?? 3;
  const showFreeTrial = shouldShowFreeTrialPaywall(entitlements, {
    entitlementsResolved,
  });

  useEffect(() => {
    trackSubscriptionEvent({ event: "paywall_opened", source: "post_onboarding_trial" });
    trackSubscriptionEvent({
      event: "trial_paywall_shown",
      source: "post_onboarding_trial",
      extra: { variant: "free_trial", days },
    });
    markOnboardingTrialSeen();
  }, [days]);

  useEffect(() => {
    if (!FF_POST_ONBOARDING_TRIAL) {
      setLocation(POST_ONBOARDING_ACTIVATION_PATH);
      return;
    }
    if (isPremium && !isTrialing) {
      setLocation(POST_ONBOARDING_ACTIVATION_PATH);
    }
  }, [FF_POST_ONBOARDING_TRIAL, isPremium, isTrialing, setLocation]);

  const goActivate = () => setLocation(POST_ONBOARDING_ACTIVATION_PATH);

  useEffect(() => {
    // Only bounce away once entitlements are resolved and free-trial paywall
    // is not the selected variant (never bounce on bare EXPIRED / soft age trial).
    if (!entitlementsResolved) return;
    if (!showFreeTrial && !canStartTrial && !isTrialing) {
      trackSubscriptionEvent({
        event: "trial_not_eligible",
        source: "post_onboarding_trial",
        extra: {
          subscriptionState: entitlements?.subscriptionState ?? "null",
          internalTrialExpired: String(entitlements?.internalTrialExpired ?? false),
        },
      });
      setLocation(POST_ONBOARDING_ACTIVATION_PATH);
    }
  }, [
    canStartTrial,
    entitlements?.internalTrialExpired,
    entitlements?.subscriptionState,
    isTrialing,
    showFreeTrial,
    entitlementsResolved,
    setLocation,
  ]);

  if (entitlementsResolved && !showFreeTrial && !canStartTrial && !isTrialing) {
    return null;
  }

  const playSecure = isNativeAmyNestShell();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{
        background:
          "linear-gradient(160deg,#0f0a2e 0%,#1a0d40 55%,#0d0824 100%)",
      }}
      data-testid="subscription-trial-page"
    >
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          Explore AmyNest Free for {days} Days
        </h1>
        <p className="text-sm text-white/70 leading-relaxed">
          Discover how AmyNest helps your family. Experience guided routines,
          parenting tools, and personalized AI with free daily limits — cancel anytime.
        </p>
        <ul className="text-left text-sm text-white/80 space-y-2">
          {[
            "Explore parenting tools free",
            "Guided routines & daily AI within free limits",
            "No charge today · Cancel anytime",
            playSecure ? "Secure payment via Google Play" : "Secure checkout",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <SubscriptionTrialOffer
          source="post_onboarding"
          variant="primary"
          ctaLabel="Explore AmyNest Free for 3 Days"
          onActivated={goActivate}
        />
        <Button
          variant="outline"
          className="w-full border-white/30 bg-transparent text-white hover:bg-white/10"
          onClick={() => {
            trackSubscriptionEvent({
              event: "subscription_checkout_opened",
              source: "post_onboarding_see_plans",
            });
            setLocation("/pricing?source=trial_see_plans");
          }}
        >
          See Plans
        </Button>
        <Button
          variant="ghost"
          className="w-full text-white/60 hover:text-white"
          onClick={goActivate}
        >
          Maybe Later
        </Button>
        {playSecure ? (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/45">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Secure payment via Google Play • Cancel anytime
          </p>
        ) : null}
      </div>
    </div>
  );
}
