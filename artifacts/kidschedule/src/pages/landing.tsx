import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
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
  GraduationCap,
  Heart,
  Award,
  FlaskConical,
  Mic,
  Lock,
  EyeOff,
  Baby,
} from "lucide-react";
import { StoreQrCode } from "@/components/store-qr-code";
import { AmyIcon } from "@/components/amy-icon";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { InfantParentingSection } from "@/components/marketing/infant-parenting-section";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent, type MarketingFunnelEvent } from "@/lib/marketing/ga4-analytics";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

const AGE_STORAGE_KEY = "amynest_home_age_band";

type AgeBand = "newborn" | "0-2" | "2-5" | "5-8" | "8-10";

type Spotlight = {
  id: string;
  title: string;
  value: string;
  image: string;
  tags: string[];
  ages: AgeBand[];
  secondary?: boolean;
};

function trackHome(event: MarketingFunnelEvent | string, meta: Record<string, string | number | boolean | undefined> = {}) {
  trackMarketingEvent(event as MarketingFunnelEvent, { page: "landing", ...meta });
}

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

const OUTCOME_TRUST = [
  { icon: ShieldCheck, label: "Child-safe by design" },
  { icon: Lock, label: "Privacy-first" },
  { icon: EyeOff, label: "No ads for kids" },
  { icon: Heart, label: "Built for modern families" },
  { icon: BookOpen, label: "Pediatric-inspired routines" },
] as const;

const TESTIMONIALS = [
  {
    name: "Priya M.",
    location: "Singapore",
    text: "Amy built us a 12-step plan for tantrums. In 3 weeks, meltdowns went from daily to maybe twice a week. I never thought a parenting app could be this specific — it felt like talking to an actual child psychologist.",
    avatar: "P",
    color: "hsl(var(--brand-purple-500))",
    result: "Clearer evenings with fewer meltdowns",
  },
  {
    name: "Emma & James",
    location: "London, UK",
    text: "The behavior tracker revealed our daughter gets difficult after 9 PM. We shifted her dinner by 30 mins and it completely changed our evenings. Data-driven parenting actually works — we saw the pattern in the app first.",
    avatar: "E",
    color: "hsl(var(--brand-cyan-500))",
    result: "Spotted a bedtime pattern early",
  },
  {
    name: "Sarah K.",
    location: "Dubai, UAE",
    text: "Twin toddlers + infant sleep tracker + Amy's personalized CDC-aligned tips = sanity saved. The sleep schedule feature got our 6-month-old sleeping through the night in 11 days. Nothing else had worked.",
    avatar: "S",
    color: "hsl(var(--brand-pink-500))",
    result: "Calmer infant nights with a clear plan",
  },
];

const AGE_OPTIONS: { id: AgeBand; emoji: string; label: string }[] = [
  { id: "newborn", emoji: "👶", label: "Newborn" },
  { id: "0-2", emoji: "🍼", label: "0–2" },
  { id: "2-5", emoji: "🎨", label: "2–5" },
  { id: "5-8", emoji: "📚", label: "5–8" },
  { id: "8-10", emoji: "🎓", label: "8–10+" },
];

const AGE_COPY: Record<
  AgeBand,
  { line: string; cta: string; journey: string; dashboardHint: string }
> = {
  newborn: {
    line: "Decode cries, feeds, and naps — without guessing at 2 AM.",
    cta: "Start Free with Infant Hub",
    journey: "Newborn care → calm routines from day one",
    dashboardHint: "Feeds, naps, and comfort cues for today",
  },
  "0-2": {
    line: "Sleep, feeding, vaccines, and milestones — one calm plan.",
    cta: "Get Today's Infant Plan",
    journey: "Infant Hub grows with your baby through age 2",
    dashboardHint: "Today's naps, meals, and milestone check-ins",
  },
  "2-5": {
    line: "Speech, stories, and screen-smart play for preschool years.",
    cta: "Get Today's Parenting Plan",
    journey: "Discovery years: speech, sound worlds, and routines",
    dashboardHint: "Play, speech practice, meals, and bedtime",
  },
  "5-8": {
    line: "Homework wins, school routines, and focused learning blocks.",
    cta: "Get Today's Parenting Plan",
    journey: "School years: study, speech, and calmer mornings",
    dashboardHint: "Study block, meals, outdoor play, wind-down",
  },
  "8-10": {
    line: "Focus, confidence, and habits that stick — without nagging.",
    cta: "Get Today's Parenting Plan",
    journey: "Growing independence with guided plans",
    dashboardHint: "Focus session, activities, and evening routine",
  },
};

