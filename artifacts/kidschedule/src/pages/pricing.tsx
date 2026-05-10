import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Check, Rocket, AlertTriangle, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { isIndiaRegion } from "@/lib/geo";
import appStoreArt from "@assets/amynest-appstore-1024.png";
export default function PricingPage() {
  const {
    t
  } = useTranslation();
  const {
    plans,
    entitlements,
    isPremium,
    checkoutRazorpay,
    loading,
    cancelSubscription
  } = useSubscription();
  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Razorpay is India-only — hide for international users and prompt them to
  // use the mobile app where Apple IAP / Google Play handle local currency.
  const showRazorpay = isIndiaRegion();
  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const provider = entitlements?.provider ?? "none";
  const periodEnd = entitlements?.currentPeriodEnd ? new Date(entitlements.currentPeriodEnd).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) : null;
  // RevenueCat = Google Play or Apple App Store — cannot cancel server-side.
  const isManagedByStore = provider === "revenuecat";
  // Razorpay or manual grants can be cancelled from here.
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
    if (!res.ok) {
      setNotice(res.reason ?? "Could not cancel. Please try again.");
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-muted via-white to-muted">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <img src={appStoreArt} alt="AmyNest app store promo" className="mx-auto mb-6 h-auto w-full max-w-[420px] rounded-none object-contain" />
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary mb-4 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-black text-foreground mb-3">{t("pricing.title")}</h1>
          <p className="text-foreground max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
          {isPremium && <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-primary text-sm font-bold">
              <Check className="h-4 w-4" /> {t("pricing.on_plan", {
            plan: entitlements?.plan
          })}
              {cancelAtPeriodEnd && periodEnd && <span className="font-normal text-primary ml-1">{t("pages.pricing.cancels")} {periodEnd}</span>}
            </div>}
        </div>

        {loading ? <div className="text-center text-muted-foreground">{t("pricing.loading_plans")}</div> : <div className="grid md:grid-cols-3 gap-6">
            {plans.map(p => {
          const isSelected = p.id === selected;
          return <button key={p.id} type="button" onClick={() => setSelected(p.id)} className={["relative text-left rounded-3xl p-6 border-2 bg-white dark:bg-card transition-all hover:-translate-y-1", isSelected ? "border-border shadow-[0_16px_40px_-8px_rgba(236,72,153,0.4)]" : "border-border dark:border-border hover:border-border dark:hover:border-primary"].join(" ")} data-testid={`plan-card-${p.id}`}>
                  {p.badge && <span className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-primary text-white">
                      {p.badge}
                    </span>}
                  <div className="font-bold text-foreground dark:text-muted-foreground mb-2">{p.title}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-foreground dark:text-muted-foreground">₹{p.price}</span>
                    <span className="text-sm text-foreground dark:text-muted-foreground">/ {p.period}</span>
                  </div>
                  {typeof p.savingsPercent === "number" && p.savingsPercent > 0 && <div className="text-sm font-extrabold text-primary mb-4">{t("pricing.save_percent", {
                percent: p.savingsPercent
              })}</div>}
                  <ul className="space-y-2 mt-4">
                    {p.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground dark:text-muted-foreground">
                        <Check className={["h-4 w-4 mt-0.5 shrink-0", isSelected ? "text-primary" : "text-primary"].join(" ")} />
                        <span>{f}</span>
                      </li>)}
                  </ul>
                </button>;
        })}
          </div>}

        {notice && <div className="mt-6 max-w-md mx-auto rounded-xl border border-border bg-muted px-4 py-3 text-sm text-primary text-center">
            {notice}
          </div>}

        <div className="mt-8 max-w-md mx-auto space-y-3">
          {showRazorpay ? <Button onClick={onUpgrade} disabled={submitting || plans.length === 0 || isPremium} className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-primary to-primary hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(236,72,153,0.4)]" data-testid="button-upgrade">
              <Rocket className="h-4 w-4 mr-2" />
              {isPremium ? t("pricing.already_premium") : submitting ? t("common.please_wait") : t("pricing.upgrade_now")}
            </Button> : !isPremium && <div className="w-full rounded-xl border border-border bg-muted px-4 py-4 text-center space-y-2">
              <Smartphone className="h-5 w-5 mx-auto text-primary" />
              <p className="text-sm font-bold text-foreground">{t("pages.pricing.subscribe_via_the_amynest_app")}</p>
              <p className="text-xs text-foreground leading-relaxed">
                {t("pages.pricing.web_payments_are_currently_available_in_india_only_download_")}
              </p>
            </div>}

          {/* Razorpay / manual — cancel directly from here */}
          {canCancelHere && <Button variant="outline" onClick={() => setShowConfirm(true)} disabled={cancelling} className="w-full h-11 text-sm font-semibold border-border text-primary hover:bg-muted hover:border-border" data-testid="button-cancel-subscription">
              {cancelling ? "Cancelling…" : "Cancel Subscription"}
            </Button>}

          {/* RevenueCat — managed by Google Play / App Store */}
          {isPremium && !cancelAtPeriodEnd && isManagedByStore && <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-primary">
              <div className="flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="font-bold mb-1">{t("pages.pricing.subscribed_via_google_play_app_store")}</p>
                  <p className="text-xs leading-relaxed">
                    {t("pages.pricing.your_billing_is_managed_by_your_device_s_app_store_to_cancel")}{" "}
                    <strong>{t("pages.pricing.google_play_subscriptions")}</strong> or{" "}
                    <strong>{t("pages.pricing.iphone_app_store_subscriptions")}</strong> {t("pages.pricing.and_cancel_amynest_there")}
                  </p>
                </div>
              </div>
            </div>}

          {/* Already scheduled to cancel */}
          {isPremium && cancelAtPeriodEnd && <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-primary text-center">
              {t("pages.pricing.your_subscription_is_scheduled_to_cancel")}
              {periodEnd ? ` on ${periodEnd}` : ""}{t("pages.pricing.you_ll_keep_premium_access_until_then")}
            </div>}

          <p className="text-center text-xs text-muted-foreground">{t("pricing.cancel_anytime")}</p>
        </div>
      </div>

      {/* ── Cancel Confirmation Dialog ── */}
      {showConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6">
            <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-extrabold text-foreground">{t("pages.pricing.cancel_subscription")}</h2>
              <p className="text-sm text-foreground">
                {t("pages.pricing.you_ll_lose_access_to_all_premium_features")}
                {periodEnd ? ` on ${periodEnd}` : " at the end of your current billing period"}{t("pages.pricing.this_action_cannot_be_undone")}
              </p>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  {t("pages.pricing.keep_premium")}
                </Button>
                <Button onClick={onCancel} className="flex-1 bg-primary hover:bg-primary text-white border-0" data-testid="button-confirm-cancel">
                  {t("pages.pricing.yes_cancel")}
                </Button>
              </div>
            </div>
          </div>
        </div>}
    </div>;
}