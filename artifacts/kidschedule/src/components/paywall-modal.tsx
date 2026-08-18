import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, Check, X, Smartphone, Zap, Gift, ArrowLeft,
  Headphones, CalendarDays, Brain, Users, MessageCircle, BarChart3,
  LayoutGrid, FileText, Moon, Utensils, type LucideIcon,
} from "lucide-react";
import { usePricingRegion, applyIndiaPricing } from "@/lib/pricing-region";
import { useUser } from "@/lib/firebase-auth-hooks";
import { getGuestCheckoutBlock } from "@/lib/anonymous-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePaywall, type PaywallReason as AppPaywallReason } from "@/contexts/paywall-context";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { usePrimaryChild } from "@/hooks/use-primary-child";
import { SubscriptionTrialOffer } from "@/components/subscription-trial-offer";
import { resolvePaywallCopy } from "@/lib/subscription-paywall-personalization";
import {
  sortPlanCards,
  resolveDefaultPlanId,
  trackHubJourneyAnnualSelected,
  isHubJourneyReason,
  isAnnualHighlightedPlan,
  trackPlanSelected,
} from "@/lib/subscription-plans";
import { usePlanCardViewAnalytics } from "@/hooks/use-plan-card-view-analytics";
import type { PlanBillingLabels } from "@/lib/plan-price";
import {
  planCardPricePresentation,
  planStorePriceOptions,
} from "@/lib/pricing-plan-card-ui";
import { PlanPriceLines } from "@/components/plan-price-lines";
import {
  trackSubscriptionEvent,
  syncRevenueCatSubscriptionAttributes,
} from "@/lib/subscription-analytics";
import { track } from "@/lib/analytics";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { useTranslation } from "react-i18next";
import {
  FREE_VS_PREMIUM_MATRIX,
  PAYWALL_CORE_BENEFITS,
  PAYWALL_REASON_COPY,
  PAYWALL_SOCIAL_PROOF,
  PURCHASE_SCREEN,
  TRUST_SECTION,
  UPGRADE_MODAL,
  planCta,
} from "@workspace/subscription-marketing";
import {
  entitlementDebugSlice,
  logSubscriptionDebug,
} from "@/lib/subscription-debug";
import { resolvePaywallUsageProgress } from "@/lib/paywall-usage";
import {
  buildFamilyProgressItems,
  resolveWinbackProgressLine,
} from "@/lib/paywall-family-progress";
import { resolveNextUnlocks } from "@/lib/paywall-next-unlocks";
import { getPaywallVisitCount } from "@/lib/subscription-funnel-storage";
import { PaywallFamilyProgressCard } from "@/components/paywall-family-progress-card";
import { PaywallNextUnlockPreview } from "@/components/paywall-next-unlock-preview";
import { PaywallExitIntercept } from "@/components/paywall-exit-intercept";
import { requestPremiumWelcome } from "@/lib/premium-welcome-controller";

const DEFAULT_PAYWALL = UPGRADE_MODAL;

const REASON_ICONS: Record<AppPaywallReason, LucideIcon> = {
  ai_quota: MessageCircle,
  infant_ai_quota: MessageCircle,
  personalized_coaching: Brain,
  premium_insight: BarChart3,
  child_limit: Users,
  audio_lessons: Headphones,
  routines_limit: CalendarDays,
  behavior_locked: BarChart3,
  child_locked: Users,
  coach_locked: Brain,
  hub_locked: LayoutGrid,
  hub_journey: LayoutGrid,
  feature: Sparkles,
  section_locked: Sparkles,
  phonics_workbook: FileText,
  hub_nutrition: Sparkles,
  nutrition_library: FileText,
  speech_coach: MessageCircle,
  learning_locked: FileText,
  infant_sleep_coach: Moon,
  infant_feeding_plan: Utensils,
};

