import type { ComponentType } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Calendar,
  MessageCircle,
  Zap,
  CheckCircle2,
  Flame,
  Smartphone,
  Moon,
  EarOff,
  Utensils,
  Target,
  ShieldCheck,
  BookOpen,
  Microscope,
  Star,
  Puzzle,
  GraduationCap,
  Heart,
  Award,
  BarChart3,
  FlaskConical,
  Calculator,
  Mic,
} from "lucide-react";
import { StoreQrCode } from "@/components/store-qr-code";
import { AmyIcon } from "@/components/amy-icon";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { InfantParentingSection } from "@/components/marketing/infant-parenting-section";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

const HERO_BADGES = [
  { icon: Microscope, key: "landing.hero_badge_science", color: "hsl(var(--brand-cyan-500))" },
  { icon: BookOpen, key: "landing.hero_badge_research", color: "hsl(var(--brand-indigo-500))" },
  { icon: Award, key: "landing.hero_badge_patent", color: "hsl(var(--brand-purple-500))" },
];

const TECH_PILLARS = [
  { icon: FlaskConical, titleKey: "landing.tech_science_title", descKey: "landing.tech_science_desc" },
  { icon: BookOpen, titleKey: "landing.tech_research_title", descKey: "landing.tech_research_desc" },
  { icon: ShieldCheck, titleKey: "landing.tech_patent_title", descKey: "landing.tech_patent_desc" },
];

const ROUTINE_ENGINE_KEYS = [
  "landing.tech_engine_1",
  "landing.tech_engine_2",
  "landing.tech_engine_3",
  "landing.tech_engine_4",
];

const AMY_AI_MODES = [
  {
    icon: Brain,
    titleKey: "landing.amy_mode_coach_title",
    descKey: "landing.amy_mode_coach_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-indigo-500)))",
  },
  {
    icon: Mic,
    titleKey: "landing.amy_mode_talk_title",
    descKey: "landing.amy_mode_talk_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-pink-500)),hsl(var(--brand-violet-600)))",
  },
  {
    icon: GraduationCap,
    titleKey: "landing.amy_mode_tutor_title",
    descKey: "landing.amy_mode_tutor_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-cyan-500)),hsl(var(--brand-blue-500)))",
  },
];

const PLATFORM_CATEGORIES = [
  {
    icon: Calendar,
    titleKey: "landing.cat_routines_title",
    descKey: "landing.cat_routines_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-indigo-500)))",
    items: [
      "landing.feature_routine_title",
      "landing.feature_ai_title",
      "landing.coach_title",
      "landing.new_infant_title",
    ],
  },
  {
    icon: GraduationCap,
    titleKey: "landing.cat_learning_title",
    descKey: "landing.cat_learning_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-cyan-500)),hsl(var(--brand-blue-500)))",
    items: [
      "landing.spotlight_speech_title",
      "landing.spotlight_phonics_title",
      "landing.spotlight_audio_title",
      "landing.new_smart_study_title",
      "landing.new_abacus_title",
    ],
  },
  {
    icon: Heart,
    titleKey: "landing.cat_parenting_title",
    descKey: "landing.cat_parenting_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-pink-500)),hsl(var(--brand-orange-500)))",
    items: [
      "landing.feature_hub_title",
      "Behavior Tracking",
      "Nutrition Hub",
      "Parenting Reels",
      "Parenting Articles",
    ],
  },
  {
    icon: Puzzle,
    titleKey: "landing.cat_creative_title",
    descKey: "landing.cat_creative_desc",
    gradient: "linear-gradient(135deg,hsl(var(--brand-yellow-300)),hsl(var(--brand-red-500)))",
    items: [
      "Kids Story Hub",
      "Daily Brain Puzzles",
      "landing.new_coloring_title",
      "landing.new_funsheets_title",
      "Gaming Reward Zone",
    ],
  },
];

const PROBLEMS = [
  { icon: Flame, labelKey: "landing.problem_tantrums", color: "hsl(var(--brand-red-500))" },
  { icon: Smartphone, labelKey: "landing.problem_screen", color: "hsl(var(--brand-cyan-500))" },
  { icon: Moon, labelKey: "landing.problem_sleep", color: "hsl(var(--brand-indigo-500))" },
  { icon: EarOff, labelKey: "landing.problem_listening", color: "hsl(var(--brand-orange-500))" },
  { icon: Utensils, labelKey: "landing.problem_eating", color: "hsl(var(--brand-pink-500))" },
  { icon: Target, labelKey: "landing.problem_focus", color: "hsl(var(--brand-purple-500))" },
];

