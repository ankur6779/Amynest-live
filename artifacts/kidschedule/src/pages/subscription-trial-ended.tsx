import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Crown, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/firebase-auth-hooks";
import { getGuestCheckoutBlock } from "@/lib/anonymous-auth";
import { shouldSuppressPremiumMonetization } from "@/lib/premium-entitlement-guard";
import { isExpiredInternalTrial, pricingCheckoutHref } from "@/lib/internal-trial";
import {
  markTrialEndedScreenDismissed,
  markTrialEndedScreenSeen,
} from "@/lib/subscription-funnel-storage";
import {
  trackSubscriptionEvent,
  syncRevenueCatSubscriptionAttributes,
} from "@/lib/subscription-analytics";
import {
  entitlementDebugSlice,
  logSubscriptionDebug,
} from "@/lib/subscription-debug";
import {
  assertTrialEndedAllowed,
  hasCompletedTrialEvidence,
  logTrialPaywallDecision,
  resolveTrialPaywallVariant,
  shouldShowTrialEndedPaywall,
} from "@/lib/trial-paywall-variant";
import { FEATURE_SHOWCASE, PURCHASE_SCREEN } from "@workspace/subscription-marketing";
import { useTranslation } from "react-i18next";

const BENEFITS = FEATURE_SHOWCASE.items.slice(0, 7);

/**
 * Full-screen conversion moment when the internal 3-day trial ends.
 * Primary CTA: one-tap Google Play / App Store purchase (yearly), else pricing.
 */
export default function SubscriptionTrialEndedPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { entitlements, entitlementsResolved, refresh } = useSubscription();
  const nativeBilling = useNativeBilling();
  const { toast } = useToast();
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const expired = isExpiredInternalTrial(entitlements);
  const decision = resolveTrialPaywallVariant(entitlements, {
    entitlementsResolved,
    navigationSource: "trial_ended_fullscreen",
  });
  const alreadyPaid = shouldSuppressPremiumMonetization({
    entitlements,
    entitlementsResolved,
  });

  const mayShowTrialEnded = shouldShowTrialEndedPaywall(entitlements, {
    entitlementsResolved,
  });

  useEffect(() => {
    if (alreadyPaid) {
      setLocation("/dashboard");
      return;
    }
    // Failsafe: never keep a brand-new / never-trialed user on Trial Ended.
    if (entitlementsResolved && entitlements && !mayShowTrialEnded) {
      trackSubscriptionEvent({
        event: "trial_not_eligible",
        source: "trial_ended_false_positive_redirect",
        extra: {
          action: "leave_trial_ended",
          reason: decision.reason,
          expiredLegacy: expired,
        },
      });
      setLocation("/subscription-trial");
    }
  }, [
    alreadyPaid,
    decision.reason,
    entitlements,
    entitlementsResolved,
    expired,
    mayShowTrialEnded,
    setLocation,
  ]);

  useEffect(() => {
    if (!entitlementsResolved || !mayShowTrialEnded) return;

    // DEV: crash if Trial Ended UI is about to paint without natural evidence.
    assertTrialEndedAllowed(entitlements, {
      entitlementsResolved,
      navigationSource: "trial_ended_fullscreen",
      surface: "SubscriptionTrialEndedPage",
    });

    logTrialPaywallDecision(decision, entitlements, {
      entitlementsResolved,
      navigationSource: "trial_ended_fullscreen",
    });
    markTrialEndedScreenSeen();
    trackSubscriptionEvent({
      event: "paywall_opened",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    trackSubscriptionEvent({
      event: "trial_expired",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    trackSubscriptionEvent({
      event: "trial_paywall_shown",
      source: "trial_ended_fullscreen",
      plan: "yearly",
      extra: { variant: "trial_ended", reason: decision.reason },
    });
    logSubscriptionDebug({
      phase: "trial_ended_screen_shown",
      source: "trial_ended_fullscreen",
      entitlement: entitlementDebugSlice(entitlements),
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
        unavailableReason: nativeBilling.unavailableReason,
      },
      extra: {
        reason: decision.reason,
        hasCompletedTrialEvidence: hasCompletedTrialEvidence(entitlements),
        internalTrialExpired: String(entitlements?.internalTrialExpired ?? false),
      },
    });
  }, [entitlements, entitlementsResolved, mayShowTrialEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Never paint Trial Ended chrome without natural evidence (avoid flash).
  if (entitlementsResolved && !mayShowTrialEnded) {
    return null;
  }

  const maybeLater = useCallback(() => {
    markTrialEndedScreenDismissed();
    trackSubscriptionEvent({
      event: "value_bridge_dismissed",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    setLocation("/dashboard");
  }, [setLocation]);

  const continuePremium = useCallback(async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      toast({
        title: t("components.paywall_modal.guest_checkout_blocked_title", {
          defaultValue: "Sign in required",
        }),
        description: guestBlock.message,
        variant: "destructive",
      });
      return;
    }
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    trackSubscriptionEvent({
      event: "checkout_started",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    trackSubscriptionEvent({
      event: "subscription_checkout_opened",
      source: "trial_ended_fullscreen",
      plan: "yearly",
    });
    logSubscriptionDebug({
      phase: "trial_ended_checkout_start",
      source: "trial_ended_fullscreen",
      plan: "yearly",
      entitlement: entitlementDebugSlice(entitlements),
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
      },
    });

    if (nativeBilling.wrapperPresent && nativeBilling.available) {
      setSubmitting(true);
      const res = await nativeBilling.purchase("yearly", {
        source: "trial_ended_fullscreen",
      });
      setSubmitting(false);
      logSubscriptionDebug({
        phase: "trial_ended_purchase_result",
        source: "trial_ended_fullscreen",
        plan: "yearly",
        purchase: {
          ok: res.ok,
          userCancelled: res.userCancelled,
          error: res.reason,
        },
      });
      if (res.userCancelled) {
        trackSubscriptionEvent({
          event: "purchase_cancelled",
          source: "trial_ended_fullscreen",
          plan: "yearly",
        });
      }
      if (res.ok && res.isPremiumSubscriber) {
        void syncRevenueCatSubscriptionAttributes({
          last_plan: "yearly",
          last_paywall_reason: "trial_ended",
        });
        await refresh();
        toast({
          title: PURCHASE_SCREEN.successTitle,
          description: PURCHASE_SCREEN.successBody,
        });
        setLocation("/dashboard");
        return;
      }
      if (!res.userCancelled) {
        trackSubscriptionEvent({
          event: "purchase_failed",
          source: "trial_ended_fullscreen",
          plan: "yearly",
        });
        toast({
          title: t("pricing.checkout_unavailable", {
            defaultValue: "Purchase unavailable",
          }),
          description:
            res.reason ??
            t("pricing.google_play_unavailable", {
              defaultValue: "Google Play billing is unavailable. Try again shortly.",
            }),
          variant: "destructive",
        });
      }
      return;
    }

    setLocation(pricingCheckoutHref("trial_ended_fullscreen", "yearly"));
  }, [
    entitlements,
    nativeBilling,
    refresh,
    setLocation,
    t,
    toast,
    user,
  ]);

  if (alreadyPaid || (entitlements && !expired)) {
    return null;
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10 text-center"
      style={{
        background:
          "linear-gradient(160deg,#0f0a2e 0%,#1a0d40 55%,#0d0824 100%)",
      }}
      data-testid="subscription-trial-ended-page"
    >
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-primary shadow-lg">
          <Crown className="h-8 w-8 text-white" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            {t("subscription.trial.ended_fullscreen_title", {
              defaultValue: "Your free exploration has ended",
            })}
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            {t("subscription.trial.ended_fullscreen_subtitle", {
              defaultValue:
                "Keep the free tools you already use — upgrade for unlimited guidance, learning, and family insights.",
            })}
          </p>
        </div>

        <ul className="text-left space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          {BENEFITS.map((item) => (
            <li key={item.name} className="flex items-start gap-2 text-sm text-white/85">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
              <span>
                <span className="font-semibold text-white">{item.name}</span>
                {" — "}
                {item.outcome}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-3 sticky bottom-0 pt-2">
          <Button
            onClick={() => void continuePremium()}
            disabled={submitting || nativeBilling.purchasing}
            className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-violet-600 border-0"
            data-testid="trial-ended-continue-premium"
            analyticsId="trial_ended_continue_premium"
            analyticsFeature="premium"
          >
            {submitting || nativeBilling.purchasing
              ? t("pricing.google_play_processing", {
                  defaultValue: "Opening Google Play…",
                })
              : t("subscription.trial.continue_premium", {
                  defaultValue: "Continue My Child's Journey",
                })}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-white/60 hover:text-white"
            onClick={maybeLater}
            data-testid="trial-ended-maybe-later"
          >
            {t("subscription.trial.maybe_later", { defaultValue: "Maybe Later" })}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
            <Shield className="h-3 w-3" aria-hidden />
            {nativeBilling.wrapperPresent
              ? t("subscription.trial.secure_play", {
                  defaultValue: "Secure payment via Google Play · Cancel anytime",
                })
              : PURCHASE_SCREEN.trustLine}
          </p>
        </div>
      </div>
    </div>
  );
}
