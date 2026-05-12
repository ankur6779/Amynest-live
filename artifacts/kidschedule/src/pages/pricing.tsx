import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check, Rocket, AlertTriangle, X, Smartphone,
  Sparkles, Crown, Zap, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { isIndiaRegion } from "@/lib/geo";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  monthly: <Zap className="h-4 w-4" />,
  six_month: <Sparkles className="h-4 w-4" />,
  yearly: <Crown className="h-4 w-4" />,
};

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
  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showRazorpay = isIndiaRegion();
  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const provider = entitlements?.provider ?? "none";
  const periodEnd = entitlements?.currentPeriodEnd
    ? new Date(entitlements.currentPeriodEnd).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;
  const isManagedByStore = provider === "revenuecat";
  const canCancelHere = isPremium && !cancelAtPeriodEnd && !isManagedByStore;

  const onUpgrade = async () => {
    setSubmitting(true);
    setNotice(null);
    const res = await checkoutRazorpay(selected);
    setSubmitting(false);
    if (!res.ok && !res.userCancelled) setNotice(res.reason ?? t("pricing.checkout_unavailable"));
  };
  const onCancel = async () => {
    setCancelling(true);
    setShowConfirm(false);
    setNotice(null);
    const res = await cancelSubscription();
    setCancelling(false);
    if (!res.ok) setNotice(res.reason ?? "Could not cancel. Please try again.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A]">

      {/* ── Hero banner ── */}
      <div // audit-ok: intentional dark brand gradient header
        className="relative overflow-hidden px-4 pb-10 pt-12 text-center"
        data-on-dark
      >
        {/* Glow blobs */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          // audit-ok: brand violet glow decoration
          style={{ background: "radial-gradient(circle, #7b3ff2 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -right-12 top-8 h-48 w-48 rounded-full opacity-20 blur-2xl"
          // audit-ok: brand pink glow decoration
          style={{ background: "radial-gradient(circle, #ff4ecd 0%, transparent 70%)" }}
        />

        {/* Icon */}
        <div
          className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_8px_32px_rgba(255,78,205,0.5)]"
          // audit-ok: brand violet→pink gradient on icon badge
          style={{ background: "linear-gradient(135deg,#7b3ff2,#ff4ecd)" }}
        >
          <Crown className="h-7 w-7 text-white" /> {/* audit-ok: white icon on brand gradient */}
        </div>

        <h1 className="relative z-10 mb-2 text-3xl font-black tracking-tight text-white">
          {/* audit-ok: white text on dark brand gradient */}
          {t("pricing.title")}
        </h1>
        <p className="relative z-10 mx-auto max-w-md text-sm leading-relaxed text-white/65">
          {/* audit-ok: muted white on dark gradient */}
          {t("pricing.subtitle")}
        </p>

        {isPremium && (
          <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-white/90 ring-1 ring-white/20">
            {/* audit-ok: white text on semi-transparent dark pill */}
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

      {/* ── Plan cards ── */}
      <div className="px-4 pb-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-white/50">{t("pricing.loading_plans")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const isSelected = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  data-testid={`plan-card-${p.id}`}
                  data-on-dark
                  className={[
                    "relative w-full rounded-2xl border-2 p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_8px_24px_rgba(255,78,205,0.35)]"
                      : "border-white/10 bg-white/5 hover:border-white/25",
                  ].join(" ")}
                >
                  {/* Badge */}
                  {p.badge && (
                    <span
                      className="absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
                      // audit-ok: white text on brand gradient badge
                      style={{ background: "linear-gradient(90deg,#7b3ff2,#ff4ecd)" }}
                    >
                      {p.badge}
                    </span>
                  )}

                  {/* Plan icon + title */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className={isSelected ? "text-primary" : "text-white/50"}>
                      {/* audit-ok: icon inherits parent color token on dark surface */}
                      {PLAN_ICONS[p.id] ?? <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-bold text-white">{p.title}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">₹{p.price}</span>
                    <span className="text-xs text-white/50">/ {p.period}</span>
                  </div>

                  {/* Savings */}
                  {typeof p.savingsPercent === "number" && p.savingsPercent > 0 && (
                    <div className="mb-3 text-xs font-extrabold text-primary">
                      {/* audit-ok: primary color token on dark card */}
                      {t("pricing.save_percent", { percent: p.savingsPercent })}
                    </div>
                  )}

                  {/* Features */}
                  <ul className="mt-3 space-y-1.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/80">
                        {/* audit-ok: check icon inherits white/pink on dark surface */}
                        <Check
                          className={[
                            "mt-0.5 h-3 w-3 shrink-0",
                            isSelected ? "text-primary" : "text-white/40",
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
        )}
      </div>

      {/* ── Notice ── */}
      {notice && (
        <div className="mx-4 mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/80">
          {/* audit-ok: white text on dark semi-transparent surface */}
          {notice}
        </div>
      )}

      {/* ── CTAs ── */}
      <div className="mx-auto max-w-md space-y-3 px-4 pb-10">
        {/* India → Razorpay upgrade button */}
        {showRazorpay && (
          <Button
            onClick={onUpgrade}
            disabled={submitting || plans.length === 0 || isPremium}
            data-testid="button-upgrade"
            data-on-dark
            className="h-12 w-full border-0 text-base font-extrabold text-white shadow-[0_10px_24px_rgba(255,78,205,0.4)] hover:opacity-90"
            // audit-ok: white text on brand gradient CTA button
            style={{ background: "linear-gradient(90deg,#7b3ff2,#ff4ecd)" }}
          >
            <Rocket className="mr-2 h-4 w-4" />
            {isPremium
              ? t("pricing.already_premium")
              : submitting
                ? t("common.please_wait")
                : t("pricing.upgrade_now")}
          </Button>
        )}

        {/* Non-India → prompt to use mobile app */}
        {!showRazorpay && !isPremium && (
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

        {/* Razorpay / manual cancel */}
        {canCancelHere && (
          <Button
            variant="outline"
            onClick={() => setShowConfirm(true)}
            disabled={cancelling}
            data-testid="button-cancel-subscription"
            data-on-dark
            className="h-11 w-full border-white/20 text-sm font-semibold text-white/70 hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            {cancelling ? "Cancelling…" : "Cancel Subscription"}
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

        {/* Scheduled to cancel */}
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

        {/* Trust line */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <span className="flex items-center gap-1 text-xs text-white/35">
            <Shield className="h-3 w-3" />
            {/* audit-ok: muted white on dark background — trust badge */}
            {t("pricing.cancel_anytime")}
          </span>
        </div>
      </div>

      {/* ── Cancel Confirmation Dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-extrabold text-foreground">
                {t("pages.pricing.cancel_subscription")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("pages.pricing.you_ll_lose_access_to_all_premium_features")}
                {periodEnd ? ` on ${periodEnd}` : " at the end of your current billing period"}
                {t("pages.pricing.this_action_cannot_be_undone")}
              </p>
              <div className="mt-2 flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  {t("pages.pricing.keep_premium")}
                </Button>
                <Button
                  onClick={onCancel}
                  className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                  data-testid="button-confirm-cancel"
                >
                  {t("pages.pricing.yes_cancel")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
