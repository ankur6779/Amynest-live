import { useEffect, useState } from "react";
import {
  Sparkles,
  Check,
  X,
  Smartphone,
  Zap,
  Gift,
  ArrowLeft,
  Headphones,
  CalendarDays,
  Brain,
  Users,
  MessageCircle,
  BarChart3,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useUser } from "@/lib/firebase-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { useNativeBilling } from "@/hooks/use-native-billing";

const REASON_COPY: Record<
  string,
  { title: string; subtitle: string; icon: LucideIcon }
> = {
  ai_quota: {
    title: "Unlock unlimited Amy AI",
    subtitle: "You've used today's free queries. Go premium for unlimited support.",
    icon: MessageCircle,
  },
  personalized_coaching: {
    title: "Unlock Personalized Coaching",
    subtitle: "Amy adapts to your child and gives you smart, tailored next steps.",
    icon: Brain,
  },
  premium_insight: {
    title: "Unlock Premium Insights",
    subtitle: "Behavior analysis and trend insights — only on premium.",
    icon: BarChart3,
  },
  child_limit: {
    title: "Add unlimited children",
    subtitle: "Free includes 1 child profile. Upgrade for unlimited.",
    icon: Users,
  },
  audio_lessons: {
    title: "Unlock Audio Lessons",
    subtitle: "Calming bedtime stories, focus tracks & guided meditations — anytime, ad-free.",
    icon: Headphones,
  },
  routines_limit: {
    title: "Generate unlimited routines",
    subtitle: "Free plan includes 1 routine. Upgrade to plan every day, every child, your way.",
    icon: CalendarDays,
  },
  behavior_locked: {
    title: "Unlock unlimited Behavior Logs",
    subtitle: "Free plan includes 1 log. Upgrade to track every win, tantrum & pattern Amy spots.",
    icon: BarChart3,
  },
  coach_locked: {
    title: "Unlock Amy Coach",
    subtitle: "Get personalized 10–12 step plans for tantrums, screen time, focus & more.",
    icon: Brain,
  },
  hub_locked: {
    title: "Unlock the full Parenting Hub",
    subtitle: "All activities, Olympiad prep & life skills — unlocked on premium.",
    icon: LayoutGrid,
  },
  feature: {
    title: "Unlock Full Parenting Power",
    subtitle: "Get unlimited AI, smart coaching, and premium insights.",
    icon: Sparkles,
  },
  section_locked: {
    title: "Unlock Full Parenting Power 🚀",
    subtitle:
      "You've explored 1 feature. Unlock unlimited routines, full AI personalization, all activities & smart insights.",
    icon: Sparkles,
  },
};

export function PaywallModal() {
  const { state, closePaywall } = usePaywall();
  const { plans, checkoutRazorpay } = useSubscription();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const nativeBilling = useNativeBilling();
  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (state.open) setNotice(null);
  }, [state.open]);

  const copy = REASON_COPY[state.reason] ?? REASON_COPY.feature;
  const HeroIcon = copy.icon;

  const onPayWithRazorpay = async () => {
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
      closePaywall();
    } else if (!res.userCancelled) {
      setNotice(res.reason ?? "Checkout is not yet available.");
    }
  };

  // Inside the Android Play Store wrapper, Play policy requires Google Play
  // Billing for digital subscriptions — Razorpay is hidden and replaced with
  // the native flow below.
  const onPayWithGooglePlay = async () => {
    setSubmitting(true);
    setNotice(null);
    const res = await nativeBilling.purchase(selected);
    setSubmitting(false);
    if (res.ok) {
      closePaywall();
    } else if (!res.userCancelled) {
      setNotice(res.reason ?? "Google Play purchase failed. Please try again.");
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && closePaywall()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-full p-0 gap-0 overflow-hidden border-0 bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A] text-white max-h-[95dvh] flex flex-col [&>button]:hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#0B0B1A]/95 to-[#0B0B1A]/70 backdrop-blur-md border-b border-white/5">
          <button
            onClick={closePaywall}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/85 hover:bg-white/20 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={closePaywall}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-8 pt-4 pb-8">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-3 shadow-[0_8px_32px_rgba(255,78,205,0.5)]">
              <HeroIcon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">{copy.title}</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto">{copy.subtitle}</p>
          </div>

          {/* Plan cards */}
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {plans.map((p) => {
              const isSelected = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={[
                    "relative text-left rounded-2xl p-4 border-2 transition-all",
                    isSelected
                      ? "border-pink-400 bg-violet-500/20 shadow-[0_8px_24px_rgba(255,78,205,0.35)]"
                      : "border-white/10 bg-white/5 hover:border-white/30",
                  ].join(" ")}
                >
                  {p.badge && (
                    <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-pink-500">
                      {p.badge}
                    </span>
                  )}
                  <div className="font-bold text-sm mb-1">{p.title}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black">₹{p.price}</span>
                    <span className="text-xs text-white/60">/ {p.period}</span>
                  </div>
                  {typeof p.savingsPercent === "number" && p.savingsPercent > 0 && (
                    <div className="text-xs font-extrabold text-pink-400 mb-2">
                      Save {p.savingsPercent}%
                    </div>
                  )}
                  <ul className="space-y-1">
                    {p.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/85">
                        <Check className={["h-3 w-3 mt-0.5 shrink-0", isSelected ? "text-pink-400" : "text-white/50"].join(" ")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {notice && (
            <div className="flex items-start gap-2 rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-2 mb-4 text-violet-100 text-xs font-semibold">
              <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="leading-snug">{notice}</span>
            </div>
          )}

          {nativeBilling.available ? (
            <>
              <Button
                onClick={onPayWithGooglePlay}
                disabled={submitting || nativeBilling.purchasing || plans.length === 0}
                className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
              >
                <Zap className="h-4 w-4 mr-2" />
                {submitting || nativeBilling.purchasing
                  ? "Opening Google Play…"
                  : "Continue with Google Play"}
              </Button>
              <button
                type="button"
                onClick={() => void nativeBilling.restore()}
                className="w-full mt-2 text-white/60 text-xs font-semibold py-2 hover:text-white/85"
              >
                Restore Purchases
              </button>
            </>
          ) : nativeBilling.wrapperPresent ? (
            // Inside the Play wrapper but billing isn't ready — Play policy
            // forbids falling back to Razorpay for digital subscriptions.
            <div className="w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-100 text-xs font-semibold leading-relaxed">
              {nativeBilling.unavailableReason ??
                "In-app purchases aren't available right now. Please update the app from the Play Store."}
            </div>
          ) : (
            <Button
              onClick={onPayWithRazorpay}
              disabled={submitting || plans.length === 0}
              className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 border-0 shadow-[0_10px_24px_rgba(255,78,205,0.5)]"
            >
              <Zap className="h-4 w-4 mr-2" />
              {submitting ? "Opening Razorpay…" : "Pay with UPI / Card"}
            </Button>
          )}

          <button
            type="button"
            onClick={() => {
              closePaywall();
              setLocation("/referrals");
            }}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 text-pink-300 hover:text-pink-200 font-extrabold text-sm py-2"
          >
            <Gift className="h-4 w-4" />
            Or invite friends to earn premium free
          </button>

          <button
            type="button"
            onClick={closePaywall}
            className="w-full text-center mt-1 text-white/55 text-sm py-2 hover:text-white/80"
          >
            Maybe Later
          </button>

          <p className="text-center text-[11px] text-white/35 mt-2">
            Cancel anytime. Renews automatically until canceled.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
