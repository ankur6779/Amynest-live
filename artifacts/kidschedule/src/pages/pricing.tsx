import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Check, Rocket, AlertTriangle, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";

export default function PricingPage() {
  const { t } = useTranslation();
  const { plans, entitlements, isPremium, checkout, loading, cancelSubscription } = useSubscription();
  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const provider = entitlements?.provider ?? "none";
  const periodEnd = entitlements?.currentPeriodEnd
    ? new Date(entitlements.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;
  // RevenueCat = Google Play or Apple App Store — cannot cancel server-side.
  const isManagedByStore = provider === "revenuecat";
  // Razorpay or manual grants can be cancelled from here.
  const canCancelHere = isPremium && !cancelAtPeriodEnd && !isManagedByStore;

  const onUpgrade = async () => {
    setSubmitting(true);
    setNotice(null);
    const res = await checkout(selected);
    setSubmitting(false);
    if (!res.ok) setNotice(res.reason ?? t("pricing.checkout_unavailable"));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-4 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-3">{t("pricing.title")}</h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
          {isPremium && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              <Check className="h-4 w-4" /> {t("pricing.on_plan", { plan: entitlements?.plan })}
              {cancelAtPeriodEnd && periodEnd && (
                <span className="font-normal text-amber-600 ml-1">· Cancels {periodEnd}</span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-400">{t("pricing.loading_plans")}</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isSelected = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={[
                    "relative text-left rounded-3xl p-6 border-2 bg-white dark:bg-slate-800 transition-all hover:-translate-y-1",
                    isSelected
                      ? "border-pink-400 shadow-[0_16px_40px_-8px_rgba(236,72,153,0.4)]"
                      : "border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500",
                  ].join(" ")}
                  data-testid={`plan-card-${p.id}`}
                >
                  {p.badge && (
                    <span className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-pink-500 text-white">
                      {p.badge}
                    </span>
                  )}
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-2">{p.title}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-slate-100">₹{p.price}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/ {p.period}</span>
                  </div>
                  {typeof p.savingsPercent === "number" && p.savingsPercent > 0 && (
                    <div className="text-sm font-extrabold text-pink-500 mb-4">{t("pricing.save_percent", { percent: p.savingsPercent })}</div>
                  )}
                  <ul className="space-y-2 mt-4">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Check className={["h-4 w-4 mt-0.5 shrink-0", isSelected ? "text-pink-500" : "text-emerald-500"].join(" ")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        {notice && (
          <div className="mt-6 max-w-md mx-auto rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
            {notice}
          </div>
        )}

        <div className="mt-8 max-w-md mx-auto space-y-3">
          <Button
            onClick={onUpgrade}
            disabled={submitting || plans.length === 0 || isPremium}
            className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(236,72,153,0.4)]"
            data-testid="button-upgrade"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {isPremium ? t("pricing.already_premium") : submitting ? t("common.please_wait") : t("pricing.upgrade_now")}
          </Button>

          {/* Razorpay / manual — cancel directly from here */}
          {canCancelHere && (
            <Button
              variant="outline"
              onClick={() => setShowConfirm(true)}
              disabled={cancelling}
              className="w-full h-11 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              data-testid="button-cancel-subscription"
            >
              {cancelling ? "Cancelling…" : "Cancel Subscription"}
            </Button>
          )}

          {/* RevenueCat — managed by Google Play / App Store */}
          {isPremium && !cancelAtPeriodEnd && isManagedByStore && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <p className="font-bold mb-1">Subscribed via Google Play / App Store</p>
                  <p className="text-xs leading-relaxed">
                    Your billing is managed by your device's app store. To cancel, open{" "}
                    <strong>Google Play → Subscriptions</strong> or{" "}
                    <strong>iPhone → App Store → Subscriptions</strong> and cancel AmyNest there.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Already scheduled to cancel */}
          {isPremium && cancelAtPeriodEnd && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
              Your subscription is scheduled to cancel
              {periodEnd ? ` on ${periodEnd}` : ""}. You'll keep premium access until then.
            </div>
          )}

          <p className="text-center text-xs text-slate-400">{t("pricing.cancel_anytime")}</p>
        </div>
      </div>

      {/* ── Cancel Confirmation Dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Cancel Subscription?</h2>
              <p className="text-sm text-slate-500">
                You'll lose access to all premium features
                {periodEnd ? ` on ${periodEnd}` : " at the end of your current billing period"}.
                This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Keep Premium
                </Button>
                <Button
                  onClick={onCancel}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                  data-testid="button-confirm-cancel"
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