const SPOTLIGHTS: Spotlight[] = [
  {
    id: "infant",
    title: "Infant Hub",
    value: "Cry Insight, sleep windows, vaccines, and growth — free for infants.",
    image: "/promo/get-app/screenshots/infant-hub.jpg",
    tags: ["Cry Insight", "Sleep", "Vaccines", "Growth"],
    ages: ["newborn", "0-2", "2-5", "5-8", "8-10"],
  },
  {
    id: "health",
    title: "Amy Health Lab™",
    value: "Movement, wellness, and therapy-inspired activities for real days.",
    image: "/landing/screenshots/health-zone-800.webp",
    tags: ["Movement", "Wellness", "Activities"],
    ages: ["0-2", "2-5", "5-8", "8-10", "newborn"],
  },
  {
    id: "sound",
    title: "Amy Sound World™",
    value: "Interactive discovery and sensory audio learning kids enjoy.",
    image: "/landing/screenshots/audio-lessons-800.webp",
    tags: ["Discovery", "Audio", "Sensory"],
    ages: ["2-5", "0-2", "5-8", "newborn", "8-10"],
  },
  {
    id: "learning",
    title: "Learning Hub",
    value: "Speech Coach, Smart Study, nutrition, math, and school routines.",
    image: "/landing/screenshots/learning-zone-800.webp",
    tags: ["Speech", "Study", "Nutrition", "Math"],
    ages: ["5-8", "8-10", "2-5", "0-2", "newborn"],
  },
  {
    id: "astro",
    title: "Amy Astro Intelligence",
    value: "Personal milestone insights — a thoughtful secondary companion.",
    image: "/landing/screenshots/parenting-hub-800.webp",
    tags: ["Milestones", "Insights"],
    ages: ["newborn", "0-2", "2-5", "5-8", "8-10"],
    secondary: true,
  },
];

const STAGES: { id: AgeBand; label: string; sentence: string; image: string }[] = [
  {
    id: "newborn",
    label: "Newborn",
    sentence: "Cry cues, feeds, and first sleep rhythms — guided gently.",
    image: "/promo/infant-parenting/appstore-01-cry-insight.jpg",
  },
  {
    id: "0-2",
    label: "Infant",
    sentence: "Vaccines, growth, and nap windows in one free hub.",
    image: "/promo/get-app/screenshots/infant-hub.jpg",
  },
  {
    id: "2-5",
    label: "Toddler",
    sentence: "Speech, stories, and calm routines for busy preschool days.",
    image: "/promo/get-app/screenshots/speech-coach.png",
  },
  {
    id: "5-8",
    label: "Preschool+",
    sentence: "Short study wins and mornings that actually finish.",
    image: "/promo/get-app/screenshots/smart-study-zone.jpg",
  },
  {
    id: "8-10",
    label: "School",
    sentence: "Focus plans and habits that grow with your child.",
    image: "/landing/screenshots/learning-zone-800.webp",
  },
];