export function PaywallModal() {
  const { t } = useTranslation();
  const { state, closePaywall } = usePaywall();
  const { plans, checkoutRazorpay, entitlements } = useSubscription();
  const { childName } = usePrimaryChild();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const nativeBilling = useNativeBilling();
  const { isIndia } = usePricingRegion({
    enabled: !nativeBilling.wrapperPresent,
  });
  // India web pays in INR via Razorpay — show ₹ prices that match the charge.
  const regionalPlans = useMemo(
    () =>
      isIndia && !nativeBilling.wrapperPresent ? applyIndiaPricing(plans) : plans,
    [plans, isIndia, nativeBilling.wrapperPresent],
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

  usePlanCardViewAnalytics(sortedPlans, "paywall_modal", state.open && sortedPlans.length > 0);

  const [selected, setSelected] = useState<Exclude<Plan, "free">>(() =>
    resolveDefaultPlanId(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [exitInterceptOpen, setExitInterceptOpen] = useState(false);
  const progressViewedRef = useRef(false);

  useEffect(() => {
    if (!state.open) {
      setExitInterceptOpen(false);
      progressViewedRef.current = false;
      return;
    }
    setNotice(null);
    setExitInterceptOpen(false);
    if (isHubJourneyReason(state.reason)) {
      setSelected("yearly");
      trackHubJourneyAnnualSelected("paywall_modal");
      return;
    }
    setSelected(resolveDefaultPlanId());
  }, [state.open, state.reason]);

  const reason = (state.reason in PAYWALL_REASON_COPY
    ? state.reason
    : "feature") as AppPaywallReason;
  const copy =
    reason === "phonics_workbook"
      ? {
          title: "15 Complete Phonics Workbook Sets with Premium",
          subtitle:
            "Get 150+ paid-subscriber worksheets for ages 3-7 covering vowels, blends, digraphs, sight words, and early reading confidence.",
          cta: "Continue with phonics workbooks",
        }
      : resolvePaywallCopy(reason, childName, state.module, state.source);
  const HeroIcon = REASON_ICONS[reason] ?? Sparkles;
  const usageProgress = resolvePaywallUsageProgress(reason, entitlements);
  const familyProgress = useMemo(
    () => buildFamilyProgressItems(entitlements),
    [entitlements],
  );
  const visitCount = getPaywallVisitCount();
  const winbackLine = resolveWinbackProgressLine(visitCount, familyProgress);
  const nextUnlocks = useMemo(
    () => resolveNextUnlocks(reason, state.module),
    [reason, state.module],
  );

  useEffect(() => {
    if (!state.open || progressViewedRef.current) return;
    if (familyProgress.length === 0 && !winbackLine) return;
    progressViewedRef.current = true;
    trackSubscriptionEvent({
      event: "progress_card_viewed",
      reason,
      source: state.source ?? "paywall_modal",
      extra: { item_count: familyProgress.length, visit_count: visitCount },
    });
    if (winbackLine) {
      trackSubscriptionEvent({
        event: "winback_shown",
        reason,
        source: state.source ?? "paywall_modal",
        extra: { visit_count: visitCount, soft: true },
      });
    }
  }, [state.open, familyProgress.length, winbackLine, reason, state.source, visitCount]);

  const contextualCta = copy.cta?.trim() || DEFAULT_PAYWALL.cta;
  const selectedCta = contextualCta || planCta(selected);
  const socialProof =
    PAYWALL_SOCIAL_PROOF[Math.abs(reason.length) % PAYWALL_SOCIAL_PROOF.length] ??
    PAYWALL_SOCIAL_PROOF[0];

  const selectPlan = (plan: Exclude<Plan, "free">) => {
    setSelected(plan);
    trackPlanSelected(plan, "paywall_modal", reason);
  };

  const requestClose = () => {
    if (exitInterceptOpen) return;
    setExitInterceptOpen(true);
    trackSubscriptionEvent({
      event: "exit_intercept_shown",
      reason,
      source: state.source ?? "paywall_modal",
    });
  };

  const dismissPaywall = () => {
    trackSubscriptionEvent({
      event: "paywall_close",
      reason,
      source: state.source ?? "paywall_modal",
    });
    setExitInterceptOpen(false);
    closePaywall();
  };

  const onExitContinue = () => {
    trackSubscriptionEvent({
      event: "exit_intercept_continue",
      reason,
      source: state.source ?? "paywall_modal",
    });
    trackSubscriptionEvent({
      event: "paywall_continue",
      reason,
      source: state.source ?? "paywall_modal",
    });
    setExitInterceptOpen(false);
  };

  const onExitDismiss = () => {
    trackSubscriptionEvent({
      event: "exit_intercept_dismiss",
      reason,
      source: state.source ?? "paywall_modal",
    });
    dismissPaywall();
  };

  const completePurchaseSuccess = () => {
    closePaywall();
    requestPremiumWelcome();
  };

  const onPayWithRazorpay = async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      setNotice(guestBlock.message);
      return;
    }
    track("premium_cta_clicked", { source: reason });
    track("upgrade_started", {
      module: state.module,
      source: state.source ?? "paywall_modal",
      action: state.action ?? "checkout",
      entitlement_state: state.entitlementState ?? "free",
    });
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      plan: selected,
      reason,
      source: "paywall_modal",
    });
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      reason,
      source: "paywall_modal",
    });
    logSubscriptionDebug({
      phase: "paywall_checkout_start",
      source: "paywall_modal",
      reason,
      plan: selected,
      entitlement: entitlementDebugSlice(entitlements),
      billing: {
        platform: nativeBilling.platform,
        wrapperPresent: nativeBilling.wrapperPresent,
        available: nativeBilling.available,
      },
      extra: { method: "razorpay" },
    });
    setSubmitting(true);
    setNotice(null);
    const prefill = {
      name: user?.fullName ?? undefined,
      email: user?.primaryEmailAddress?.emailAddress,
      contact: user?.primaryPhoneNumber?.phoneNumber,
    };
    const res = await checkoutRazorpay(selected, prefill);
    setSubmitting(false);
    logSubscriptionDebug({
      phase: "paywall_purchase_result",
      source: "paywall_modal",
      plan: selected,
      reason,
      purchase: { ok: res.ok, userCancelled: res.userCancelled, error: res.reason },
      extra: { method: "razorpay" },
    });
    if (res.ok) {
      track("upgrade_completed", {
        module: state.module,
        source: state.source ?? "paywall_modal",
        action: state.action ?? "checkout",
        entitlement_state: "premium",
      });
      trackSubscriptionEvent({
        event: "purchase_success",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
      void syncRevenueCatSubscriptionAttributes({
        last_plan: selected,
        last_paywall_reason: reason,
      });
      completePurchaseSuccess();
    } else if (res.userCancelled) {
      trackSubscriptionEvent({
        event: "checkout_cancelled",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
      trackSubscriptionEvent({
        event: "purchase_cancelled",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
    } else {
      trackSubscriptionEvent({
        event: "purchase_failed",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
      setNotice(res.reason ?? t("pricing.checkout_unavailable"));
    }
  };

  const onPayWithNative = async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      setNotice(guestBlock.message);
      return;
    }
    track("premium_cta_clicked", { source: reason });
    track("upgrade_started", {
      module: state.module,
      source: state.source ?? "paywall_modal",
      action: state.action ?? "checkout",
      entitlement_state: state.entitlementState ?? "free",
    });
    trackSubscriptionEvent({
      event: "subscribe_clicked",
      plan: selected,
      reason,
      source: "paywall_modal",
    });
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      reason,
      source: "paywall_modal",
    });
    logSubscriptionDebug({
      phase: "paywall_checkout_start",
      source: "paywall_modal",
      reason,
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
    setSubmitting(true);
    setNotice(null);
    const res = await nativeBilling.purchase(selected, {
      source: state.source ?? "paywall_modal",
    });
    setSubmitting(false);
    logSubscriptionDebug({
      phase: "paywall_purchase_result",
      source: "paywall_modal",
      plan: selected,
      reason,
      purchase: { ok: res.ok, userCancelled: res.userCancelled, error: res.reason },
      extra: { method: "native_store" },
    });
    if (res.ok && res.isPremiumSubscriber) {
      void syncRevenueCatSubscriptionAttributes({
        last_plan: selected,
        last_paywall_reason: reason,
      });
      completePurchaseSuccess();
    } else if (res.userCancelled) {
      trackSubscriptionEvent({
        event: "checkout_cancelled",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
      trackSubscriptionEvent({
        event: "purchase_cancelled",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
    } else {
      trackSubscriptionEvent({
        event: "purchase_failed",
        plan: selected,
        reason,
        source: "paywall_modal",
      });
      const fallback = nativeBilling.platform === "ios"
        ? t("pricing.apple_unavailable")
        : t("pricing.google_play_unavailable");
      setNotice(res.reason ?? fallback);
    }
  };

  const isNativeShell = nativeBilling.wrapperPresent;
  const isIOS = nativeBilling.platform === "ios";
  const isAndroid = nativeBilling.platform === "android";

  const nativeButtonLabel = isIOS
    ? (submitting || nativeBilling.purchasing
        ? t("pricing.app_store_processing")
        : selectedCta)
    : (submitting || nativeBilling.purchasing
        ? t("pricing.google_play_processing")
        : selectedCta);

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="relative max-w-2xl w-[calc(100vw-1rem)] sm:w-full p-0 gap-0 overflow-hidden border-0 bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A] text-white max-h-[95dvh] flex flex-col [&>button]:hidden">
        <PaywallExitIntercept
          open={exitInterceptOpen}
          onContinue={onExitContinue}
          onDismiss={onExitDismiss}
          continueLabel={contextualCta}
        />
        <div className="sticky top-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#0B0B1A]/95 to-[#0B0B1A]/70 backdrop-blur-md border-b border-white/5">
          <button
            onClick={requestClose}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/20 transition"
            aria-label={t("components.paywall_modal.back")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("components.paywall_modal.back_2")}
          </button>
          <button
            onClick={requestClose}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
            aria-label={t("components.paywall_modal.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 pt-4 pb-4">
          <div className="text-center mb-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 mb-3">
              <HeroIcon className="h-7 w-7 text-white" aria-hidden />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 leading-tight">{copy.title}</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">{copy.subtitle}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {socialProof}
            </p>
          </div>

          <PaywallFamilyProgressCard items={familyProgress} winbackLine={winbackLine} />
          <PaywallNextUnlockPreview items={nextUnlocks} />

          {usageProgress && (
            <div
              className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              data-testid="paywall-usage-progress"
              role="status"
              aria-label={`${usageProgress.used} of ${usageProgress.limit} ${usageProgress.label} used`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white/80">
                <span>{usageProgress.label}</span>
                <span>
                  {usageProgress.used} of {usageProgress.limit} used
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-[width] duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((usageProgress.used / usageProgress.limit) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {reason !== "phonics_workbook" && (
            <div className="mb-4">
              <SubscriptionTrialOffer
                source="paywall_modal"
                onActivated={dismissPaywall}
              />
            </div>
          )}

          <div className="grid gap-3 mb-4 grid-cols-1 sm:grid-cols-3 sm:items-end">
            {sortedPlans.map(p => {
              const isSelected = p.id === selected;
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
              const annualHighlight = isAnnualHighlightedPlan(p.id);
              const badgeLabel = annualHighlight
                ? "Most Popular"
                : p.id === "six_month"
                  ? null
                  : p.badge;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p.id)}
                  data-testid={`paywall-plan-${p.id}`}
                  className={[
                    "relative text-left rounded-2xl p-4 border-2 transition-all",
                    annualHighlight ? "order-first sm:order-none sm:scale-[1.03] sm:z-10" : "",
                    isSelected
                      ? "border-border bg-primary shadow-[0_8px_24px_rgba(255,78,205,0.35)]"
                      : "border-white/10 bg-white/5 hover:border-white/30",
                    annualHighlight && !isSelected ? "border-primary/40 bg-primary/5" : "",
                  ].join(" ")}
                >
                  {badgeLabel && (
                    <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-primary">
                      {badgeLabel}
                    </span>
                  )}
                  <div className="font-bold text-sm mb-0.5">{p.title}</div>
                  {annualHighlight && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/90 mb-1">
                      Best Value
                    </p>
                  )}
                  {p.tagline && (
                    <p className="text-[10px] text-white/55 mb-2 leading-snug">{p.tagline}</p>
                  )}
                  <div className="mb-2">
                    <PlanPriceLines
                      presentation={presentation}
                      savings={savings}
                      priceClassName={
                        p.id === "yearly"
                          ? "text-2xl sm:text-3xl font-black leading-tight"
                          : p.id === "six_month"
                            ? "text-xl sm:text-2xl font-black leading-tight"
                            : "text-lg sm:text-xl font-bold leading-tight"
                      }
                      compact
                    />
                  </div>
                  <ul className="space-y-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/85">
                        <Check className={["h-3 w-3 mt-0.5 shrink-0", isSelected ? "text-primary" : "text-white/50"].join(" ")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <ul
            className="mb-4 space-y-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
            data-testid="paywall-benefits-list"
          >
            {PAYWALL_CORE_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-xs text-white/85">
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div
            className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
            data-testid="paywall-free-vs-premium"
          >
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white/50">
              <span>Included</span>
              <span>Free</span>
              <span className="text-primary">Premium</span>
            </div>
            {FREE_VS_PREMIUM_MATRIX.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/5 px-3 py-2 text-[11px] last:border-b-0"
              >
                <span className="text-white/75">{row.label}</span>
                <span className="text-white/55">{row.free}</span>
                <span className="font-semibold text-white/95">{row.premium}</span>
              </div>
            ))}
          </div>

          {notice && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 mb-4 text-muted-foreground text-xs font-semibold">
              <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="leading-snug">{notice}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 z-20 border-t border-white/10 bg-gradient-to-t from-[#0B0B1A] via-[#0B0B1A]/98 to-[#0B0B1A]/90 px-5 sm:px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isNativeShell && nativeBilling.available && (
            <>
              <Button
                onClick={onPayWithNative}
                disabled={submitting || nativeBilling.purchasing || plans.length === 0}
                analyticsId="paywall_cta_native_checkout"
                analyticsFeature="premium"
                analyticsLabel={nativeButtonLabel}
                className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
                data-testid="paywall-cta-native"
              >
                <Zap className="h-4 w-4 mr-2" />
                {nativeButtonLabel}
              </Button>
              <button
                type="button"
                onClick={() => {
                  void nativeBilling.restore("paywall_modal");
                }}
                className="w-full mt-2 text-white/60 text-xs font-semibold py-2 hover:text-white/85"
                data-testid="paywall-restore"
              >
                {PURCHASE_SCREEN.restorePurchases}
              </button>
              {isIOS && (
                <p className="text-center text-[10px] text-white/30 mt-1">
                  {t("components.paywall_modal.ios_billing_note")}
                </p>
              )}
              {isAndroid && (
                <p className="text-center text-[10px] text-white/30 mt-1">
                  {t("components.paywall_modal.android_billing_note")}
                </p>
              )}
            </>
          )}

          {isNativeShell && !nativeBilling.available && (
            <div className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-muted-foreground text-xs font-semibold leading-relaxed">
              {nativeBilling.unavailableReason ??
                (isIOS
                  ? t("pricing.apple_unavailable")
                  : t("pricing.google_play_unavailable"))}
            </div>
          )}

          {!isNativeShell && isIndia && (
            <Button
              onClick={onPayWithRazorpay}
              disabled={submitting || plans.length === 0}
              analyticsId="paywall_cta_razorpay_checkout"
              analyticsFeature="premium"
              analyticsLabel={selectedCta}
              className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
              data-testid="paywall-cta-razorpay"
            >
              <Zap className="h-4 w-4 mr-2" />
              {submitting ? t("pricing.processing_payment") : selectedCta}
            </Button>
          )}

          {!isNativeShell && !isIndia && (
            <div className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-4 text-center space-y-2">
              <Smartphone className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-sm font-bold text-white/90">
                {t("components.paywall_modal.subscribe_via_the_amynest_app")}
              </p>
              <p className="text-xs text-white/55 leading-relaxed">
                {t("components.paywall_modal.web_payments_are_currently_available_in_india_only_download_")}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              dismissPaywall();
              setLocation("/referrals");
            }}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-muted-foreground font-extrabold text-sm py-1.5"
          >
            <Gift className="h-4 w-4" />
            {t("components.paywall_modal.or_invite_friends_to_earn_premium_free")}
          </button>

          <button
            type="button"
            onClick={requestClose}
            className="w-full text-center text-white/55 text-sm py-1.5 hover:text-white/80"
          >
            {t("components.paywall_modal.maybe_later", { defaultValue: DEFAULT_PAYWALL.dismiss })}
          </button>

          <p className="text-center text-[11px] text-white/35 mt-1">
            {isAndroid
              ? t("components.paywall_modal.secure_play_family", {
                  defaultValue:
                    "Secure payment via Google Play · Family friendly · Cancel anytime",
                })
              : PURCHASE_SCREEN.trustLine}
          </p>
          <p className="text-center text-[10px] text-white/30 mt-0.5">
            {TRUST_SECTION.items.find((i) => i.label === "Secure checkout")?.detail ??
              "App Store · Google Play · Razorpay"}
          </p>

          <div className="flex items-center justify-center gap-3 mt-2 text-[11px]">
            <a
              href="https://amynest.in/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors"
              data-testid="paywall-link-privacy"
            >
              {t("pages.landing.privacy_policy")}
            </a>
            <span className="text-white/25">·</span>
            <a
              href="https://amynest.in/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors"
              data-testid="paywall-link-terms"
            >
              {t("pages.landing.terms_of_service")}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
