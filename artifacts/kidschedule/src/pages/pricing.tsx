import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check, Smartphone, Clock,
  Shield, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useNativeBilling } from "@/hooks/use-native-billing";
import {
  isAndroidDevice,
  PLAY_STORE_URL,
  APPLE_MANAGE_SUBSCRIPTIONS_URL,
  PLAY_MANAGE_SUBSCRIPTIONS_URL,
} from "@/lib/geo";
import { usePricingRegion, applyIndiaPricing } from "@/lib/pricing-region";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { SubscriptionWinBackBanner } from "@/components/subscription-win-back-banner";
import { SubscriptionTrustSection } from "@/components/subscription-trust-section";
import { SubscriptionTrialOffer } from "@/components/subscription-trial-offer";
import { AmyCancelAgent } from "@/components/amy-cancel-agent";
import {
  PostPurchaseUpsellModal,
  shouldShowPostPurchaseUpsell,
} from "@/components/post-purchase-upsell-modal";
import {
  sortPlanCards,
  resolveDefaultPlanId,
  trackHubJourneyAnnualSelected,
  trackPlanSelected,
} from "@/lib/subscription-plans";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import {
  entitlementDebugSlice,
  logSubscriptionDebug,
} from "@/lib/subscription-debug";
import {
  FF_POST_PURCHASE_ANNUAL_UPSELL,
  FF_PRICING_STICKY_CTA,
} from "@/lib/subscription-feature-flags";
import {
  PLAN_LIVING_AUDIENCE,
  planBadgeLabel,
  planCardPricePresentation,
  planStorePriceOptions,
  pricingPlanCardClasses,
  pricingPlanPriceClasses,
} from "@/lib/pricing-plan-card-ui";
import { PlanPriceLines } from "@/components/plan-price-lines";
import { SubscriptionPricingStickyCta } from "@/components/subscription-pricing-sticky-cta";
import { usePlanCardViewAnalytics } from "@/hooks/use-plan-card-view-analytics";
import type { PlanBillingLabels } from "@/lib/plan-price";
import { monthlyEquivalentForPlan } from "@/lib/plan-price";
import { wasPostPurchaseUpsellDismissed } from "@/lib/subscription-funnel-storage";
import { getGuestCheckoutBlock } from "@/lib/anonymous-auth";
import { shouldSuppressPremiumMonetization } from "@/lib/premium-entitlement-guard";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { PURCHASE_SCREEN } from "@workspace/subscription-marketing";
import "./pricing-living.css";

const HUB_ACTIVE_CHILD_KEY = "amynest:hub:activeChildId";

// Dates >= this year are sentinel "no real expiry" values from the DB
const SENTINEL_YEAR = 2099;
function isSentinelDate(iso: string) {
  return new Date(iso).getFullYear() >= SENTINEL_YEAR;
}

// i18n-ignore-start — GooglePayLogo: "Google Pay" and "Pay" are brand proper nouns, must not be translated
// audit-block-ignore-start — Google Pay official brand colors (Google design guidelines require exact hex)
/** Google Pay wordmark SVG (Google's official brand colors) */
function GooglePayLogo({ height = 24 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 120 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Google Pay">
      <path d="M23.5 12.6c0-1.1-.1-2.2-.3-3.2H12v6h6.5c-.3 1.6-1.2 2.9-2.5 3.8v3h4c2.3-2.1 3.7-5.3 3.7-9.6-.1 0-.2 0-.2-.2z" fill="#4285F4"/>
      <path d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-4-3c-1.1.7-2.4 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.4v3.1C3.4 21.5 7.4 24 12 24z" fill="#34A853"/>
      <path d="M5.5 14.4c-.3-.8-.4-1.6-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10.1 0 12s.5 3.8 1.4 5.5l4.1-3.1z" fill="#FBBC04"/>
      <path d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.9 1.2 15.1 0 12 0 7.4 0 3.4 2.5 1.4 6.5l4.1 3.1C6.4 6.8 9 4.8 12 4.8z" fill="#EA4335"/>
      <text x="30" y="34" fontFamily="Google Sans,Arial,sans-serif" fontSize="28" fontWeight="500" fill="#3C4043">Pay</text>
    </svg>
  );
}
// audit-block-ignore-end
// i18n-ignore-end

