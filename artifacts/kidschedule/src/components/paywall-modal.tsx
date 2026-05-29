import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Check, X, Smartphone, Zap, Gift, ArrowLeft,
  Headphones, CalendarDays, Brain, Users, MessageCircle, BarChart3,
  LayoutGrid, FileText, type LucideIcon,
} from "lucide-react";
import { isIndiaRegion } from "@/lib/geo";
import { useUser } from "@/lib/firebase-auth-hooks";
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
  annualSavingsLabel,
  isAnnualHighlightedPlan,
  trackPlanSelected,
} from "@/lib/subscription-plans";
import {
  planCardPricePresentation,
  planStorePriceOptions,
} from "@/lib/pricing-plan-card-ui";
import { PlanPriceLines } from "@/components/plan-price-lines";
import {
  trackSubscriptionEvent,
  syncRevenueCatSubscriptionAttributes,
} from "@/lib/subscription-analytics";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  PAYWALL_REASON_COPY,
  PURCHASE_SCREEN,
  UPGRADE_MODAL,
  planCta,
} from "@workspace/subscription-marketing";

const DEFAULT_PAYWALL = UPGRADE_MODAL;

const REASON_ICONS: Record<AppPaywallReason, LucideIcon> = {
  ai_quota: MessageCircle,
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
  speech_coach: MessageCircle,
  learning_locked: FileText,
};

export function PaywallModal() {
  const { t } = useTranslation();
  const { state, closePaywall } = usePaywall();
  const { plans, checkoutRazorpay } = useSubscription();
  const { childName } = usePrimaryChild();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const nativeBilling = useNativeBilling();
  const { toast } = useToast();
  const sortedPlans = useMemo(() => sortPlanCards(plans), [plans]);
  const [selected, setSelected] = useState<Exclude<Plan, "free">>(() =>
    resolveDefaultPlanId(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!state.open) return;
    setNotice(null);
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
  const copy = resolvePaywallCopy(reason, childName);
  const HeroIcon = REASON_ICONS[reason] ?? Sparkles;
  const selectedCta = planCta(selected);

  const selectPlan = (plan: Exclude<Plan, "free">) => {
    setSelected(plan);
    trackPlanSelected(plan, "paywall_modal", reason);
  };

  const onPayWithRazorpay = async () => {
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      reason,
      source: "paywall_modal",
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
    if (res.ok) {
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
      closePaywall();
    } else if (!res.userCancelled) {
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
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: selected,
      reason,
      source: "paywall_modal",
    });
    setSubmitting(true);
    setNotice(null);
    const res = await nativeBilling.purchase(selected);
    setSubmitting(false);
    if (res.ok) {
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
      toast({
        title: PURCHASE_SCREEN.successTitle,
        description: PURCHASE_SCREEN.successBody,
      });
      closePaywall();
    } else if (!res.userCancelled) {
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
        ? t("pricing.apple_processing")
        : selectedCta)
    : (submitting || nativeBilling.purchasing
        ? t("pricing.google_play_processing")
        : selectedCta);

  return (
    <Dialog open={state.open} onOpenChange={o => !o && closePaywall()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-full p-0 gap-0 overflow-hidden border-0 bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A] text-white max-h-[95dvh] flex flex-col [&>button]:hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#0B0B1A]/95 to-[#0B0B1A]/70 backdrop-blur-md border-b border-white/5">
          <button
            onClick={closePaywall}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/20 transition"
            aria-label={t("components.paywall_modal.back")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("components.paywall_modal.back_2")}
          </button>
          <button
            onClick={closePaywall}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
            aria-label={t("components.paywall_modal.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-8 pt-4 pb-8">
          <div className="text-center mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary mb-3 shadow-[0_8px_32px_rgba(255,78,205,0.5)]">
              <HeroIcon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">{copy.title}</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto">{copy.subtitle}</p>
          </div>

          <div className="mb-4">
            <SubscriptionTrialOffer
              source="paywall_modal"
              onActivated={closePaywall}
            />
          </div>

          <div className="grid gap-3 mb-5 grid-cols-1 sm:grid-cols-3 sm:items-end">
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
              );
              const annualHighlight = isAnnualHighlightedPlan(p.id);
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
                  {p.badge && (
                    <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-primary">
                      {p.badge}
                    </span>
                  )}
                  <div className="font-bold text-sm mb-0.5">{p.title}</div>
                  {p.tagline && (
                    <p className="text-[10px] text-white/55 mb-2 leading-snug">{p.tagline}</p>
                  )}
                  <div className="mb-2">
                    <PlanPriceLines
                      presentation={presentation}
                      savings={
                        savings ??
                        (typeof p.savingsPercent === "number" && p.savingsPercent > 0
                          ? `${t("components.paywall_modal.save")} ${p.savingsPercent}%`
                          : null)
                      }
                      priceClassName="text-2xl font-black leading-tight"
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

          {notice && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 mb-4 text-muted-foreground text-xs font-semibold">
              <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="leading-snug">{notice}</span>
            </div>
          )}

          {isNativeShell && nativeBilling.available && (
            <>
              <Button
                onClick={onPayWithNative}
                disabled={submitting || nativeBilling.purchasing || plans.length === 0}
                className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
              >
                <Zap className="h-4 w-4 mr-2" />
                {nativeButtonLabel}
              </Button>
              <button
                type="button"
                onClick={() => void nativeBilling.restore()}
                className="w-full mt-2 text-white/60 text-xs font-semibold py-2 hover:text-white/85"
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

          {!isNativeShell && isIndiaRegion() && (
            <Button
              onClick={onPayWithRazorpay}
              disabled={submitting || plans.length === 0}
              className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
            >
              <Zap className="h-4 w-4 mr-2" />
              {submitting ? t("pricing.processing_payment") : selectedCta}
            </Button>
          )}

          {!isNativeShell && !isIndiaRegion() && (
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
              closePaywall();
              setLocation("/referrals");
            }}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-muted-foreground font-extrabold text-sm py-2"
          >
            <Gift className="h-4 w-4" />
            {t("components.paywall_modal.or_invite_friends_to_earn_premium_free")}
          </button>

          <button
            type="button"
            onClick={closePaywall}
            className="w-full text-center mt-1 text-white/55 text-sm py-2 hover:text-white/80"
          >
            {t("components.paywall_modal.maybe_later", { defaultValue: DEFAULT_PAYWALL.dismiss })}
          </button>

          <p className="text-center text-[11px] text-white/35 mt-2">
            {PURCHASE_SCREEN.trustLine}
          </p>

          <div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
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
