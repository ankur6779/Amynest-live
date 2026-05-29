import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialState } from "@/hooks/use-trial-state";
import { usePrimaryChild } from "@/hooks/use-primary-child";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionTrialOffer } from "@/components/subscription-trial-offer";
import { markOnboardingTrialSeen } from "@/lib/subscription-funnel-storage";
import { FF_POST_ONBOARDING_TRIAL } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { UPGRADE_MODAL } from "@workspace/subscription-marketing";

export default function SubscriptionTrialPage() {
  const [, setLocation] = useLocation();
  const { canStartTrial, isTrialing, entitlements } = useTrialState();
  const { isPremium } = useSubscription();
  const { childName } = usePrimaryChild();
  const days = entitlements?.limits.trialDays ?? 3;

  useEffect(() => {
    trackSubscriptionEvent({ event: "paywall_opened", source: "post_onboarding_trial" });
    markOnboardingTrialSeen();
  }, []);

  useEffect(() => {
    if (!FF_POST_ONBOARDING_TRIAL) {
      setLocation("/dashboard");
      return;
    }
    if (isPremium && !isTrialing) {
      setLocation("/dashboard");
    }
  }, [FF_POST_ONBOARDING_TRIAL, isPremium, isTrialing, setLocation]);

  const name = childName ?? "your child";
  const headline = childName
    ? `Try the full AmyNest system for ${name}`
    : UPGRADE_MODAL.title;

  const goDashboard = () => setLocation("/dashboard");

  useEffect(() => {
    if (!canStartTrial && !isTrialing) {
      setLocation("/dashboard");
    }
  }, [canStartTrial, isTrialing, setLocation]);

  if (!canStartTrial && !isTrialing) {
    return null;
  }

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
        <h1 className="text-2xl font-extrabold text-white">{headline}</h1>
        <p className="text-sm text-white/70 leading-relaxed">
          {days} days of Amy AI, Coach, routines, Hub, and Speech Coach—so you can
          see what steady support feels like before you choose a plan.
        </p>
        <ul className="text-left text-sm text-white/80 space-y-2">
          {[
            "Full Amy AI and Coach access",
            "Routines and Parent Hub journey",
            "Speech Coach practice sessions",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <SubscriptionTrialOffer
          source="post_onboarding"
          variant="primary"
          onActivated={goDashboard}
        />
        <Button
          variant="ghost"
          className="w-full text-white/60 hover:text-white"
          onClick={goDashboard}
        >
          {UPGRADE_MODAL.dismiss}
        </Button>
        <button
          type="button"
          className="text-xs text-white/45 underline"
          onClick={() => setLocation("/pricing?source=trial_skip")}
        >
          View plans instead
        </button>
      </div>
    </div>
  );
}