export default function PricingPage() {
  const { t } = useTranslation();
  const {
    plans,
    entitlements,
    entitlementsResolved,
    checkoutRazorpay,
    loading,
    cancelSubscription,
  } = useSubscription();
  const { user } = useUser();

  const nativeBilling = useNativeBilling();
  const isNativeShell = nativeBilling.wrapperPresent;
  const { isIndia } = usePricingRegion({ enabled: !isNativeShell });

  // India web pays in INR via Razorpay — show ₹ prices that match the charge.
  // Native shells are excluded (the App Store / Play Store localise prices).
  const regionalPlans = useMemo(
    () => (isIndia && !isNativeShell ? applyIndiaPricing(plans) : plans),
    [plans, isIndia, isNativeShell],
  );
  const sortedPlans = useMemo(() => sortPlanCards(regionalPlans), [regionalPlans]);

  const planBillingLabels = useMemo<PlanBillingLabels>(
    () => ({
      billedAnnuallyAt: (amount) =>
        t("pricing.billed_annually_at", { amount, defaultValue: `Billed annually at ${amount}` }),
      billedEverySixMonthsAt: (amount) =>
        t("pricing.billed_every_six_months_at", {
          amount,
          defaultValue: `Billed every 6 months at ${amount}`,
        }),
      billedMonthly: t("pricing.billed_monthly", { defaultValue: "Billed monthly" }),
    }),
    [t],
  );

  usePlanCardViewAnalytics(sortedPlans, "pricing_page", !loading && sortedPlans.length > 0);
  const [selected, setSelected] = useState<Exclude<Plan, "free">>(() => {
    if (typeof window === "undefined") return resolveDefaultPlanId(0);
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "hub_journey") return "yearly";
    return resolveDefaultPlanId(0);
  });
  const [upsellPlan, setUpsellPlan] = useState<Exclude<Plan, "free"> | null>(null);
  const [submitting, setSubmitting] = useState<"googlepay" | "razorpay" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [openingStore, setOpeningStore] = useState(false);
  const [showCancelAgent, setShowCancelAgent] = useState(false);
  const [cancelAgentBillingMode, setCancelAgentBillingMode] = useState<"razorpay" | "store">("razorpay");
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { toast } = useToast();

  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const provider = entitlements?.provider ?? "none";
  /** Paid via Razorpay / store — distinct from internal age-based trial (`provider=none`). */
  const isPremiumSubscriber = entitlements?.isPremiumSubscriber ?? false;
  const suppressUpgradePrompts = shouldSuppressPremiumMonetization({
    entitlements,
    entitlementsResolved,
  });
  const isInternalTrial =
    !!entitlements?.isTrialing && provider === "none" && !isPremiumSubscriber;
  const canPurchasePlan = !suppressUpgradePrompts;

  // Filter out sentinel "year 2100" dates — they mean "no real expiry"
  const rawEnd = entitlements?.currentPeriodEnd ?? null;
  const periodEnd =
    rawEnd && !isSentinelDate(rawEnd)
      ? new Date(rawEnd).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const isManagedByStore = provider === "revenuecat";
  const canCancelHere = isPremiumSubscriber && !cancelAtPeriodEnd && !isManagedByStore;
  const isAndroid = isAndroidDevice();
  const isIOS = nativeBilling.platform === "ios";
  const isAndroidNative = nativeBilling.platform === "android";

  // Which store's "manage subscription" link to surface for store-managed plans.
  // Inside a native shell we know the store; on web (e.g. desktop) we can't tell
  // where it was bought, so offer both.
  const isGoogleContext = isAndroidNative || isAndroid;
  const showAppleCancel = isIOS || (!isIOS && !isGoogleContext);
  const showGoogleCancel = isGoogleContext || (!isIOS && !isGoogleContext);

  const onPurchaseSuccess = (plan: Exclude<Plan, "free">) => {
    if (
      FF_POST_PURCHASE_ANNUAL_UPSELL &&
      shouldShowPostPurchaseUpsell(plan) &&
      !wasPostPurchaseUpsellDismissed()
    ) {
      trackSubscriptionEvent({ event: "post_purchase_upsell_shown", plan });
      setUpsellPlan(plan);
    }
  };

  const onUpgrade = async (method?: "upi") => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      setNotice(guestBlock.message);
      return;
    }
    const key = method === "upi" ? "googlepay" : "razorpay";
    setSubmitting(key);
    setNotice(null);
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      plan: selected,
      source: "pricing",
    });
    trackSubscriptionEvent({ event: "checkout_started", plan: selected, source: "pricing" });
    logSubscriptionDebug({
      phase: "pricing_checkout_start",
      source: "pricing",
      plan: selected,
      entitlement: entitlementDebugSlice(entitlements),
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
      },
      extra: { method: key },
    });
    const res = await checkoutRazorpay(selected, undefined, method);
    setSubmitting(null);
    logSubscriptionDebug({
      phase: "pricing_purchase_result",
      source: "pricing",
      plan: selected,
      purchase: { ok: res.ok, userCancelled: res.userCancelled, error: res.reason },
      extra: { method: key },
    });
    if (res.ok) {
      setPaymentSuccess(true);
      onPurchaseSuccess(selected);
      trackSubscriptionEvent({ event: "purchase_success", plan: selected, source: "pricing" });
    } else if (!res.userCancelled) {
      trackSubscriptionEvent({ event: "purchase_failed", plan: selected, source: "pricing" });
      setNotice(res.reason ?? t("pricing.checkout_unavailable"));
    }
  };

  const onCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setShowCancelAgent(false);
    setNotice(null);
    try {
      const res = await cancelSubscription();
      if (res.ok) {
        setNotice(
          periodEnd
            ? t("pages.pricing.cancel_success_with_date", {
                date: periodEnd,
                defaultValue: `Your subscription is scheduled to end on ${periodEnd}. You'll keep premium access until then.`,
              })
            : t("pages.pricing.cancel_success", {
                defaultValue: "Your subscription has been cancelled.",
              }),
        );
      } else {
        setNotice(res.reason ?? "Could not cancel. Please try again."); // i18n-ok: fallback error
      }
    } finally {
      setCancelling(false);
    }
  };

  const openCancelAgent = (mode: "razorpay" | "store") => {
    trackSubscriptionEvent({ event: "cancel_started", source: "pricing" });
    setCancelAgentBillingMode(mode);
    setShowCancelAgent(true);
  };

  // Store-managed (RevenueCat) subscriptions can only be cancelled in Apple /
  // Google's own subscription settings — send the user straight there.
  const openStoreSubscriptions = (store: "apple" | "google") => {
    if (openingStore) return;
    setOpeningStore(true);
    const url =
      store === "apple"
        ? APPLE_MANAGE_SUBSCRIPTIONS_URL
        : PLAY_MANAGE_SUBSCRIPTIONS_URL;
    // The Android WebView wrapper blocks window.open and loads http(s) in-place,
    // so a top-level navigation is required for the native shell to intercept
    // the Play Store URL and hand it to the Play Store app. iOS Capacitor and
    // browsers open non-allowlisted store URLs externally via window.open.
    if (isAndroidNative) {
      window.location.href = url;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setOpeningStore(false), 1500);
  };

  const onUpgradeNativeStore = async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      setNotice(guestBlock.message);
      return;
    }
    setNotice(null);
    setPaymentSuccess(false);
    setVerifying(true);
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      plan: selected,
      source: "pricing",
    });
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      source: "pricing",
    });
    logSubscriptionDebug({
      phase: "pricing_checkout_start",
      source: "pricing",
      plan: selected,
      entitlement: entitlementDebugSlice(entitlements),
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
        unavailableReason: nativeBilling.unavailableReason,
      },
      extra: { method: "native_store" },
    });
    try {
      const res = await nativeBilling.purchase(selected, { source: "pricing" });
      logSubscriptionDebug({
        phase: "pricing_purchase_result",
        source: "pricing",
        plan: selected,
        purchase: {
          ok: res.ok,
          userCancelled: res.userCancelled,
          error: res.reason,
        },
        extra: { method: "native_store" },
      });
      if (!res.ok) {
        if (res.userCancelled) {
          trackSubscriptionEvent({
            event: "purchase_cancelled",
            plan: selected,
            source: "pricing",
          });
        } else {
          trackSubscriptionEvent({ event: "purchase_failed", plan: selected, source: "pricing" });
          setNotice(res.reason ?? t("pricing.checkout_unavailable"));
        }
        return;
      }
      if (res.isPremiumSubscriber) {
        setPaymentSuccess(true);
        onPurchaseSuccess(selected);
        toast({
          title: t("pricing.payment_success_title"),
          description: t("pricing.payment_success_body"),
        });
      } else {
        setNotice(t("pricing.payment_pending"));
      }
    } finally {
      setVerifying(false);
    }
  };

  const onRestorePurchases = async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      setNotice(guestBlock.message);
      return;
    }
    const ok = await nativeBilling.restore("pricing");
    if (ok) {
      toast({
        title: t("pricing.payment_success_title", { defaultValue: PURCHASE_SCREEN.successTitle }),
        description: t("pricing.payment_success_body", { defaultValue: PURCHASE_SCREEN.successBody }),
      });
    } else {
      setNotice(
        t("pricing.restore_failed", {
          defaultValue: "No active subscription found for this account.",
        }),
      );
    }
  };

  const isHubJourneyReason = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("reason") === "hub_journey";
  }, []);

  const hubChildId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(HUB_ACTIVE_CHILD_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const hubJourney = useHubJourney(isHubJourneyReason ? hubChildId : null);
  const journeyChildName = hubJourney.status?.child.name ?? "your child";
  const journeyProgress = hubJourney.progress;
  const journeyIsInfant = hubJourney.status
    ? hubJourney.status.child.age * 12 + (hubJourney.status.child.ageMonths ?? 0) < 24
    : false;
  const journeyCta = t("parent_hub.journey.continue_tomorrow_path");
  const journeyPricingHeader = journeyIsInfant
    ? "parent_hub.journey.infant.pricing_header"
    : "parent_hub.journey.pricing_header";
  const journeyPricingSubtitle = journeyIsInfant
    ? "parent_hub.journey.infant.pricing_subtitle"
    : "parent_hub.journey.pricing_subtitle";

  const isProcessing = submitting !== null || verifying || nativeBilling.purchasing;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "hub_journey") {
      setSelected("yearly");
      trackHubJourneyAnnualSelected("pricing_page");
      return;
    }
    const plan = params.get("plan");
    if (plan === "yearly" || plan === "six_month" || plan === "monthly") {
      setSelected(plan);
    }
    const source = params.get("source");
    if (source) {
      trackSubscriptionEvent({ event: "paywall_opened", source, plan: plan ?? selected });
    }
  }, []);

  const selectedPlanCard = useMemo(
    () => sortedPlans.find((p) => p.id === selected),
    [sortedPlans, selected],
  );
  const selectedStoreOpts = selectedPlanCard
    ? planStorePriceOptions(
        selectedPlanCard.id,
        nativeBilling.priceByPlan,
        nativeBilling.storePricesByPlan,
      )
    : null;

  const handleStickyCheckout = () => {
    if (!canPurchasePlan) return;
    if (isIOS || isAndroidNative) {
      void onUpgradeNativeStore();
      return;
    }
    if (!isNativeShell && isIndia) {
      void onUpgrade("upi");
      return;
    }
    if (!isNativeShell && isAndroid) {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    }
  };

  const stickyCheckoutAvailable =
    isIOS ||
    isAndroidNative ||
    (!isNativeShell && isIndia) ||
    (!isNativeShell && isAndroid);

  const showStickyCta =
    FF_PRICING_STICKY_CTA && canPurchasePlan && !loading && !!selectedPlanCard;

  return (
    <div
      className={["pricing-living", showStickyCta ? "pb-28" : ""].join(" ")}
      data-on-dark
    >
      <div className="pricing-living-stage">
      <header className="pricing-living-hero">
        <p className="pricing-living-eyebrow">
          {t("pricing.living_eyebrow", { defaultValue: "AmyNest membership" })}
        </p>
        <h1 className="pricing-living-title">
          {isHubJourneyReason && canPurchasePlan
            ? t(journeyPricingHeader, { name: journeyChildName })
            : t("pricing.living_title", { defaultValue: "Keep Amy beside you." })}
        </h1>
        <p className="pricing-living-lede">
          {isHubJourneyReason && canPurchasePlan
            ? t(journeyPricingSubtitle, { name: journeyChildName })
            : t("pricing.living_subtitle", {
                defaultValue:
                  "Continue the routines, guidance, conversations, learning and care that are shaped around your child.",
              })}
        </p>
        {canPurchasePlan && (
          <p className="pricing-living-membership">
            {t("pricing.living_membership", {
              defaultValue:
                "Membership continues Amy beside your family. Choose the commitment that fits how you want to keep going.",
            })}
          </p>
        )}

        {isHubJourneyReason && canPurchasePlan && journeyProgress && (
          <div
            className="relative z-10 mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-1.5"
            data-testid="pricing-journey-stats"
          >
            {journeyProgress.lifeSkillsDone > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/15">
                {t("parent_hub.journey.stat_life_skills", { count: journeyProgress.lifeSkillsDone })}
              </span>
            )}
            {journeyProgress.lifeSkillsStreak > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/15">
                {t("parent_hub.journey.stat_streak", { count: journeyProgress.lifeSkillsStreak })}
              </span>
            )}
            {journeyProgress.levelLabel && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/15">
                {journeyProgress.levelLabel}
              </span>
            )}
          </div>
        )}

        {isPremiumSubscriber && (
          <div className="pricing-living-status">
            <Check className="h-4 w-4" aria-hidden />
            {t("pricing.on_plan", { plan: entitlements?.plan })}
            {cancelAtPeriodEnd && periodEnd && (
              <span className="font-normal text-[rgba(244,238,230,0.62)]">
                · {t("pages.pricing.cancels")} {periodEnd}
              </span>
            )}
          </div>
        )}
        {isInternalTrial && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="pricing-living-status">
              <Clock className="h-4 w-4" aria-hidden />
              {t("subscription.trial.days_remaining", {
                defaultValue: "You have {{count}} days remaining.",
                count: entitlements?.trialDaysRemaining ?? 0,
              })}
            </div>
            <p className="pricing-living-trial-note">
              {t("subscription.trial.upgrade_while_trialing", {
                defaultValue: "Continue with Amy after your trial if this still helps.",
              })}
            </p>
          </div>
        )}
      </header>

      <SubscriptionWinBackBanner entitlements={entitlements} />

      <div className="pricing-living-plans">
        {loading ? (
          <p className="py-8 text-center text-sm text-[rgba(244,238,230,0.55)]">{t("pricing.loading_plans")}</p>
        ) : (
          <>
          <div className="mb-3">
            <SubscriptionTrialOffer source="pricing_page" />
          </div>

          <div className="pricing-living-grid">
            {sortedPlans.map((p) => {
              const isSel = p.id === selected;
              const storeOpts = planStorePriceOptions(
                p.id,
                nativeBilling.priceByPlan,
                nativeBilling.storePricesByPlan,
              );
              const { presentation, savings } = planCardPricePresentation(
                p,
                storeOpts.storePriceLabel,
                storeOpts.store,
                planBillingLabels,
              );
              const badgeText = planBadgeLabel(p.id, p.badge);
              const features = p.features.slice(0, 3);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p.id);
                    trackPlanSelected(p.id, "pricing_page");
                  }}
                  aria-pressed={isSel}
                  data-testid={`plan-card-${p.id}`}
                  data-on-dark
                  className={pricingPlanCardClasses(p.id, isSel)}
                >
                  {badgeText && (
                    <span className="pricing-living-badge">{badgeText}</span>
                  )}

                  <div className="pricing-living-identity">
                    <p className="pricing-living-plan-name">{p.title}</p>
                    <p className="pricing-living-audience">
                      {t(`pricing.living_audience.${p.id}`, {
                        defaultValue: PLAN_LIVING_AUDIENCE[p.id],
                      })}
                    </p>
                  </div>

                  <PlanPriceLines
                    presentation={presentation}
                    savings={savings}
                    priceClassName={pricingPlanPriceClasses(p.id)}
                    preferBilledPrimary
                  />

                  <ul className="pricing-living-benefits">
                    {features.map((f, i) => (
                      <li key={i}>
                        <Check className="pricing-living-check" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          </>
        )}
      </div>

      {paymentSuccess && (
        <div className="pricing-living-notice pricing-living-notice-ok">
          <Check className="inline h-4 w-4 mr-1.5 -mt-0.5" aria-hidden />
          {t("pricing.payment_success_title", { defaultValue: PURCHASE_SCREEN.successTitle })}
        </div>
      )}
      {notice && (
        <div className="pricing-living-notice" role="status">
          {notice}
        </div>
      )}

      <div className="pricing-living-actions">

        {isHubJourneyReason && canPurchasePlan && (
          <p className="text-center text-sm font-bold text-white/85">{journeyCta}</p>
        )}

        {/* iOS Capacitor → Apple IAP via RevenueCat (highest priority; Apple policy forbids other gateways) */}
        {isIOS && canPurchasePlan && (
          <div className="space-y-2">
            {nativeBilling.unavailableReason ? (
              <div
                data-on-dark
                className="w-full space-y-2 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-center"
              >
                <Smartphone className="mx-auto h-5 w-5 text-white/60" />
                {/* audit-ok: white text on dark semi-transparent card */}
                <p className="text-sm font-bold text-white/90">{t("pricing.apple_unavailable")}</p>
                <p className="text-xs leading-relaxed text-white/55">{nativeBilling.unavailableReason}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onUpgradeNativeStore}
                disabled={isProcessing || !nativeBilling.available || plans.length === 0}
                data-testid="button-upgrade-app-store"
                data-on-dark
                className="pricing-living-cta"
              >
                {nativeBilling.purchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">{t("pricing.app_store_processing")}</span>
                  </>
                ) : (
                  <span>
                    {t("pricing.subscribe_app_store", { defaultValue: PREMIUM_VOICE.continueCta })}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void onRestorePurchases()}
              className="pricing-living-restore"
            >
              {t("pricing.restore_purchases")}
            </button>
            <p className="pricing-living-store-note">
              {t("pricing.app_store_subtitle")}
            </p>
          </div>
        )}

        {/* Android WebView wrapper → Google Play Billing (required by Play policy) */}
        {isAndroidNative && canPurchasePlan && (
          <div className="space-y-2">
            {nativeBilling.unavailableReason ? (
              <div
                data-on-dark
                className="w-full space-y-2 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-center"
              >
                <Smartphone className="mx-auto h-5 w-5 text-white/60" />
                <p className="text-sm font-bold text-white/90">{t("pricing.google_play_unavailable")}</p>
                <p className="text-xs leading-relaxed text-white/55">{nativeBilling.unavailableReason}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onUpgradeNativeStore}
                disabled={isProcessing || !nativeBilling.available || plans.length === 0}
                data-testid="button-upgrade-google-play-native"
                data-on-dark
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {nativeBilling.purchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#01875A" }} />
                    <span className="text-sm font-bold" style={{ color: "#202124" }}>
                      {t("pricing.google_play_processing")}
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="26" height="28" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M1 1.5L14.5 14L1 26.5V1.5Z" fill="#01875A" stroke="#01875A" strokeWidth="0.5"/>
                      <path d="M1 1.5L24 10L14.5 14L1 1.5Z" fill="#FFD400" stroke="#FFD400" strokeWidth="0.5"/>
                      <path d="M1 26.5L14.5 14L24 18L1 26.5Z" fill="#FF3A44" stroke="#FF3A44" strokeWidth="0.5"/>
                      <path d="M24 10L14.5 14L24 18L26 14L24 10Z" fill="#00AEFF" stroke="#00AEFF" strokeWidth="0.5"/>
                    </svg>
                    <span className="text-sm font-bold" style={{ color: "#202124" }}>
                      {t("pricing.subscribe_google_play", { defaultValue: PREMIUM_VOICE.continueCta })}
                    </span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void onRestorePurchases()}
              className="pricing-living-restore"
            >
              {t("pricing.restore_purchases")}
            </button>
            <p className="pricing-living-store-note">
              {t("pricing.google_play_subtitle")}
            </p>
          </div>
        )}

        {/* ── India browser PWA: Google Pay + Razorpay (not Play wrapper) ── */}
        {!isNativeShell && !isIOS && isIndia && canPurchasePlan && (
          <>
            {/* PRIMARY: Google Pay button */}
            {/* audit-ok: Google Pay button — white bg with Google brand gray text (#3C4043) and Google blue spinner (#4285F4) per Google Pay brand guidelines */}
            <button
              type="button"
              onClick={() => onUpgrade("upi")}
              disabled={isProcessing || plans.length === 0}
              data-testid="button-upgrade-googlepay"
              data-on-dark
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ color: "#3C4043", fontWeight: 700 }} // audit-ok: Google Pay brand gray — required by Google Pay brand guidelines
            >
              {submitting === "googlepay" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#4285F4" }} /> {/* audit-ok: Google Pay brand blue — required by Google Pay brand guidelines */}
                  <span>{t("pricing.processing_payment")}</span>
                </>
              ) : (
                <GooglePayLogo height={28} />
              )}
            </button>

            {/* SECONDARY: Razorpay */}
            <button
              type="button"
              onClick={() => onUpgrade()}
              disabled={isProcessing || plans.length === 0}
              data-testid="button-upgrade-razorpay"
              data-on-dark
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-white/80 transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {submitting === "razorpay" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("pricing.processing_payment")}
                </>
              ) : (
                t("pricing.other_payment_options")
              )}
            </button>

            {/* Risk-reversal reassurance at the point of action */}
            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs font-semibold text-white/50">
              <Shield className="h-3.5 w-3.5" />
              {t("pricing.cancel_anytime")}
            </p>
          </>
        )}

        {/* Already premium — paid subscribers only */}
        {isPremiumSubscriber && (
          <div
            data-on-dark
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[rgba(232,212,184,0.22)] bg-[rgba(232,212,184,0.08)] text-sm font-semibold text-[var(--atmosphere-night-ink)]"
          >
            <Check className="h-4 w-4" aria-hidden />
            {t("pricing.already_premium")}
          </div>
        )}

        {/* Non-India + Android browser PWA → open Play Store listing */}
        {!isNativeShell && !isIOS && !isIndia && isAndroid && canPurchasePlan && (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-upgrade-google-play"
            data-on-dark
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90"
            // audit-ok: Google Play brand green gradient on white button (official Google Play brand)
            style={{ textDecoration: "none" }}
          >
            {/* audit-block-ignore-start — Google Play official brand colors (4-color icon per Google brand guidelines) */}
            <svg width="26" height="28" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1 1.5L14.5 14L1 26.5V1.5Z" fill="#01875A" stroke="#01875A" strokeWidth="0.5"/>
              <path d="M1 1.5L24 10L14.5 14L1 1.5Z" fill="#FFD400" stroke="#FFD400" strokeWidth="0.5"/>
              <path d="M1 26.5L14.5 14L24 18L1 26.5Z" fill="#FF3A44" stroke="#FF3A44" strokeWidth="0.5"/>
              <path d="M24 10L14.5 14L24 18L26 14L24 10Z" fill="#00AEFF" stroke="#00AEFF" strokeWidth="0.5"/>
            </svg>
            {/* audit-block-ignore-end */}
            <div className="text-left">
              <p className="text-xs leading-none" style={{ color: "#5F6368" }}>{t("pricing.open_google_play")}</p> {/* audit-ok: Google UI gray — Google Play button label */}
              <p className="text-sm font-bold" style={{ color: "#202124" }}>{t("pricing.subscribe_google_play")}</p> {/* audit-ok: Google near-black — Google Play button title */}
            </div>
          </a>
        )}

        {/* Non-India + non-Android + non-iOS → prompt to download the app */}
        {!isIOS && !isIndia && !isAndroid && canPurchasePlan && (
          <div
            data-on-dark
            className="w-full space-y-2 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-center"
          >
            <Smartphone className="mx-auto h-5 w-5 text-white/60" />
            {/* audit-ok: white text variants on dark semi-transparent card */}
            <p className="text-sm font-bold text-white/90">
              {t("pages.pricing.subscribe_via_the_amynest_app")}
            </p>
            <p className="text-xs leading-relaxed text-white/55">
              {t("pages.pricing.web_payments_are_currently_available_in_india_only_download_")}
            </p>
          </div>
        )}

        {/* Cancel subscription button */}
        {canCancelHere && (
          <Button
            variant="outline"
            onClick={() => openCancelAgent("razorpay")}
            disabled={cancelling}
            data-testid="button-cancel-subscription"
            data-on-dark
            className="h-11 w-full border-white/20 text-sm font-semibold text-white/60 hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            {cancelling ? t("pricing.cancelling") : t("pricing.cancel_btn")}
          </Button>
        )}

        {/* Managed by Google Play / App Store — deep-link straight to the
            store's subscription settings, where cancellation actually happens. */}
        {isPremiumSubscriber && !cancelAtPeriodEnd && isManagedByStore && (
          <div
            data-on-dark
            className="space-y-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          >
            <div className="flex items-start gap-2.5">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
              {/* audit-ok: white text on dark semi-transparent card */}
              <div>
                <p className="mb-1 font-bold text-white/90">
                  {t("pages.pricing.subscribed_via_google_play_app_store")}
                </p>
                <p className="text-xs leading-relaxed text-white/55">
                  {t("pages.pricing.cancel_store_managed_intro")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {showAppleCancel && (
                <Button
                  variant="outline"
                  onClick={() => openCancelAgent("store")}
                  disabled={openingStore}
                  data-testid="button-cancel-app-store"
                  data-on-dark
                  className="h-11 w-full border-white/20 text-sm font-semibold text-white/85 hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  {t("pages.pricing.cancel_in_app_store")}
                </Button>
              )}
              {showGoogleCancel && (
                <Button
                  variant="outline"
                  onClick={() => openCancelAgent("store")}
                  disabled={openingStore}
                  data-testid="button-cancel-google-play"
                  data-on-dark
                  className="h-11 w-full border-white/20 text-sm font-semibold text-white/85 hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  {t("pages.pricing.cancel_in_google_play")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Scheduled to cancel — hide sentinel 2100 date */}
        {isPremiumSubscriber && cancelAtPeriodEnd && (
          <div
            data-on-dark
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/70"
          >
            {/* audit-ok: white text on dark semi-transparent card */}
            {t("pages.pricing.your_subscription_is_scheduled_to_cancel")}
            {periodEnd ? ` on ${periodEnd}` : ""}
            {t("pages.pricing.you_ll_keep_premium_access_until_then")}
          </div>
        )}

        {canPurchasePlan && <SubscriptionTrustSection />}

        <p className="pricing-living-reassure">
          <Shield className="inline h-3 w-3 mr-1 align-[-2px]" aria-hidden />
          {t("pricing.cancel_anytime")}
        </p>

        <div className="pricing-living-links">
          <a
            href="https://amynest.in/privacy"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-privacy"
          >
            {t("pages.landing.privacy_policy")}
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://amynest.in/terms"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-terms"
          >
            {t("pages.landing.terms_of_service")}
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://amynest.in/support"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-support"
          >
            {t("pages.landing.support")}
          </a>
        </div>
      </div>
      </div>

      {isProcessing && (
        <div className="pricing-living-overlay" role="status" aria-live="polite">
          <div data-on-dark className="pricing-living-overlay-card">
            <div className="pricing-living-overlay-spin">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            {verifying ? (
              <>
                <p className="text-base font-semibold">
                  {t("pricing.verifying_payment", { defaultValue: PURCHASE_SCREEN.verifyTitle })}
                </p>
                <p className="mt-2 text-xs text-[rgba(244,238,230,0.55)]">
                  {t("pricing.verifying_subtitle", { defaultValue: PURCHASE_SCREEN.verifySubtitle })}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">
                  {t("pricing.processing_payment", { defaultValue: PURCHASE_SCREEN.processingTitle })}
                </p>
                <p className="mt-2 text-xs text-[rgba(244,238,230,0.55)]">
                  {t("pricing.processing_subtitle", { defaultValue: PURCHASE_SCREEN.processingSubtitle })}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <AmyCancelAgent
        open={showCancelAgent}
        onClose={() => setShowCancelAgent(false)}
        billingMode={cancelAgentBillingMode}
        periodEnd={periodEnd}
        cancelling={cancelling || openingStore}
        storeTarget={
          showAppleCancel && showGoogleCancel
            ? "both"
            : showAppleCancel
              ? "apple"
              : "google"
        }
        annualMonthlyEquivalent={(() => {
          const yearly = sortedPlans.find((p) => p.id === "yearly");
          if (!yearly) return null;
          const { presentation } = planCardPricePresentation(
            yearly,
            nativeBilling.priceByPlan.yearly,
            nativeBilling.storePricesByPlan.yearly,
            planBillingLabels,
          );
          return monthlyEquivalentForPlan("yearly", presentation);
        })()}
        onSwitchToAnnual={() => {
          setSelected("yearly");
          if (isManagedByStore || isNativeShell) {
            void onUpgradeNativeStore();
          } else {
            void onUpgrade();
          }
        }}
        onConfirmCancel={() => void onCancel()}
        onOpenStore={openStoreSubscriptions}
      />

      {upsellPlan && (
        <PostPurchaseUpsellModal
          purchasedPlan={upsellPlan}
          onDone={() => setUpsellPlan(null)}
        />
      )}

      {showStickyCta && (
        <SubscriptionPricingStickyCta
          selected={selected}
          selectedPlan={selectedPlanCard}
          storePriceLabel={selectedStoreOpts?.storePriceLabel}
          store={selectedStoreOpts?.store}
          billingLabels={planBillingLabels}
          disabled={plans.length === 0 || !stickyCheckoutAvailable}
          busy={isProcessing}
          onCheckout={handleStickyCheckout}
        />
      )}
    </div>
  );
}