function AmyLandingAvatar({ size = 140, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/amy-3d/amy-idle.webp"
      alt="Amy AI"
      width={size}
      height={size}
      className={className}
      decoding="async"
      fetchPriority="high"
    />
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

function StoreBadgeRow({
  location,
  compact = false,
}: {
  location: string;
  compact?: boolean;
}) {
  const pad = compact ? "px-4 py-2.5" : "px-5 py-3";
  const onStore = (store: "ios" | "android") => {
    trackHome("store_redirect", { store, location });
    trackHome("install_intent", { store, location, page: "landing" });
    if (location.startsWith("hero")) trackHome("hero_cta", { store, location });
    if (location.startsWith("mid")) trackHome("mid_cta", { store, location });
    if (location.startsWith("footer") || location.startsWith("final")) trackHome("footer_cta", { store, location });
  };
  return (
    <div className={`flex flex-col sm:flex-row items-stretch gap-2 ${compact ? "" : "w-full max-w-md"}`}>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onStore("android")}
        className={`flex flex-1 items-center gap-2.5 ${pad} rounded-xl bg-white text-slate-900 min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
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
        className={`flex flex-1 items-center gap-2.5 ${pad} rounded-xl min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}
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

function DesktopQr({ location }: { location: string }) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackHome("qr_scan", { store: "android", location });
        trackHome("store_redirect", { store: "android", location });
      }}
      className="hidden lg:flex items-center gap-3 rounded-2xl px-3 py-3 amy-glass focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      aria-label="Scan QR to install AmyNest"
    >
      <div className="rounded-xl bg-white p-2 shrink-0" aria-hidden>
        <StoreQrCode value={PLAY_STORE_URL} size={72} bgColor="#FFFFFF" fgColor="#1a1a2e" />
      </div>
      <div className="text-left">
        <p className="font-quicksand font-bold text-sm text-white">Scan to install</p>
        <p className="text-xs text-white/55">Open camera → Google Play</p>
      </div>
    </a>
  );
}

