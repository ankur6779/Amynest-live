import { useEffect } from "react";
import {
  ArrowRight,
  Calendar,
  Mic,
  GraduationCap,
  Utensils,
  LayoutGrid,
  Sparkles,
  ShieldCheck,
  Lock,
  Globe,
  Gift,
  FileCheck,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

const OFFICIAL_LOGO = "/amynest-logo-new.png";

function StoreButtons({ t, size = "default" }: { t: (k: string) => string; size?: "default" | "large" }) {
  const pad = size === "large" ? "px-7 py-4" : "px-6 py-3.5";
  const icon = size === "large" ? "h-8 w-8" : "h-7 w-7";
  const title = size === "large" ? "text-lg" : "text-base";
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="social-app-store"
        className={`flex flex-1 items-center justify-center sm:justify-start gap-3 ${pad} rounded-2xl transition-all hover:bg-white/12 hover:scale-[1.02]`}
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}
      >
        <svg viewBox="0 0 24 24" className={`${icon} shrink-0 fill-white`} aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <div className="text-left leading-tight">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">{t("social_landing.download_on_the")}</p>
          <p className={`text-white font-bold ${title}`}>{t("social_landing.app_store")}</p>
        </div>
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="social-google-play"
        className={`flex flex-1 items-center justify-center sm:justify-start gap-3 ${pad} rounded-2xl transition-all hover:bg-white/12 hover:scale-[1.02]`}
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}
      >
        <svg viewBox="0 0 24 24" className={`${icon} shrink-0`} aria-hidden>
          <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
          <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
          <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
          <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
        </svg>
        <div className="text-left leading-tight">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">{t("social_landing.get_it_on")}</p>
          <p className={`text-white font-bold ${title}`}>{t("social_landing.google_play")}</p>
        </div>
      </a>
    </div>
  );
}

