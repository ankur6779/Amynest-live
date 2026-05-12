import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check, AlertTriangle, X, Smartphone,
  Sparkles, Crown, Zap, Shield, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { isIndiaRegion, isAndroidDevice, PLAY_STORE_URL } from "@/lib/geo";

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

  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState<"googlepay" | "razorpay" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isIndia = isIndiaRegion();
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

  const onUpgrade = async (method?: "upi") => {
    const key = method === "upi" ? "googlepay" : "razorpay";
    setSubmitting(key);
    setNotice(null);
    const res = await checkoutRazorpay(selected, undefined, method);
    if (res.ok) setVerifying(true);
    setSubmitting(null);
    setVerifying(false);
    if (!res.ok && !res.userCancelled) {
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

  const isProcessing = submitting !== null || verifying;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A]"> {/* audit-ok: intentional dark brand gradient background */}

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

        {/* Crown icon */}
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

        {/* Patent-pending trust badge */}
        <div className="relative z-10 mt-3 flex items-center justify-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white/90 ring-1 ring-white/15"
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

      {/* ── Plan cards ── */}
      <div className="px-4 pb-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-white/50">{t("pricing.loading_plans")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const isSel = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  data-testid={`plan-card-${p.id}`}
                  data-on-dark
                  className={[
                    "relative w-full rounded-2xl border-2 p-4 text-left transition-all",
                    isSel
                      ? "border-primary bg-primary/10 shadow-[0_8px_24px_rgba(255,78,205,0.35)]"
                      : "border-white/10 bg-white/5 hover:border-white/25",
                  ].join(" ")}
                >
                  {p.badge && (
                    <span
                      className="absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
                      // audit-ok: white text on brand gradient badge
                      style={{ background: "linear-gradient(90deg,#7b3ff2,#ff4ecd)" }}
                    >
                      {p.badge}
                    </span>
                  )}

                  <div className="mb-2 flex items-center gap-2">
                    <span className={isSel ? "text-primary" : "text-white/50"}>
                      {/* audit-ok: icon inherits color token on dark surface */}
                      {PLAN_ICONS[p.id] ?? <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-bold text-white">{p.title}</span>
                  </div>

                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">₹{p.price}</span>
                    <span className="text-xs text-white/50">/ {p.period}</span>
                  </div>

                  {typeof p.savingsPercent === "number" && p.savingsPercent > 0 && (
                    <div className="mb-3 text-xs font-extrabold text-primary">
                      {/* audit-ok: primary color token on dark card */}
                      {t("pricing.save_percent", { percent: p.savingsPercent })}
                    </div>
                  )}

                  <ul className="mt-3 space-y-1.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/80">
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

        {/* ── India: Google Pay (primary) + Razorpay (secondary) ── */}
        {isIndia && !isPremium && (
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
          </>
        )}

        {/* Already premium (India) */}
        {isIndia && isPremium && (
          <div
            data-on-dark
            // audit-ok: green-500/green-400 — semantic success colour for premium confirmation
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 text-sm font-bold text-green-400"
          >
            <Check className="h-4 w-4" />
            {t("pricing.already_premium")}
          </div>
        )}

        {/* Non-India + Android → Google Play billing */}
        {!isIndia && isAndroid && !isPremium && (
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

        {/* Non-India + non-Android → prompt to download the app */}
        {!isIndia && !isAndroid && !isPremium && (
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
            onClick={() => setShowConfirm(true)}
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

        {/* Trust line */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <span className="flex items-center gap-1 text-xs text-white/35">
            <Shield className="h-3 w-3" />
            {/* audit-ok: muted white on dark background — trust badge */}
            {t("pricing.cancel_anytime")}
          </span>
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
                <p className="text-base font-black text-white">{t("pricing.verifying_payment")}</p>
                <p className="text-xs text-white/55">{t("patent_pending.loading_2")}</p>
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
                <p className="text-base font-black text-white">{t("pricing.processing_payment")}</p>
                <p className="text-xs text-white/55">{t("patent_pending.trust_line")}</p>
              </>
            )}
          </div>
        </div>
      )}

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
                {/* Show real date only — never the sentinel 2100 date */}
                {periodEnd
                  ? ` on ${periodEnd}`
                  : " at the end of your current billing period"} {/* i18n-ok: fallback with no date */}
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
