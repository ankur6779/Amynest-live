import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check, X, Smartphone,
  Sparkles, Crown, Zap, Shield, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { isAndroidDevice, PLAY_STORE_URL } from "@/lib/geo";
import { usePricingRegion, applyIndiaPricing } from "@/lib/pricing-region";
import { finalizeNativePurchase } from "@/lib/native-purchase-finalize";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { SubscriptionWinBackBanner } from "@/components/subscription-win-back-banner";
import { SubscriptionEcosystemSection } from "@/components/subscription-ecosystem-section";
import { SubscriptionTrustSection } from "@/components/subscription-trust-section";
import { SubscriptionAnnualUpsell } from "@/components/subscription-annual-upsell";
import { SubscriptionTrialOffer } from "@/components/subscription-trial-offer";
import { SubscriptionCancelDialog } from "@/components/subscription-cancel-dialog";
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
  FF_POST_PURCHASE_ANNUAL_UPSELL,
  FF_PRICING_STICKY_CTA,
} from "@/lib/subscription-feature-flags";
import {
  planBadgeLabel,
  planCardPricePresentation,
  planStorePriceOptions,
  pricingPlanCardClasses,
  pricingPlanPriceClasses,
  shouldHideValueAnchor,
} from "@/lib/pricing-plan-card-ui";
import { PlanPriceLines } from "@/components/plan-price-lines";
import { SubscriptionPricingStickyCta } from "@/components/subscription-pricing-sticky-cta";
import { usePlanCardViewAnalytics } from "@/hooks/use-plan-card-view-analytics";
import type { PlanBillingLabels } from "@/lib/plan-price";
import { monthlyEquivalentForPlan } from "@/lib/plan-price";
import { wasPostPurchaseUpsellDismissed } from "@/lib/subscription-funnel-storage";
import {
  SUBSCRIPTION_HERO,
  PURCHASE_SCREEN,
  CANCELLATION_RETENTION,
  planCta,
} from "@workspace/subscription-marketing";

const HUB_ACTIVE_CHILD_KEY = "amynest:hub:activeChildId";