function PhoneMockup({ variant }: { variant: "routine" | "learning" }) {
  const isRoutine = variant === "routine";
  return (
    <div
      className="relative w-[148px] sm:w-[168px] rounded-[2rem] overflow-hidden shrink-0"
      style={{
        aspectRatio: "9/19",
        background: "linear-gradient(160deg,#14121f,#1e1b35)",
        border: "2px solid rgba(255,255,255,0.14)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 50px rgba(168,85,247,0.2)",
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10 bg-black/80" />
      <div className="absolute inset-0 pt-5 px-2.5 pb-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 px-0.5 mt-1">
          <img src={OFFICIAL_LOGO} alt="" className="h-5 w-5 rounded-md object-cover" />
          <span className="text-[8px] font-bold text-white/90">AmyNest AI</span>
        </div>
        {isRoutine ? (
          <>
            <div className="rounded-xl px-2 py-2" style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)" }}>
              <p className="text-[7px] font-bold uppercase tracking-wide text-purple-200/80 mb-1.5">Today&apos;s Routine</p>
              {["Wake & stretch", "Breakfast", "Speech practice", "Outdoor play"].map((item, i) => (
                <div key={item} className="flex items-center gap-1 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: i === 0 ? "#a855f7" : i === 1 ? "#f97316" : i === 2 ? "#38bdf8" : "#34d399" }} />
                  <span className="text-[7px] text-white/80 flex-1">{item}</span>
                  {i < 2 && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                </div>
              ))}
            </div>
            <div className="rounded-xl px-2 py-2 mt-auto" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.25)" }}>
              <p className="text-[7px] text-white/75 leading-snug">&quot;Great morning! 3 tasks done — keep the streak going.&quot;</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl px-2 py-2" style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}>
              <p className="text-[7px] font-bold uppercase tracking-wide text-cyan-200/80 mb-1.5">Learning Zone</p>
              {["Phonics · Level 3", "Math tricks", "Life skills"].map((item) => (
                <div key={item} className="flex items-center gap-1 mb-1">
                  <GraduationCap className="h-2.5 w-2.5 text-cyan-300 shrink-0" />
                  <span className="text-[7px] text-white/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl px-2 py-2" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <p className="text-[7px] font-bold text-emerald-300/90 mb-0.5">Speech Coach</p>
              <p className="text-[7px] text-white/70">Daily 5-min session ready</p>
            </div>
          </>
        )}
      </div>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 42%)" }} />
    </div>
  );
}

const FEATURES = [
  { icon: Calendar, titleKey: "social_landing.feature_routines_title", descKey: "social_landing.feature_routines_desc", gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  { icon: Mic, titleKey: "social_landing.feature_speech_title", descKey: "social_landing.feature_speech_desc", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)" },
  { icon: GraduationCap, titleKey: "social_landing.feature_learning_title", descKey: "social_landing.feature_learning_desc", gradient: "linear-gradient(135deg,#f97316,#ec4899)" },
  { icon: Utensils, titleKey: "social_landing.feature_nutrition_title", descKey: "social_landing.feature_nutrition_desc", gradient: "linear-gradient(135deg,#10b981,#22c55e)" },
  { icon: LayoutGrid, titleKey: "social_landing.feature_hub_title", descKey: "social_landing.feature_hub_desc", gradient: "linear-gradient(135deg,#6366f1,#06b6d4)" },
  { icon: Sparkles, titleKey: "social_landing.feature_adaptive_title", descKey: "social_landing.feature_adaptive_desc", gradient: "linear-gradient(135deg,#a855f7,#ec4899)" },
] as const;

const PAIN_POINTS = [
  "social_landing.pain_routines",
  "social_landing.pain_screen",
  "social_landing.pain_learning",
  "social_landing.pain_communication",
  "social_landing.pain_meals",
  "social_landing.pain_time",
] as const;

const COMPARE_THEM = [
  "social_landing.compare_them_1",
  "social_landing.compare_them_2",
  "social_landing.compare_them_3",
] as const;

const COMPARE_US = [
  "social_landing.compare_us_1",
  "social_landing.compare_us_2",
  "social_landing.compare_us_3",
  "social_landing.compare_us_4",
  "social_landing.compare_us_5",
  "social_landing.compare_us_6",
] as const;

const TRUST_BADGES = [
  { key: "social_landing.trust_patent", icon: FileCheck },
  { key: "social_landing.trust_privacy", icon: Lock },
  { key: "social_landing.trust_child_safe", icon: ShieldCheck },
  { key: "social_landing.trust_no_ads", icon: Gift },
  { key: "social_landing.trust_global", icon: Globe },
] as const;

const HERO_BADGES = [
  { key: "social_landing.badge_patent", icon: FileCheck },
  { key: "social_landing.badge_privacy", icon: Lock },
  { key: "social_landing.badge_free", icon: Gift },
] as const;

export default function SocialLandingPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "AmyNest AI — Download Free";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", t("social_landing.meta_description"));
    }
  }, [t]);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      data-on-dark
      className="min-h-screen text-white overflow-x-hidden relative"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <style>{`
        @keyframes slFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes slShimmer { 0% { background-position:0% 50%; } 100% { background-position:200% 50%; } }
        .sl-fade { animation: slFadeUp 0.65s ease-out both; }
        .sl-fade-1 { animation: slFadeUp 0.65s ease-out 0.08s both; }
        .sl-fade-2 { animation: slFadeUp 0.65s ease-out 0.16s both; }
        .sl-fade-3 { animation: slFadeUp 0.65s ease-out 0.24s both; }
        .sl-float { animation: slFloat 5.5s ease-in-out infinite; }
        .sl-gradient-text {
          background: linear-gradient(90deg,#e9d5ff,#f9a8d4,#7dd3fc,#e9d5ff);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: slShimmer 6s linear infinite;
        }
        .sl-glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .sl-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.09);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .sl-card:hover {
          transform: translateY(-3px);
          border-color: rgba(168,85,247,0.35);
          box-shadow: 0 18px 45px -12px rgba(168,85,247,0.3);
        }
        .sl-cta {
          background: linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)));
          box-shadow: 0 12px 40px rgba(168,85,247,0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sl-cta:hover { transform: scale(1.03); box-shadow: 0 16px 48px rgba(236,72,153,0.5); }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-30" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.5),transparent 68%)" }} />
        <div className="absolute top-[20%] -right-32 w-[420px] h-[420px] rounded-full opacity-22" style={{ background: "radial-gradient(circle,rgba(99,102,241,0.45),transparent 68%)" }} />
        <div className="absolute bottom-[15%] left-[8%] w-[360px] h-[360px] rounded-full opacity-18" style={{ background: "radial-gradient(circle,rgba(236,72,153,0.35),transparent 68%)" }} />
      </div>

      {/* Sticky mini header */}
      <header className="sticky top-0 z-30 sl-glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={OFFICIAL_LOGO} alt="AmyNest AI" className="h-10 w-10 rounded-xl object-cover shrink-0" />
            <span className="font-quicksand font-black text-base sm:text-lg truncate">AmyNest AI</span>
          </div>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="sl-cta shrink-0 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl text-white">
            {t("social_landing.download_free")}
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="sl-fade flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5">
              {HERO_BADGES.map(({ key, icon: Icon }) => (
                <span key={key} className="sl-glass inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/85">
                  <Icon className="h-3 w-3 text-purple-300" />
                  {t(key)}
                </span>
              ))}
            </div>

            <h1 className="sl-fade-1 font-quicksand font-black text-[2rem] sm:text-5xl lg:text-[3.25rem] leading-[1.08] tracking-tight mb-4">
              {t("social_landing.hero_line1")}
              <br />
              <span className="sl-gradient-text">{t("social_landing.hero_line2")}</span>
            </h1>

            <p className="sl-fade-2 text-white/68 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-7">
              {t("social_landing.hero_sub")}
            </p>

            <div className="sl-fade-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-6">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="sl-cta inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-white text-base">
                {t("social_landing.download_free")}
                <ArrowRight className="h-4 w-4" />
              </a>
              <button type="button" onClick={scrollToHow} className="sl-glass inline-flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-2xl text-white/85 hover:text-white transition-colors text-sm">
                {t("social_landing.see_how")}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div className="sl-fade-3 max-w-md mx-auto lg:mx-0">
              <StoreButtons t={t} />
            </div>
          </div>

          <div className="sl-fade-2 flex justify-center lg:justify-end items-end gap-4 sm:gap-6 sl-float">
            <PhoneMockup variant="routine" />
            <div className="hidden sm:block translate-y-8">
              <PhoneMockup variant="learning" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-14">
        <div className="sl-glass rounded-3xl p-6 md:p-10" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl text-center mb-3">{t("social_landing.problem_heading")}</h2>
          <p className="text-white/55 text-center text-sm sm:text-base max-w-2xl mx-auto mb-8">{t("social_landing.problem_sub")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAIN_POINTS.map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Check className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-white/85 text-sm font-medium">{t(key)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-12 text-center scroll-mt-20">
        <img src={OFFICIAL_LOGO} alt="" className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover mx-auto mb-5 shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.4)" }} />
        <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-3">{t("social_landing.solution_heading")}</h2>
        <p className="text-white/65 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">{t("social_landing.solution_desc")}</p>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">{t("social_landing.features_eyebrow")}</p>
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl">{t("social_landing.features_heading")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, titleKey, descKey, gradient }) => (
            <div key={titleKey} className="sl-card rounded-2xl p-5 md:p-6">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4" style={{ background: gradient, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-quicksand font-bold text-lg text-white mb-2">{t(titleKey)}</h3>
              <p className="text-white/58 text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14">
        <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl text-center mb-8">{t("social_landing.compare_heading")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="sl-card rounded-2xl p-6 md:p-7">
            <p className="text-white/45 text-xs font-bold uppercase tracking-widest mb-4">{t("social_landing.compare_them_label")}</p>
            <ul className="space-y-3">
              {COMPARE_THEM.map((key) => (
                <li key={key} className="flex items-center gap-3 text-white/55 text-sm">
                  <X className="h-4 w-4 text-rose-400 shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl p-6 md:p-7 relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(168,85,247,0.18) 0%, rgba(99,102,241,0.12) 100%)",
              border: "1px solid rgba(168,85,247,0.35)",
              boxShadow: "0 20px 50px -12px rgba(168,85,247,0.25)",
            }}
          >
            <p className="text-purple-200/90 text-xs font-bold uppercase tracking-widest mb-4">{t("social_landing.compare_us_label")}</p>
            <ul className="space-y-3">
              {COMPARE_US.map((key) => (
                <li key={key} className="flex items-center gap-3 text-white/90 text-sm font-medium">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-12">
        <h2 className="font-quicksand font-black text-2xl sm:text-3xl text-center mb-8">{t("social_landing.trust_heading")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TRUST_BADGES.map(({ key, icon: Icon }) => (
            <div key={key} className="sl-card rounded-2xl p-4 text-center">
              <div className="mx-auto h-10 w-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.28)" }}>
                <Icon className="h-5 w-5 text-purple-200" />
              </div>
              <p className="font-quicksand font-bold text-[11px] sm:text-xs text-white leading-snug">{t(key)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-10 md:pb-14">
        <div
          className="sl-glass rounded-3xl px-6 py-10 md:px-12 md:py-12 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.08) 100%)", borderColor: "rgba(168,85,247,0.25)" }}
        >
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl mb-3">{t("social_landing.final_heading")}</h2>
          <p className="text-white/62 text-base max-w-xl mx-auto mb-8 leading-relaxed">{t("social_landing.final_sub")}</p>
          <div className="max-w-lg mx-auto">
            <StoreButtons t={t} size="large" />
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-4 py-6 border-t border-white/10 text-center">
        <p className="text-xs text-white/35">© {new Date().getFullYear()} AmyNest AI · {t("social_landing.badge_patent")}</p>
      </footer>
    </div>
  );
}