function useAgeBand(): [AgeBand, (id: AgeBand) => void] {
  const [age, setAge] = useState<AgeBand>("2-5");
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AGE_STORAGE_KEY) as AgeBand | null;
      if (stored && AGE_OPTIONS.some((o) => o.id === stored)) setAge(stored);
    } catch {
      /* ignore */
    }
  }, []);
  const select = (id: AgeBand) => {
    setAge(id);
    try {
      sessionStorage.setItem(AGE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    trackHome("age_selected", { age_band: id });
  };
  return [age, select];
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [age, selectAge] = useAgeBand();
  const ageCopy = AGE_COPY[age];
  const spotlights = useMemo(() => {
    const ranked = [...SPOTLIGHTS].sort((a, b) => a.ages.indexOf(age) - b.ages.indexOf(age));
    const primary = ranked.filter((s) => !s.secondary).slice(0, 4);
    const secondary = ranked.find((s) => s.secondary);
    return secondary ? [...primary, secondary] : primary;
  }, [age]);

  useEffect(() => {
    applySeoMeta({
      path: "/",
      title: "AmyNest AI — The Parenting Companion That Grows With Your Child",
      description:
        "One AI parenting companion from newborn to age 10. Personalized daily plans, Infant Hub, learning, health, and routines — free to start on web and mobile.",
      keywords:
        "parenting app, AI parenting, child routine planner, baby schedule, toddler activities, smart parenting, global parenting app, AmyNest",
    });
    trackHome("landing_page_view", {});
  }, []);

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
        @media (prefers-reduced-motion: reduce) {
          .amy-float, .amy-fade-up, .amy-fade-up-1, .amy-fade-up-2, .amy-fade-up-3, .amy-gradient-text, .amy-avatar-ring, .marquee-track { animation: none !important; }
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
                Grows with your child
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <button className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-3 py-1.5 min-h-[40px]">
              {t("landing.nav_sign_in")}
            </button>
          </Link>
          <Link href="/get-app">
            <button
              className="amy-cta text-sm font-bold px-4 py-2 rounded-xl text-white flex items-center gap-1.5 min-h-[40px]"
              onClick={() => trackHome("hero_cta", { location: "nav_get_app" })}
            >
              Get the app <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-5 pt-4 pb-8 md:pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="amy-fade-up flex flex-wrap justify-center md:justify-start gap-2 mb-4">
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

            <h1 className="amy-fade-up-1 font-quicksand font-black text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.08] tracking-tight mb-3">
              <span className="amy-gradient-text">One parenting companion.</span>
              <br />
              <span className="text-white">Grows with your child.</span>
            </h1>

            <p className="amy-fade-up-2 text-white/75 text-base md:text-lg max-w-xl leading-relaxed mb-2 mx-auto md:mx-0">
              Personalized daily plans for sleep, meals, learning, and emotions — from newborn to age 10.
            </p>
            <p className="amy-fade-up-2 text-white/55 text-sm mb-5 mx-auto md:mx-0" key={age}>
              {ageCopy.line}
            </p>

            <div className="amy-fade-up-3 flex flex-col sm:flex-row items-center md:items-start gap-3 mb-3">
              <Link href="/get-app">
                <button
                  className="amy-cta inline-flex items-center justify-center gap-2 text-base font-bold px-7 py-3.5 rounded-2xl text-white min-h-[52px] w-full sm:w-auto"
                  data-testid="button-hero-cta"
                  onClick={() => trackHome("hero_cta", { location: "hero_primary", age_band: age })}
                >
                  {ageCopy.cta}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/sign-up">
                <button
                  className="amy-glass inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-2xl text-white/85 hover:text-white transition-all min-h-[52px] w-full sm:w-auto"
                  onClick={() => trackHome("hero_cta", { location: "hero_web_signup", age_band: age })}
                >
                  Try on Web
                </button>
              </Link>
            </div>

            <div className="amy-fade-up-3 mb-4">
              <StoreBadgeRow location="hero_store" />
            </div>

            <div className="amy-fade-up-3 flex flex-col sm:flex-row items-center md:items-start gap-3">
              <DesktopQr location="hero_qr" />
              <p className="text-[11px] text-white/40 max-w-xs text-center md:text-left">
                Free to start · No credit card · Child-safe · Privacy-first
              </p>
            </div>
          </div>

          <div className="amy-fade-up-2 flex flex-col items-center">
            <div className="relative mb-4 flex items-center justify-center" style={{ width: 180, height: 180 }}>
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
                  width: 156,
                  height: 156,
                  background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.15))",
                  border: "1px solid rgba(168,85,247,0.35)",
                }}
              >
                <AmyLandingAvatar size={120} className="w-[120px] h-[120px] object-contain" />
              </div>
            </div>
            <div className="amy-glass rounded-2xl px-5 py-3.5 max-w-xs text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1">Meet AMY</p>
              <p className="text-white/85 text-sm font-semibold leading-snug">
                Your AI co-pilot for today&apos;s plan — not another tip dump.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AGE PERSONALIZATION */}
      <section className="relative z-10 px-5 pb-8 md:pb-10" aria-labelledby="home-age-heading">
        <div className="max-w-4xl mx-auto amy-glass rounded-3xl px-5 py-6 md:px-8 md:py-7">
          <div className="text-center mb-4">
            <h2 id="home-age-heading" className="font-quicksand font-black text-xl sm:text-2xl text-white">
              What is your child&apos;s age?
            </h2>
            <p className="text-white/55 text-sm mt-1.5">We&apos;ll show the journey that fits your family.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-4" role="radiogroup" aria-label="Child age">
            {AGE_OPTIONS.map((opt) => {
              const active = opt.id === age;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectAge(opt.id)}
                  className={`min-h-[48px] px-4 py-2.5 rounded-full text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    active ? "bg-white text-slate-950" : "bg-white/8 text-white/85 border border-white/15 hover:bg-white/12"
                  }`}
                >
                  <span aria-hidden className="mr-1.5">{opt.emoji}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-center text-sm text-white/70" key={`journey-${age}`}>
            {ageCopy.journey}
          </p>
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

      {/* COMMAND CENTER — Today's Parenting Plan */}
      <section className="relative z-10 px-5 py-12 md:py-16" aria-labelledby="command-heading">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <SectionEyebrow
              icon={Calendar}
              label="Today's Parenting Plan"
              accent="linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.18))"
            />
            <h2 id="command-heading" className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              Not just advice. A plan for today.
            </h2>
            <p className="text-white/65 text-base leading-relaxed mb-4">
              AmyNest&apos;s Command Center brings routines, meals, learning, sleep, and reminders into one calm view.
            </p>
            <p className="text-white/55 text-sm mb-6" key={`dash-${age}`}>
              {ageCopy.dashboardHint}
            </p>
            <ul className="space-y-2 mb-6">
              {["Today's routine", "Meals & nutrition", "Learning & activities", "Sleep & reminders"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/get-app">
              <button
                className="amy-cta inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl text-white"
                onClick={() => {
                  trackHome("dashboard_preview", { age_band: age });
                  trackHome("mid_cta", { location: "command_center" });
                }}
              >
                See it in the app <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <div
            className="relative rounded-3xl overflow-hidden amy-glass"
            style={{ aspectRatio: "4/5", maxHeight: 480 }}
          >
            <img
              src="/landing/screenshots/dashboard-800.webp"
              alt="AmyNest Command Center — today's parenting plan"
              width={800}
              height={1000}
              className="absolute inset-0 h-full w-full object-cover object-top"
              loading="lazy"
              decoding="async"
              onLoad={() => trackHome("dashboard_preview", { age_band: age, loaded: true })}
            />
          </div>
        </div>
      </section>

      {/* PRODUCT SPOTLIGHTS — replaces feature chips */}
      <section className="relative z-10 px-5 pb-12 md:pb-16" aria-labelledby="spotlights-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <SectionEyebrow icon={Sparkles} label="Product experience" />
            <h2 id="spotlights-heading" className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-2">
              What parents actually open
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Real screens for {AGE_OPTIONS.find((o) => o.id === age)?.label} — not a feature dump.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5" key={age}>
            {spotlights.map((spot) => (
              <article
                key={spot.id}
                className={`amy-glass-card rounded-3xl overflow-hidden flex flex-col sm:flex-row ${
                  spot.secondary ? "md:col-span-2 sm:max-w-2xl sm:mx-auto w-full" : ""
                }`}
              >
                <div className="relative sm:w-[42%] aspect-[9/12] sm:aspect-auto sm:min-h-[220px] bg-black/30">
                  <img
                    src={spot.image}
                    alt={spot.title}
                    width={480}
                    height={640}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  {spot.id === "infant" ? (
                    <span className="inline-flex items-center gap-1 self-start mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-200 px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}>
                      <Baby className="h-3 w-3" aria-hidden /> Free for infants
                    </span>
                  ) : null}
                  {spot.secondary ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Optional</span>
                  ) : null}
                  <h3 className="font-quicksand font-bold text-xl text-white mb-2">{spot.title}</h3>
                  <p className="text-white/65 text-sm leading-relaxed mb-3 flex-1">{spot.value}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium text-white/70 px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link href="/get-app">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-200 hover:text-white transition-colors"
                      onClick={() => trackHome("spotlight_opened", { spotlight: spot.id, age_band: age })}
                    >
                      Explore in app <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <InfantParentingSection page="landing" />

      {/* AMY AI MODES — keep */}
      <section className="relative z-10 px-5 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
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
            <AmyLandingAvatar size={88} className="hidden md:block h-[88px] w-[88px] object-contain opacity-90" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* ONE APP EVERY STAGE */}
      <section className="relative z-10 px-5 pb-12 md:pb-16" aria-labelledby="stages-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <SectionEyebrow icon={GraduationCap} label="One app. Every stage." />
            <h2 id="stages-heading" className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-2">
              From newborn to school age
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              AmyNest grows with your child — so you don&apos;t need a new app every year.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {STAGES.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  selectAge(stage.id);
                  trackHome("stage_selected", { stage: stage.id, index });
                }}
                className={`amy-glass-card rounded-2xl overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  age === stage.id ? "ring-2 ring-purple-400/70" : ""
                }`}
              >
                <div className="relative aspect-[4/5] max-h-[160px]">
                  <img
                    src={stage.image}
                    alt={stage.label}
                    width={320}
                    height={400}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300/80 mb-0.5">
                    {index + 1}. {stage.label}
                  </p>
                  <p className="text-white/75 text-xs leading-relaxed mb-2">{stage.sentence}</p>
                  <span className="text-[11px] font-bold text-purple-200">View plan →</span>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/get-app">
              <button
                className="amy-cta inline-flex items-center gap-2 text-sm font-bold px-7 py-3.5 rounded-2xl text-white"
                onClick={() => trackHome("mid_cta", { location: "stages" })}
              >
                {ageCopy.cta} <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* MID STORE CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-3xl mx-auto amy-glass rounded-3xl px-6 py-8 text-center">
          <h2 className="font-quicksand font-bold text-2xl text-white mb-2">Install AmyNest for today&apos;s plan</h2>
          <p className="text-white/60 text-sm mb-5">Free to start on Google Play and the App Store.</p>
          <div className="flex flex-col items-center gap-4">
            <StoreBadgeRow location="mid_store" />
            <DesktopQr location="mid_qr" />
          </div>
        </div>
      </section>

      {/* ROUTINE ENGINE — keep, patent secondary */}
      <section className="relative z-10 px-5 pb-12 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <SectionEyebrow
              icon={Zap}
              label={t("landing.tech_eyebrow")}
              accent="linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.18))"
            />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              {t("landing.tech_heading")}
            </h2>
            <p className="text-white/65 text-base max-w-2xl mx-auto leading-relaxed">
              {t("landing.tech_sub")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {TECH_PILLARS.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="amy-glass-card rounded-2xl p-5">
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
            className="amy-glass-card rounded-3xl p-5 md:p-7"
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
            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-widest text-white/35">
              {t("patent_pending.trust_line")}
            </p>
          </div>
        </div>
      </section>

      {/* PROBLEMS + HOW IT WORKS — compacted */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <SectionEyebrow icon={Sparkles} label={t("landing.problems_eyebrow")} />
            <h2 className="font-quicksand font-bold text-2xl md:text-3xl text-white mb-2">{t("landing.problems_heading")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-10">
            {PROBLEMS.map(({ icon: Icon, labelKey, color }) => (
              <div key={labelKey} className="amy-glass-card rounded-2xl p-3.5 flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-white/90 text-sm font-semibold">{t(labelKey)}</span>
              </div>
            ))}
          </div>
          <div className="text-center mb-8">
            <h2 className="font-quicksand font-bold text-2xl md:text-3xl text-white mb-2">{t("landing.how_heading")}</h2>
            <p className="text-white/60 text-sm max-w-lg mx-auto">{t("landing.how_sub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map(({ icon: Icon, titleKey, descKey }, idx) => (
              <div key={titleKey} className="amy-glass-card rounded-3xl p-5 relative">
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
                  className="h-10 w-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: "linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-indigo-500)))",
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-quicksand font-bold text-base text-white mb-1.5">{t(titleKey)}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST — outcome-based, no fake ratings */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-5xl mx-auto amy-glass rounded-3xl p-6 md:p-9">
          <div className="text-center mb-6">
            <h2 className="font-quicksand font-bold text-2xl md:text-3xl text-white mb-2">Built for trust</h2>
            <p className="text-white/60 text-sm max-w-xl mx-auto">
              Designed for modern families with privacy-first, child-safe guidance.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {OUTCOME_TRUST.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/75 px-3 py-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                {label}
              </span>
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
      </section>

      {/* TESTIMONIALS — keep stories, no fake aggregate rating */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <SectionEyebrow icon={Heart} label={t("pages.landing.parent_stories")} />
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-2">
              {t("pages.landing.real_parents_real_results")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, location, text, avatar, color, result }) => (
              <div key={name} className="amy-testimonial rounded-3xl p-6 flex flex-col gap-4">
                <div
                  className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${color}CC,${color}88)`, border: `1px solid ${color}44` }}
                >
                  <Star className="h-3 w-3" />
                  {result}
                </div>
                <p className="text-white/80 text-sm leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: `linear-gradient(135deg,${color},${color}99)` }}
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

      {/* FINAL CTA → get-app primary */}
      <section className="relative z-10 px-5 pb-10">
        <div className="max-w-3xl mx-auto text-center amy-glass rounded-3xl p-8 md:p-10">
          <h2 className="font-quicksand font-black text-2xl md:text-3xl text-white mb-2">
            Start today&apos;s parenting plan
          </h2>
          <p className="text-white/65 text-sm md:text-base mb-5">
            One companion from birth to age 10. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link href="/get-app">
              <button
                className="amy-cta inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-2xl text-white min-h-[52px]"
                onClick={() => trackHome("footer_cta", { location: "final_get_app" })}
              >
                {ageCopy.cta}
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/sign-up">
              <button
                className="amy-glass inline-flex items-center gap-2 text-sm font-semibold px-6 py-4 rounded-2xl text-white/85 min-h-[52px]"
                onClick={() => trackHome("footer_cta", { location: "final_web" })}
              >
                Try on Web
              </button>
            </Link>
          </div>
          <StoreBadgeRow location="final_store" compact />
        </div>
      </section>

      {/* DOWNLOAD + QR */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div
            className="amy-glass rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg,rgba(168,85,247,0.18) 0%,rgba(99,102,241,0.14) 60%,rgba(236,72,153,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.35)",
            }}
          >
            <div className="relative flex flex-col md:flex-row items-center gap-8 px-8 py-10 md:py-12">
              <div className="flex-1 text-center md:text-left z-10">
                <SectionEyebrow icon={Smartphone} label={t("pages.landing.available_on_ios_android")} />
                <h2 className="font-quicksand font-black text-2xl md:text-3xl text-white leading-tight mb-3">
                  Take Amy with you{" "}
                  <span className="amy-gradient-text">everywhere</span>
                </h2>
                <p className="text-white/65 text-base max-w-md leading-relaxed mb-6">
                  Personalized guidance and AI-built routines — on the phone you already use.
                </p>
                <StoreBadgeRow location="footer_store" />
                <div className="mt-6 flex flex-wrap items-start justify-center md:justify-start gap-6">
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                    aria-label={t("pages.landing.scan_for_app_store")}
                    onClick={() => trackHome("qr_scan", { store: "ios", location: "footer_qr" })}
                  >
                    <div className="rounded-2xl bg-white p-3 shadow-lg transition-transform group-hover:scale-[1.02]">
                      <StoreQrCode value={APP_STORE_URL} size={88} bgColor="#FFFFFF" fgColor="#1a1a2e" />
                    </div>
                    <p className="text-white/60 text-xs font-medium text-center">{t("pages.landing.scan_for_app_store")}</p>
                  </a>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                    aria-label={t("pages.landing.scan_for_google_play")}
                    onClick={() => trackHome("qr_scan", { store: "android", location: "footer_qr" })}
                  >
                    <div className="rounded-2xl bg-white p-3 shadow-lg transition-transform group-hover:scale-[1.02]">
                      <StoreQrCode value={PLAY_STORE_URL} size={88} bgColor="#FFFFFF" fgColor="#1a1a2e" />
                    </div>
                    <p className="text-white/60 text-xs font-medium text-center">{t("pages.landing.scan_for_google_play")}</p>
                  </a>
                </div>
              </div>
              <div className="relative w-40 md:w-48 rounded-[2.2rem] overflow-hidden shrink-0" style={{ aspectRatio: "9/19", border: "2px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
                <img
                  src="/landing/screenshots/meet-amy-800.webp"
                  alt="AmyNest app"
                  width={400}
                  height={800}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
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
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/40">
            <Link href="/get-app"><span className="hover:text-white/70 transition-colors cursor-pointer" onClick={() => trackHome("footer_cta", { location: "footer_link" })}>Get the app</span></Link>
            <Link href="/guides"><span className="hover:text-white/70 transition-colors cursor-pointer">Guides</span></Link>
            <Link href="/features/daily-routines"><span className="hover:text-white/70 transition-colors cursor-pointer">Daily routines</span></Link>
            <Link href="/about"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-about">About</span></Link>
            <Link href="/sign-up"><span className="hover:text-white/70 transition-colors cursor-pointer">{t("pages.landing.sign_up")}</span></Link>
            <Link href="/sign-in"><span className="hover:text-white/70 transition-colors cursor-pointer">{t("pages.landing.sign_in")}</span></Link>
            <Link href="/privacy"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-privacy">{t("pages.landing.privacy_policy")}</span></Link>
            <Link href="/terms"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-terms">{t("pages.landing.terms_of_service")}</span></Link>
            <Link href="/support"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-support">{t("pages.landing.support")}</span></Link>
          </div>
          <div className="space-y-1 text-center text-xs text-white/30">
            <p>AmyNest AI is a product of AmyWorld.</p>
            <p>Developed and operated by AmyWorld.</p>
            <p>{t("pages.landing.2026_amynest_ai_all_rights_reserved")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