const STEPS = [
  { icon: Target, titleKey: "landing.step1_title", descKey: "landing.step1_desc" },
  { icon: MessageCircle, titleKey: "landing.step2_title", descKey: "landing.step2_desc" },
  { icon: CheckCircle2, titleKey: "landing.step3_title", descKey: "landing.step3_desc" },
];

const SCIENCE_STATS = [
  { value: "87%", label: "calmer mornings in 2 weeks" },
  { value: "12K+", label: "families parenting smarter" },
  { value: "30+", label: "research studies referenced" },
  { value: "4.9★", label: "average parent rating" },
];

const SCIENCE_CITATIONS = [
  "Habit Loop — Charles Duhigg (2012)",
  "Growth Mindset — Dr. Carol Dweck, Stanford",
  "AAP Screen Time Guidelines (2023)",
  "CDC Infant Sleep Standards",
  "Positive Reinforcement — B.F. Skinner",
  "Montessori Life Skills Framework",
  "Executive Function — Harvard Center on the Developing Child",
  "Secure Attachment — Dr. Daniel Siegel",
  "CPS Model — Dr. Ross Greene",
  "SEL Framework — CASEL",
];

const TESTIMONIALS = [
  {
    name: "Priya M.",
    location: "Mumbai, India",
    text: "Amy built us a 12-step plan for tantrums. In 3 weeks, meltdowns went from daily to maybe twice a week. I never thought a parenting app could be this specific — it felt like talking to an actual child psychologist.",
    avatar: "P",
    color: "hsl(var(--brand-purple-500))",
    result: "Tantrums reduced 80% in 3 weeks",
  },
  {
    name: "Rahul & Kavya",
    location: "Bangalore, India",
    text: "The behavior tracker revealed our daughter gets difficult after 9 PM. We shifted her dinner by 30 mins and it completely changed our evenings. Data-driven parenting actually works — we saw the pattern in the app first.",
    avatar: "R",
    color: "hsl(var(--brand-cyan-500))",
    result: "Identified sleep-trigger pattern in 5 days",
  },
  {
    name: "Sarah K.",
    location: "Dubai, UAE",
    text: "Twin toddlers + infant sleep tracker + Amy's personalized CDC-aligned tips = sanity saved. The sleep schedule feature got our 6-month-old sleeping through the night in 11 days. Nothing else had worked.",
    avatar: "S",
    color: "hsl(var(--brand-pink-500))",
    result: "Baby sleeping through the night in 11 days",
  },
];