// Dates >= this year are sentinel "no real expiry" values from the DB
const SENTINEL_YEAR = 2099;
function isSentinelDate(iso: string) {
  return new Date(iso).getFullYear() >= SENTINEL_YEAR;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  monthly: <Zap className="h-4 w-4" />,
  six_month: <Sparkles className="h-4 w-4" />,
  yearly: <Crown className="h-4 w-4" />,
};

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
    isPremium,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { toast } = useToast();

  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const provider = entitlements?.provider ?? "none";

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
  const canCancelHere = isPremium && !cancelAtPeriodEnd && !isManagedByStore;
  const isAndroid = isAndroidDevice();
  const isIOS = nativeBilling.platform === "ios";
  const isAndroidNative = nativeBilling.platform === "android";

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
    const key = method === "upi" ? "googlepay" : "razorpay";
    setSubmitting(key);
    setNotice(null);
    trackSubscriptionEvent({ event: "checkout_started", plan: selected, source: "pricing" });
    const res = await checkoutRazorpay(selected, undefined, method);
    setSubmitting(null);
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
    setCancelling(true);
    setShowConfirm(false);
    setNotice(null);
    const res = await cancelSubscription();
    setCancelling(false);
    if (!res.ok) setNotice(res.reason ?? "Could not cancel. Please try again."); // i18n-ok: fallback error
  };

  const onUpgradeNativeStore = async () => {
    setNotice(null);
    setPaymentSuccess(false);
    setVerifying(true);
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      source: "pricing",
    });
    try {
      const res = await nativeBilling.purchase(selected);
      if (!res.ok) {
        if (!res.userCancelled) {
          trackSubscriptionEvent({ event: "purchase_failed", plan: selected, source: "pricing" });
          setNotice(res.reason ?? t("pricing.checkout_unavailable"));
        }
        return;
      }
      const finalized = await finalizeNativePurchase(authFetch, qc);
      if (finalized.isPremium) {
        setPaymentSuccess(true);
        onPurchaseSuccess(selected);
        trackSubscriptionEvent({ event: "purchase_success", plan: selected, source: "pricing" });
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
    if (isPremium) return;
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
    FF_PRICING_STICKY_CTA && !isPremium && !loading && !!selectedPlanCard;

  return (
    <div
      className={[
        "min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A]",
        showStickyCta ? "pb-28" : "",
      ].join(" ")}
    >

      {/* ── Hero banner ── */}
      <div // audit-ok: intentional dark brand gradient header
        className="relative overflow-hidden px-4 pb-4 pt-7 text-center sm:pb-5 sm:pt-8"
        data-on-dark
      >
        {/* Glow blobs */}
        <div
          className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          // audit-ok: brand violet glow decoration
          style={{ background: "radial-gradient(circle, #7b3ff2 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -right-8 top-6 h-32 w-32 rounded-full opacity-15 blur-2xl"
          // audit-ok: brand pink glow decoration
          style={{ background: "radial-gradient(circle, #ff4ecd 0%, transparent 70%)" }}
        />

        {/* Crown icon */}
        <div
          className="relative z-10 mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl shadow-[0_6px_24px_rgba(255,78,205,0.45)] sm:mb-3 sm:h-12 sm:w-12 sm:rounded-2xl"
          // audit-ok: brand violet→pink gradient on icon badge
          style={{ background: "linear-gradient(135deg,#7b3ff2,#ff4ecd)" }}
        >
          <Crown className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>

        <h1 className="relative z-10 mb-1 text-xl font-black tracking-tight text-white sm:text-2xl">
          {/* audit-ok: white text on dark brand gradient */}
          {isHubJourneyReason && !isPremium
            ? t(journeyPricingHeader, { name: journeyChildName })
            : t("pricing.title", { defaultValue: SUBSCRIPTION_HERO.headline })}
        </h1>
        <p className="relative z-10 mx-auto max-w-md text-xs leading-snug text-white/65 sm:text-sm sm:leading-relaxed">
          {/* audit-ok: muted white on dark gradient */}
          {isHubJourneyReason && !isPremium
            ? t(journeyPricingSubtitle, { name: journeyChildName })
            : t("pricing.subtitle", { defaultValue: SUBSCRIPTION_HERO.subheadline })}
        </p>

        {isHubJourneyReason && !isPremium && journeyProgress && (
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

        {/* Patent-pending trust badge */}
        <div className="relative z-10 mt-1.5 flex items-center justify-center gap-1.5 sm:mt-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white/90 ring-1 ring-white/15"
            // audit-ok: semi-transparent dark pill on dark gradient
            style={{ background: "rgba(123,63,242,0.22)" }}
          >
            <Sparkles className="h-3 w-3 text-primary" />
            {t("patent_pending.ai_badge")}
          </span>
        </div>

        {/* Premium status pill */}
        {isPremium && (
          <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-white/90 ring-1 ring-white/20">
            {/* audit-ok: white text on semi-transparent dark pill */}
            {/* audit-ok: green-400 — semantic success/premium indicator */}
            <Check className="h-4 w-4 text-green-400" />
            {t("pricing.on_plan", { plan: entitlements?.plan })}
            {cancelAtPeriodEnd && periodEnd && (
              <span className="font-normal text-white/60">
                · {t("pages.pricing.cancels")} {periodEnd}
              </span>
            )}
          </div>
        )}
      </div>

      <SubscriptionWinBackBanner entitlements={entitlements} />

      <SubscriptionAnnualUpsell
        entitlements={entitlements}
        selected={selected}
        onSelectAnnual={() => setSelected("yearly")}
      />

      {/* ── Plan cards ── */}
      <div className="px-4 pb-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-white/50">{t("pricing.loading_plans")}</p>
        ) : (
          <>
          <div className="mb-2">
            <SubscriptionTrialOffer source="pricing_page" />
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 sm:items-end sm:gap-3">
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
              const featureLimit =
                p.id === "yearly" ? 2 : p.id === "six_month" ? 2 : 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p.id);
                    trackPlanSelected(p.id, "pricing_page");
                  }}
                  data-testid={`plan-card-${p.id}`}
                  data-on-dark
                  className={pricingPlanCardClasses(p.id, isSel)}
                >
                  {badgeText && (
                    <span
                      className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:text-[10px]"
                      style={{ background: "linear-gradient(90deg,#7b3ff2,#ff4ecd)" }}
                    >
                      {badgeText}
                    </span>
                  )}

                  <div className="mb-1 flex items-center gap-2">
                    <span className={isSel ? "text-primary" : "text-white/50"}>
                      {PLAN_ICONS[p.id] ?? <Sparkles className="h-4 w-4" />}
                    </span>
                    <span
                      className={[
                        "font-bold text-white",
                        p.id === "yearly" ? "text-sm sm:text-base" : "text-sm",
                        p.id === "monthly" ? "font-semibold" : "",
                      ].join(" ")}
                    >
                      {p.title}
                    </span>
                  </div>
                  {p.tagline && p.id !== "monthly" && (
                    <p className="mb-1 text-[10px] leading-snug text-white/55 sm:text-[11px]">
                      {p.tagline}
                    </p>
                  )}
                  {"valueAnchor" in p && p.valueAnchor && !shouldHideValueAnchor(p.id) && (
                    <p className="mb-1 text-[10px] font-semibold text-primary/90">{p.valueAnchor}</p>
                  )}

                  <PlanPriceLines
                    presentation={presentation}
                    savings={savings}
                    priceClassName={pricingPlanPriceClasses(p.id)}
                  />

                  <ul className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
                    {p.features.map((f, i) => (
                      <li
                        key={i}
                        className={[
                          "flex items-start gap-1.5 text-xs text-white/80",
                          i >= featureLimit ? "hidden sm:flex" : "",
                        ].join(" ")}
                      >
                        {/* audit-ok: check icon on dark surface */}
                        <Check
                          className={[
                            "mt-0.5 h-3 w-3 shrink-0",
                            isSel ? "text-primary" : "text-white/40",
                          ].join(" ")}
                        />
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

      {!isPremium && <SubscriptionEcosystemSection />}

      {/* ── Notice ── */}
      {paymentSuccess && (
        <div className="mx-4 mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm font-semibold text-green-300">
          <Check className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          {t("pricing.payment_success_title", { defaultValue: PURCHASE_SCREEN.successTitle })}
        </div>
      )}
      {notice && (
        <div className="mx-4 mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/80">
          {/* audit-ok: white text on dark semi-transparent surface */}
          {notice}
        </div>
      )}

      {/* ── CTAs ── */}
      <div className="mx-auto max-w-md space-y-3 px-4 pb-10">

        {isHubJourneyReason && !isPremium && (
          <p className="text-center text-sm font-bold text-white/85">{journeyCta}</p>
        )}

        {/* iOS Capacitor → Apple IAP via RevenueCat (highest priority; Apple policy forbids other gateways) */}
        {isIOS && !isPremium && (
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
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary shadow-[0_10px_24px_rgba(255,78,205,0.5)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {nativeBilling.purchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                    <span className="text-sm font-bold text-white">{t("pricing.app_store_processing")}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-white" />
                    <span className="text-sm font-bold text-white">
                      {t("pricing.subscribe_app_store", { defaultValue: planCta(selected) })}
                    </span>
                  </>
                )}
              </button>
            )}
            <p className="text-center text-[10px] text-white/30">
              {t("pricing.app_store_subtitle")}
            </p>
            <button
              type="button"
              onClick={() => void nativeBilling.restore()}
              className="w-full text-white/55 text-xs font-semibold py-2 hover:text-white/85"
            >
              {t("pricing.restore_purchases")}
            </button>
          </div>
        )}

        {/* Android WebView wrapper → Google Play Billing (required by Play policy) */}
        {isAndroidNative && !isPremium && (
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
                      {t("pricing.subscribe_google_play", { defaultValue: planCta(selected) })}
                    </span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void nativeBilling.restore()}
              className="w-full text-white/55 text-xs font-semibold py-2 hover:text-white/85"
            >
              {t("pricing.restore_purchases")}
            </button>
            <p className="text-center text-[10px] text-white/30">
              {t("pricing.google_play_subtitle")}
            </p>
          </div>
        )}

        {/* ── India browser PWA: Google Pay + Razorpay (not Play wrapper) ── */}
        {!isNativeShell && !isIOS && isIndia && !isPremium && (
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

        {/* Already premium — shown for all platforms/regions */}
        {isPremium && (
          <div
            data-on-dark
            // audit-ok: green-500/green-400 — semantic success colour for premium confirmation
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 text-sm font-bold text-green-400"
          >
            <Check className="h-4 w-4" />
            {t("pricing.already_premium")}
          </div>
        )}

        {/* Non-India + Android browser PWA → open Play Store listing */}
        {!isNativeShell && !isIOS && !isIndia && isAndroid && !isPremium && (
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
        {!isIOS && !isIndia && !isAndroid && !isPremium && (
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
            onClick={() => {
              trackSubscriptionEvent({ event: "cancel_started", source: "pricing" });
              setShowConfirm(true);
            }}
            disabled={cancelling}
            data-testid="button-cancel-subscription"
            data-on-dark
            className="h-11 w-full border-white/20 text-sm font-semibold text-white/60 hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            {cancelling ? t("pricing.cancelling") : t("pricing.cancel_btn")}
          </Button>
        )}

        {/* Managed by Google Play / App Store */}
        {isPremium && !cancelAtPeriodEnd && isManagedByStore && (
          <div
            data-on-dark
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          >
            <div className="flex items-start gap-2.5">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
              {/* audit-ok: white text on dark semi-transparent card */}
              <div>
                <p className="mb-1 font-bold text-white/90">
                  {t("pages.pricing.subscribed_via_google_play_app_store")}
                </p>
                <p className="text-xs leading-relaxed text-white/55">
                  {t("pages.pricing.your_billing_is_managed_by_your_device_s_app_store_to_cancel")}{" "}
                  <strong className="text-white/80">
                    {t("pages.pricing.google_play_subscriptions")}
                  </strong>{" "}
                  {/* i18n-ok: conjunction */}
                  or{" "}
                  <strong className="text-white/80">
                    {t("pages.pricing.iphone_app_store_subscriptions")}
                  </strong>{" "}
                  {t("pages.pricing.and_cancel_amynest_there")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled to cancel — hide sentinel 2100 date */}
        {isPremium && cancelAtPeriodEnd && (
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

        {!isPremium && <SubscriptionTrustSection />}

        <div className="flex items-center justify-center gap-4 pt-2">
          <span className="flex items-center gap-1 text-xs text-white/35">
            <Shield className="h-3 w-3" />
            {t("pricing.cancel_anytime")}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-3 text-xs">
          <a
            href="https://amynest.in/privacy"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-privacy"
            className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors"
          >
            {t("pages.landing.privacy_policy")}
          </a>
          <span className="text-white/25">·</span>
          <a
            href="https://amynest.in/terms"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-terms"
            className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors"
          >
            {t("pages.landing.terms_of_service")}
          </a>
          <span className="text-white/25">·</span>
          <a
            href="https://amynest.in/support"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pricing-link-support"
            className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors"
          >
            {t("pages.landing.support")}
          </a>
        </div>
      </div>

      {/* ── Payment-processing overlay ── */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            data-on-dark
            className="flex w-72 flex-col items-center gap-4 rounded-3xl px-8 py-8 text-center shadow-2xl"
            // audit-ok: dark translucent payment-processing card
            style={{ background: "rgba(20,10,40,0.92)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {verifying ? (
              <>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  // audit-ok: brand gradient spinner ring on dark overlay
                  style={{ background: "linear-gradient(135deg,#7b3ff2,#ff4ecd)" }}
                >
                  <Loader2 className="h-7 w-7 animate-spin text-white" /> {/* audit-ok: white spinner on gradient */}
                </div>
                <p className="text-base font-black text-white">
                  {t("pricing.verifying_payment", { defaultValue: PURCHASE_SCREEN.verifyTitle })}
                </p>
                <p className="text-xs text-white/55">
                  {t("pricing.verifying_subtitle", { defaultValue: PURCHASE_SCREEN.verifySubtitle })}
                </p>
              </>
            ) : (
              <>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  // audit-ok: brand gradient spinner ring on dark overlay
                  style={{ background: "linear-gradient(135deg,#7b3ff2,#ff4ecd)" }}
                >
                  <Loader2 className="h-7 w-7 animate-spin text-white" /> {/* audit-ok: white spinner on gradient */}
                </div>
                <p className="text-base font-black text-white">
                  {t("pricing.processing_payment", { defaultValue: PURCHASE_SCREEN.processingTitle })}
                </p>
                <p className="text-xs text-white/55">
                  {t("pricing.processing_subtitle", { defaultValue: PURCHASE_SCREEN.processingSubtitle })}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <SubscriptionCancelDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        periodEnd={periodEnd}
        cancelling={cancelling}
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
          void onUpgradeNativeStore();
        }}
        onConfirmCancel={() => void onCancel()}
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
