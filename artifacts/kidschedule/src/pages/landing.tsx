import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent, type MarketingFunnelEvent } from "@/lib/marketing/ga4-analytics";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

function trackHome(
  event: MarketingFunnelEvent | string,
  meta: Record<string, string | number | boolean | undefined> = {},
) {
  trackMarketingEvent(event as MarketingFunnelEvent, { page: "landing", ...meta });
}

function AmyLandingAvatar({ size = 140, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/amy-3d/amy-idle.webp"
      alt="Amy"
      width={size}
      height={size}
      className={className}
      decoding="async"
      fetchPriority="high"
    />
  );
}

function StoreBadgeRow({ location }: { location: string }) {
  const onStore = (store: "ios" | "android") => {
    trackHome("store_redirect", { store, location });
    trackHome("install_intent", { store, location, page: "landing" });
    trackHome("hero_cta", { store, location });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-md mx-auto">
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onStore("android")}
        className="flex flex-1 items-center gap-2.5 px-5 py-3 rounded-xl bg-white text-slate-900 min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ textDecoration: "none" }}
        aria-label="Get it on Google Play"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
          <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
          <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
          <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
          <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-semibold text-slate-500">Get it on</span>
          <span className="block text-sm font-bold">Google Play</span>
        </span>
      </a>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onStore("ios")}
        className="flex flex-1 items-center gap-2.5 px-5 py-3 rounded-xl min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          textDecoration: "none",
        }}
        aria-label="Download on the App Store"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-white" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <span className="text-left leading-tight text-white">
          <span className="block text-[10px] font-semibold text-white/55">Download on the</span>
          <span className="block text-sm font-bold">App Store</span>
        </span>
      </a>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  useEffect(() => {
    applySeoMeta({
      path: "/",
      title: "AmyNest — Know what your child needs most today",
      description:
        "AmyNest helps parents know what their child needs most today — calm daily guidance for modern families. Free to start.",
      keywords: "parenting app, child daily plan, parenting companion, AmyNest",
    });
    trackHome("landing_page_view", {});
  }, []);

  return (
    <div
      data-on-dark
      className="min-h-screen flex flex-col overflow-x-hidden text-white relative"
      style={{
        background:
          "radial-gradient(circle at 50% 38%, rgba(120,50,220,0.18) 0%, transparent 55%), linear-gradient(175deg, #05040c 0%, #0f0a24 48%, #050010 100%)",
      }}
    >
      <style>{`
        @keyframes v3Inhale {
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes v3Glow {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.06); }
        }
        .v3-fade { animation: v3Inhale 0.9s cubic-bezier(0.22,1,0.36,1) both; }
        .v3-fade-1 { animation: v3Inhale 0.9s 0.12s cubic-bezier(0.22,1,0.36,1) both; }
        .v3-fade-2 { animation: v3Inhale 0.9s 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .v3-fade-3 { animation: v3Inhale 0.9s 0.44s cubic-bezier(0.22,1,0.36,1) both; }
        .v3-fade-4 { animation: v3Inhale 0.9s 0.62s cubic-bezier(0.22,1,0.36,1) both; }
        .v3-cta {
          background: linear-gradient(135deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%);
          box-shadow: 0 10px 36px rgba(168,85,247,0.35);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .v3-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 44px rgba(236,72,153,0.4);
        }
        .v3-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          transition: border-color .25s ease, background .25s ease;
        }
        .v3-ghost:hover {
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.07);
        }
        @media (prefers-reduced-motion: reduce) {
          .v3-fade, .v3-fade-1, .v3-fade-2, .v3-fade-3, .v3-fade-4 { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <header className="relative z-20 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <AmyMascotLogo size={40} />
            <span className="font-quicksand font-bold text-lg tracking-tight text-white/95">
              {t("pages.landing.amynest_ai", "AmyNest")}
            </span>
          </div>
        </Link>
        <Link href="/sign-in">
          <button
            type="button"
            className="text-sm font-semibold text-white/65 hover:text-white transition-colors px-3 py-2 min-h-[44px]"
          >
            {t("landing.nav_sign_in", "Sign in")}
          </button>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="v3-fade relative mx-auto mb-8" style={{ width: 168, height: 168 }}>
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
              style={{
                width: 220,
                height: 220,
                transform: "translate(-50%, -50%)",
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.34) 0%, rgba(236,72,153,0.14) 42%, transparent 70%)",
                filter: "blur(18px)",
                animation: "v3Glow 4.5s ease-in-out infinite",
              }}
            />
            <div
              className="relative mx-auto flex items-center justify-center rounded-full"
              style={{
                width: 168,
                height: 168,
                background:
                  "radial-gradient(circle at 38% 34%, rgba(30,12,60,0.9) 0%, rgba(8,4,22,0.96) 70%)",
                border: "1px solid rgba(168,85,247,0.28)",
                boxShadow: "0 0 40px rgba(168,85,247,0.22)",
              }}
            >
              <AmyLandingAvatar size={128} className="w-[128px] h-[128px] object-contain" />
            </div>
          </div>

          <p className="v3-fade-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45 mb-3">
            For parents
          </p>

          <h1 className="v3-fade-1 font-quicksand font-black text-[2rem] sm:text-4xl leading-[1.12] tracking-tight text-white mb-4">
            Know what your child
            <br />
            <span
              style={{
                background: "linear-gradient(92deg, hsl(var(--brand-purple-500)), hsl(var(--brand-pink-500)))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              needs most today
            </span>
          </h1>

          <p className="v3-fade-2 text-white/65 text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-8">
            AmyNest helps you see the next right thing for your child — clear, calm, and personal.
          </p>

          <div className="v3-fade-3 flex flex-col items-center gap-3 mb-6">
            <Link href="/sign-up" className="w-full max-w-sm">
              <button
                type="button"
                className="v3-cta w-full inline-flex items-center justify-center gap-2 text-base font-bold px-7 py-3.5 rounded-2xl text-white min-h-[52px]"
                data-testid="button-hero-cta"
                onClick={() => trackHome("hero_cta", { location: "hero_primary" })}
              >
                Continue
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <p className="text-[12px] text-white/40">
              Free to start · Private · Built for real family days
            </p>
          </div>

          <div className="v3-fade-4 space-y-4">
            <StoreBadgeRow location="hero_store" />
            <p className="text-[12px] text-white/35">
              Already here?{" "}
              <Link href="/sign-in" className="text-white/70 underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-white/30">
          <Link href="/privacy" className="hover:text-white/55 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white/55 transition-colors">
            Terms
          </Link>
          <Link href="/support" className="hover:text-white/55 transition-colors">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