function AmyLandingAvatar({ size = 140, className = "" }: { size?: number; className?: string }) {
  return (
    <picture>
      <source srcSet="/amy-3d/amy-idle.webp" type="image/webp" />
      <img
        src="/amy-3d/amy-idle.png"
        alt="Amy AI"
        width={size}
        height={size}
        className={className}
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}

function SectionEyebrow({
  icon: Icon,
  label,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  accent?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 amy-glass mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white"
      style={
        accent
          ? { background: accent, border: "1px solid rgba(255,255,255,0.15)" }
          : undefined
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div
      data-on-dark
      className="min-h-screen flex flex-col overflow-x-hidden text-white relative"
      style={{ background: "linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%)" }}
    >
      <style>{`
        @keyframes amyFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes amyFadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes amyShimmer { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
        @keyframes scrollX { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes amyGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.45) } 50% { box-shadow: 0 0 0 14px rgba(168,85,247,0) } }
        .amy-float { animation: amyFloat 5s ease-in-out infinite }
        .amy-fade-up { animation: amyFadeUp 0.7s ease-out both }
        .amy-fade-up-1 { animation: amyFadeUp 0.7s ease-out 0.08s both }
        .amy-fade-up-2 { animation: amyFadeUp 0.7s ease-out 0.16s both }
        .amy-fade-up-3 { animation: amyFadeUp 0.7s ease-out 0.24s both }
        .amy-gradient-text {
          background: linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-indigo-500)),hsl(var(--brand-cyan-500)),hsl(var(--brand-purple-500)));
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: amyShimmer 6s linear infinite;
        }
        .amy-glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .amy-glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
        }
        .amy-glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px -10px rgba(168,85,247,0.35);
          border-color: rgba(168,85,247,0.35);
        }
        .amy-cta {
          background: linear-gradient(135deg,hsl(var(--brand-purple-500)) 0%,hsl(var(--brand-pink-500)) 100%);
          box-shadow: 0 10px 40px rgba(168,85,247,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .amy-cta:hover {
          transform: scale(1.04);
          box-shadow: 0 14px 50px rgba(236,72,153,0.55), 0 0 0 1px rgba(255,255,255,0.2) inset;
        }
        .amy-avatar-ring { animation: amyGlow 3s ease-out infinite }
        .marquee-track { display: flex; gap: 12px; animation: scrollX 32s linear infinite; width: max-content }
        .marquee-track:hover { animation-play-state: paused }
        .amy-testimonial {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color .3s ease, box-shadow .3s ease;
        }
        .amy-testimonial:hover {
          border-color: rgba(168,85,247,0.3);
          box-shadow: 0 12px 40px -8px rgba(168,85,247,0.25);
        }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30" style={{ background: "radial-gradient(circle,hsl(var(--brand-purple-500)),transparent 70%)" }} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-25" style={{ background: "radial-gradient(circle,hsl(var(--brand-blue-500)),transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,hsl(var(--brand-pink-500)),transparent 70%)" }} />
      </div>

      {/* NAV */}
      <header className="relative z-20 flex items-center justify-between px-5 py-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <AmyMascotLogo size={44} />
            <div className="flex flex-col leading-tight">
              <span
                className="font-quicksand font-black text-xl"
                style={{
                  background: "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("pages.landing.amynest_ai")}
              </span>
              <span className="text-[10px] text-white/45 font-medium tracking-wide">
                {t("pages.landing.where_smart_parenting_starts")}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <button className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-3 py-1.5">
              {t("landing.nav_sign_in")}
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="amy-cta text-sm font-bold px-5 py-2 rounded-xl text-white hidden md:flex items-center gap-1.5">
              {t("pages.landing.get_started_free")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-5 pt-6 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="text-center md:text-left">
            <div className="amy-fade-up flex flex-wrap justify-center md:justify-start gap-2 mb-6">
              {HERO_BADGES.map(({ icon: Icon, key, color }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full text-white/90"
                  style={{ background: `${color}22`, border: `1px solid ${color}55` }}
                >
                  <Icon className="h-3 w-3" style={{ color }} />
                  {t(key)}
                </span>
              ))}
            </div>

            <h1 className="amy-fade-up-1 font-quicksand font-black text-4xl md:text-5xl lg:text-6xl leading-[1.08] tracking-tight mb-4">
              <span className="amy-gradient-text">{t("landing.hero_headline")}</span>
            </h1>

            <p className="amy-fade-up-2 text-white/75 text-base md:text-lg max-w-xl leading-relaxed mb-8 mx-auto md:mx-0">
              {t("landing.hero_sub")}
            </p>

            <div className="amy-fade-up-3 flex flex-col sm:flex-row items-center md:items-start gap-3">
              <Link href="/sign-up">
                <button
                  className="amy-cta inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-2xl text-white"
                  data-testid="button-hero-cta"
                >
                  {t("landing.hero_cta")}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="amy-glass inline-flex items-center gap-2 text-sm font-semibold px-6 py-4 rounded-2xl text-white/80 hover:text-white transition-all">
                  {t("landing.nav_sign_in")}
                </button>
              </Link>
            </div>

            <p className="amy-fade-up-3 mt-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {t("landing.hero_free")}
            </p>
          </div>

          <div className="amy-fade-up-2 flex flex-col items-center">
            <div className="relative mb-5 flex items-center justify-center" style={{ width: 196, height: 196 }}>
              <div
                className="amy-avatar-ring pointer-events-none absolute rounded-full"
                style={{
                  inset: 0,
                  border: "2px solid rgba(168,85,247,0.55)",
                  boxShadow: "0 0 28px rgba(168,85,247,0.45), 0 0 56px rgba(168,85,247,0.2)",
                }}
              />
              <div
                className="amy-float relative flex items-center justify-center rounded-full p-4"
                style={{
                  width: 172,
                  height: 172,
                  background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.15))",
                  border: "1px solid rgba(168,85,247,0.35)",
                }}
              >
                <AmyLandingAvatar size={132} className="w-[132px] h-[132px] md:w-[148px] md:h-[148px] object-contain" />
              </div>
            </div>
            <div className="amy-glass rounded-2xl px-5 py-4 max-w-xs text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1">
                {t("landing.amy_ai_eyebrow")}
              </p>
              <p className="text-white/85 text-sm font-semibold leading-snug">
                {t("landing.amy_ai_sub")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RESEARCH MARQUEE */}
      <div
        className="relative z-10 overflow-hidden py-3 border-y"
        style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.04)" }}
      >
        <div className="marquee-track">
          {[...SCIENCE_CITATIONS, ...SCIENCE_CITATIONS].map((cite, i) => (
            <span
              key={i}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] text-white/55 font-medium whitespace-nowrap"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {cite}
            </span>
          ))}
        </div>
      </div>

      {/* PATENT-PENDING ROUTINE ENGINE */}
      <section className="relative z-10 px-5 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <SectionEyebrow
              icon={Zap}
              label={t("landing.tech_eyebrow")}
              accent="linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.18))"
            />
            <h2 className="font-quicksand font-bold text-3xl md:text-5xl text-white mb-3">
              {t("landing.tech_heading")}
            </h2>
            <p className="text-white/65 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              {t("landing.tech_sub")}
            </p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-white/35">
              {t("patent_pending.trust_line")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {TECH_PILLARS.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="amy-glass-card rounded-2xl p-5 md:p-6">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)" }}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-quicksand font-bold text-lg text-white mb-2">{t(titleKey)}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>

          <div
            className="amy-glass-card rounded-3xl p-6 md:p-8"
            style={{
              background: "linear-gradient(135deg,rgba(99,102,241,0.14) 0%,rgba(168,85,247,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.3)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROUTINE_ENGINE_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-white/85 text-sm">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AMY AI MODES */}
      <section className="relative z-10 px-5 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <SectionEyebrow
                icon={Sparkles}
                label={t("landing.amy_ai_eyebrow")}
                accent="linear-gradient(135deg,rgba(236,72,153,0.22),rgba(168,85,247,0.18))"
              />
              <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-2">
                {t("landing.amy_ai_heading")}
              </h2>
              <p className="text-white/65 text-base max-w-xl leading-relaxed">{t("landing.amy_ai_sub")}</p>
            </div>
            <AmyLandingAvatar size={96} className="hidden md:block w-24 h-24 object-contain opacity-90" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {AMY_AI_MODES.map(({ icon: Icon, titleKey, descKey, gradient }) => (
              <div key={titleKey} className="amy-glass-card rounded-3xl p-6 flex flex-col gap-4">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{ background: gradient, boxShadow: "0 8px 24px rgba(168,85,247,0.3)" }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-quicksand font-bold text-lg text-white mb-2">{t(titleKey)}</h3>
                  <p className="text-white/65 text-sm leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <InfantParentingSection page="landing" />

      {/* PLATFORM — single consolidated grid */}
      <section className="relative z-10 px-5 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <SectionEyebrow icon={LayoutGridIcon} label={t("landing.platform_eyebrow")} />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              {t("landing.platform_heading")}
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">{t("landing.platform_sub")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PLATFORM_CATEGORIES.map(({ icon: Icon, titleKey, descKey, gradient, items }) => (
              <div key={titleKey} className="amy-glass-card rounded-3xl p-6 md:p-7">
                <div className="flex items-start gap-4 mb-5">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: gradient, boxShadow: "0 8px 24px rgba(168,85,247,0.25)" }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-quicksand font-bold text-xl text-white mb-1">{t(titleKey)}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{t(descKey)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="text-xs font-medium text-white/75 px-3 py-1.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {item.startsWith("landing.") ? t(item) : item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/sign-up">
              <button className="amy-cta inline-flex items-center gap-2 text-sm md:text-base font-bold px-7 py-3.5 rounded-2xl text-white" data-testid="button-features-cta">
                {t("pages.landing.unlock_all_features_free")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <p className="mt-3 text-xs text-white/40">{t("pages.landing.free_plan_included_upgrade_anytime")}</p>
          </div>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <SectionEyebrow icon={Sparkles} label={t("landing.problems_eyebrow")} />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">{t("landing.problems_heading")}</h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">{t("landing.problems_sub")}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {PROBLEMS.map(({ icon: Icon, labelKey, color }) => (
              <div key={labelKey} className="amy-glass-card rounded-2xl p-4 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <span className="text-white/90 text-sm font-semibold">{t(labelKey)}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/70 text-base italic">{t("landing.not_alone")}</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionEyebrow icon={Zap} label={t("landing.how_eyebrow")} />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">{t("landing.how_heading")}</h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">{t("landing.how_sub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map(({ icon: Icon, titleKey, descKey }, idx) => (
              <div key={titleKey} className="amy-glass-card rounded-3xl p-6 relative">
                <div
                  className="absolute -top-3 -left-3 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm font-quicksand"
                  style={{
                    background: "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)))",
                    boxShadow: "0 6px 18px rgba(236,72,153,0.45)",
                  }}
                >
                  {idx + 1}
                </div>
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-indigo-500)))",
                    boxShadow: "0 8px 24px rgba(168,85,247,0.3)",
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-quicksand font-bold text-lg text-white mb-2">{t(titleKey)}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCIENCE STATS */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <div
            className="amy-glass rounded-3xl p-7 md:p-10"
            style={{
              background: "linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(168,85,247,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.25)",
            }}
          >
            <div className="text-center mb-8">
              <h2 className="font-quicksand font-bold text-2xl md:text-3xl text-white mb-2">{t("landing.trust_heading")}</h2>
              <p className="text-white/65 text-sm md:text-base max-w-xl mx-auto">{t("landing.trust_sub")}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {SCIENCE_STATS.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="font-quicksand font-black text-2xl md:text-3xl text-white mb-1">{value}</p>
                  <p className="text-white/50 text-[11px] md:text-xs leading-snug">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { titleKey: "landing.trust1_title", descKey: "landing.trust1_desc", icon: BookOpen },
                { titleKey: "landing.trust2_title", descKey: "landing.trust2_desc", icon: FlaskConical },
                { titleKey: "landing.trust3_title", descKey: "landing.trust3_desc", icon: ShieldCheck },
              ].map(({ titleKey, descKey, icon: Icon }) => (
                <div
                  key={titleKey}
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon className="h-5 w-5 text-muted-foreground mb-3" />
                  <h3 className="font-quicksand font-bold text-base text-white mb-1.5">{t(titleKey)}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionEyebrow icon={Heart} label={t("pages.landing.parent_stories")} />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">{t("pages.landing.real_parents_real_results")}</h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">{t("pages.landing.thousands_of_families_use_amynest_every_day_to_raise_happier")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, location, text, avatar, color, result }) => (
              <div key={name} className="amy-testimonial rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 text-primary fill-primary" />
                  ))}
                </div>
                <div
                  className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${color}CC,${color}88)`, border: `1px solid ${color}44` }}
                >
                  <BarChart3 className="h-3 w-3" />
                  {result}
                </div>
                <p className="text-white/80 text-sm leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: `linear-gradient(135deg,${color},${color}99)`, boxShadow: `0 4px 14px ${color}40` }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-white/50 text-xs">{location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-3xl mx-auto text-center amy-glass rounded-3xl p-8 md:p-12">
          <h2 className="font-quicksand font-black text-2xl md:text-4xl text-white mb-3">{t("landing.final_cta_heading")}</h2>
          <p className="text-white/65 text-base mb-6">{t("landing.final_cta_sub")}</p>
          <Link href="/sign-up">
            <button className="amy-cta inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-2xl text-white">
              {t("landing.final_cta_btn")}
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section className="relative z-10 px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <div
            className="amy-glass rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg,rgba(168,85,247,0.18) 0%,rgba(99,102,241,0.14) 60%,rgba(236,72,153,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.35)",
            }}
          >
            <div className="relative flex flex-col md:flex-row items-center gap-10 md:gap-0 px-8 py-12 md:py-14">
              <div className="flex-1 text-center md:text-left z-10">
                <SectionEyebrow icon={Smartphone} label={t("pages.landing.available_on_ios_android")} />
                <h2 className="font-quicksand font-black text-3xl md:text-4xl text-white leading-tight mb-4">
                  {t("pages.landing.take_amy_with_you")}{" "}
                  <span className="amy-gradient-text">{t("pages.landing.everywhere")}</span>
                </h2>
                <p className="text-white/65 text-base md:text-lg max-w-md leading-relaxed mb-8">
                  {t("pages.landing.get_personalised_parenting_guidance_ai_built_routines_and_be")}
                </p>
                <div className="flex flex-col sm:flex-row items-center md:items-start gap-4">
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("pages.landing.app_store_download")}
                    className="flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-colors hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-white" aria-hidden>
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    <div className="text-left leading-tight">
                      <p className="text-white/50 text-[10px] font-medium">{t("pages.landing.download_on_the")}</p>
                      <p className="text-white font-bold text-base">{t("pages.landing.app_store")}</p>
                    </div>
                  </a>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("pages.landing.google_play_download")}
                    className="flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-colors hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
                      <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
                      <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="hsl(var(--brand-yellow-400))" />
                      <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="hsl(var(--brand-blue-500))" />
                      <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
                    </svg>
                    <div className="text-left leading-tight">
                      <p className="text-white/50 text-[10px] font-medium">{t("pages.landing.get_it_on")}</p>
                      <p className="text-white font-bold text-base">{t("pages.landing.google_play")}</p>
                    </div>
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap items-start justify-center md:justify-start gap-6">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2.5 group" aria-label={t("pages.landing.scan_for_app_store")}>
                    <div className="rounded-2xl bg-white p-3 shadow-lg transition-transform group-hover:scale-[1.02]">
                      <StoreQrCode value={APP_STORE_URL} size={96} bgColor="#FFFFFF" fgColor="#1a1a2e" />
                    </div>
                    <p className="text-white/60 text-xs font-medium text-center max-w-[120px]">{t("pages.landing.scan_for_app_store")}</p>
                  </a>
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2.5 group" aria-label={t("pages.landing.scan_for_google_play")}>
                    <div className="rounded-2xl bg-white p-3 shadow-lg transition-transform group-hover:scale-[1.02]">
                      <StoreQrCode value={PLAY_STORE_URL} size={96} bgColor="#FFFFFF" fgColor="#1a1a2e" />
                    </div>
                    <p className="text-white/60 text-xs font-medium text-center max-w-[120px]">{t("pages.landing.scan_for_google_play")}</p>
                  </a>
                </div>
              </div>

              <div className="relative flex-shrink-0 flex items-end justify-center h-72 md:h-80 w-44 md:w-52">
                <div
                  className="relative w-40 md:w-48 rounded-[2.5rem] overflow-hidden"
                  style={{
                    height: "92%",
                    background: "linear-gradient(160deg,#1a1a2e,#16213e)",
                    border: "2px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 40px rgba(168,85,247,0.25)",
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 rounded-b-2xl z-20" style={{ background: "#0f0c29" }} />
                  <div className="absolute inset-0 pt-5 px-3 pb-3 flex flex-col gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-1 mt-2">
                      <AmyLandingAvatar size={28} className="w-7 h-7 object-contain" />
                      <span className="text-white text-[9px] font-bold">{t("pages.landing.amynest_ai_3")}</span>
                    </div>
                    <div className="rounded-xl px-2.5 py-2" style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.3)" }}>
                      <p className="text-white/50 text-[7px] font-semibold uppercase tracking-wide mb-1">{t("pages.landing.today_s_routine")}</p>
                      {["Wake up", "Breakfast", "Reading"].map((label, i) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: ["hsl(var(--brand-purple-500))", "hsl(var(--brand-orange-500))", "hsl(var(--brand-cyan-500))"][i] }} />
                          <span className="text-white/80 text-[7px] flex-1">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl px-2.5 py-2 mt-auto" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.25)" }}>
                      <p className="text-white/50 text-[7px] font-semibold uppercase tracking-wide mb-1">{t("pages.landing.amy_says")}</p>
                      <p className="text-white/75 text-[7px] leading-snug">{t("pages.landing.great_morning_liam_completed_3_tasks_try_adding_a_calm_down_")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-5 py-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AmyIcon size={38} ring />
            <div className="flex flex-col leading-tight">
              <span
                className="font-quicksand font-black text-lg"
                style={{
                  background: "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("pages.landing.amynest_ai_4")}
              </span>
              <span className="text-[10px] text-white/40 font-medium tracking-wide">{t("patent_pending.footer_label")}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <Link href="/sign-up"><span className="hover:text-white/70 transition-colors cursor-pointer">{t("pages.landing.sign_up")}</span></Link>
            <Link href="/sign-in"><span className="hover:text-white/70 transition-colors cursor-pointer">{t("pages.landing.sign_in")}</span></Link>
            <Link href="/privacy"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-privacy">{t("pages.landing.privacy_policy")}</span></Link>
            <Link href="/terms"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-terms">{t("pages.landing.terms_of_service")}</span></Link>
            <Link href="/support"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-support">{t("pages.landing.support")}</span></Link>
          </div>
          <p className="text-xs text-white/30">{t("pages.landing.2026_amynest_ai_all_rights_reserved")}</p>
        </div>
      </footer>
    </div>
  );
}

function LayoutGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
