import { Link } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Calendar,
  LayoutGrid,
  MessageCircle,
  Zap,
  CheckCircle2,
  Flame,
  Smartphone,
  Moon,
  EarOff,
  Utensils,
  Target,
  ListChecks,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  Microscope,
  TrendingUp,
  Video,
  Star,
  Users,
  Lightbulb,
  Puzzle,
  Palette,
  FileText,
  Baby,
  GraduationCap,
  Activity,
  Heart,
  Award,
  Gamepad2,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AmyIcon } from "@/components/amy-icon";

import heroImg from "@assets/ChatGPT_Image_Apr_26,_2026,_10_19_57_PM_1777222212106.png";
import { useTranslation } from "react-i18next";

const COACH_HIGHLIGHT_KEYS = [
  "landing.highlight_1",
  "landing.highlight_2",
  "landing.highlight_3",
  "landing.highlight_4",
];

const PROBLEMS = [
  { icon: Flame, labelKey: "landing.problem_tantrums", color: "#EF4444" },
  { icon: Smartphone, labelKey: "landing.problem_screen", color: "#06B6D4" },
  { icon: Moon, labelKey: "landing.problem_sleep", color: "#6366F1" },
  { icon: EarOff, labelKey: "landing.problem_listening", color: "#F97316" },
  { icon: Utensils, labelKey: "landing.problem_eating", color: "#EC4899" },
  { icon: Target, labelKey: "landing.problem_focus", color: "#A855F7" },
];

const SECONDARY_FEATURES = [
  {
    icon: Calendar,
    titleKey: "landing.feature_routine_title",
    descKey: "landing.feature_routine_desc",
    gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)",
  },
  {
    icon: LayoutGrid,
    titleKey: "landing.feature_hub_title",
    descKey: "landing.feature_hub_desc",
    gradient: "linear-gradient(135deg,#EC4899,#F97316)",
  },
  {
    icon: Zap,
    titleKey: "landing.feature_ai_title",
    descKey: "landing.feature_ai_desc",
    gradient: "linear-gradient(135deg,#FFD166,#F97316)",
  },
];

const STEPS = [
  { icon: Target, titleKey: "landing.step1_title", descKey: "landing.step1_desc" },
  { icon: HelpCircle, titleKey: "landing.step2_title", descKey: "landing.step2_desc" },
  { icon: ListChecks, titleKey: "landing.step3_title", descKey: "landing.step3_desc" },
];

const TRUST_PILLARS = [
  { icon: BookOpen,      titleKey: "landing.trust1_title", descKey: "landing.trust1_desc" },
  { icon: FlaskConical,  titleKey: "landing.trust2_title", descKey: "landing.trust2_desc" },
  { icon: ShieldCheck,   titleKey: "landing.trust3_title", descKey: "landing.trust3_desc" },
];

const SCIENCE_STATS = [
  { value: "87%",  label: "calmer mornings in 2 weeks" },
  { value: "12K+", label: "families parenting smarter" },
  { value: "30+",  label: "research studies referenced" },
  { value: "4.9★", label: "average parent rating" },
];

const SCIENCE_CITATIONS = [
  "📚 Habit Loop — Charles Duhigg (2012)",
  "🧠 Growth Mindset — Dr. Carol Dweck, Stanford",
  "👶 AAP Screen Time Guidelines (2023)",
  "💤 CDC Infant Sleep Standards",
  "🎯 Positive Reinforcement — B.F. Skinner",
  "🌱 Montessori Life Skills Framework",
  "📊 Executive Function — Harvard Center on the Developing Child",
  "❤️ Secure Attachment — Dr. Daniel Siegel",
  "⚡ CPS Model — Dr. Ross Greene",
  "🍎 SEL Framework — CASEL",
];

const ALL_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Kids Control Center",
    desc: "Child-safe UI with screen time limits, focus mode & parent lock — built on AAP's 2023 digital wellness guidelines. Coming soon.",
    gradient: "linear-gradient(135deg,#7B3FF2,#FF4ECD)",
    badge: "Coming Soon",
  },
  {
    icon: TrendingUp,
    title: "Behavior Tracking",
    desc: "Log daily behaviors, spot patterns, and track improvement over time. Grounded in ABC (Antecedent-Behavior-Consequence) behavioral analysis.",
    gradient: "linear-gradient(135deg,#10B981,#06B6D4)",
    badge: "Popular",
  },
  {
    icon: Gamepad2,
    title: "Gaming Reward Zone",
    desc: "Gamified milestones based on B.F. Skinner's positive reinforcement — kids earn real rewards tied to real-world achievements.",
    gradient: "linear-gradient(135deg,#FFD166,#EF4444)",
    badge: "New",
  },
  {
    icon: Baby,
    title: "Infant Sleep Tracker",
    desc: "Track feeding, sleep windows and wake cycles for babies under 12 months — calibrated to CDC safe sleep guidelines.",
    gradient: "linear-gradient(135deg,#60A5FA,#6366F1)",
    badge: "New",
  },
  {
    icon: Video,
    title: "Parenting Reels",
    desc: "Short, expert-curated video reels on positive parenting techniques from leading child psychologists.",
    gradient: "linear-gradient(135deg,#EC4899,#A855F7)",
    badge: null,
  },
  {
    icon: Lightbulb,
    title: "Daily Parenting Tips",
    desc: "Science-backed tip delivered every day — personalized to your child's age and developmental stage per Piaget's framework.",
    gradient: "linear-gradient(135deg,#FFD166,#F97316)",
    badge: null,
  },
  {
    icon: Activity,
    title: "Life Skills Zone",
    desc: "Teach independence — from dressing to cooking — with Montessori-aligned milestone tracking that builds intrinsic motivation.",
    gradient: "linear-gradient(135deg,#A855F7,#6366F1)",
    badge: null,
  },
  {
    icon: GraduationCap,
    title: "Olympiad Zone",
    desc: "Cognitive skill-building puzzles aligned with school Olympiad levels for kids aged 4–14. Builds executive function.",
    gradient: "linear-gradient(135deg,#F59E0B,#EF4444)",
    badge: null,
  },
  {
    icon: Palette,
    title: "Art & Craft Reels",
    desc: "Step-by-step activity videos that stimulate creativity and fine motor development in young children.",
    gradient: "linear-gradient(135deg,#EC4899,#F97316)",
    badge: null,
  },
  {
    icon: FileText,
    title: "Printable Worksheets",
    desc: "Age-appropriate worksheets for learning, colouring, and motor skill development — printable anytime.",
    gradient: "linear-gradient(135deg,#06B6D4,#10B981)",
    badge: null,
  },
  {
    icon: Puzzle,
    title: "Daily Brain Puzzles",
    desc: "Brain-boosting puzzles tailored to your child's cognitive stage — builds logic, creativity and working memory.",
    gradient: "linear-gradient(135deg,#F97316,#A855F7)",
    badge: null,
  },
  {
    icon: BookOpen,
    title: "Parenting Articles",
    desc: "Deep-dive articles written by child development experts and child psychologists on every stage of childhood.",
    gradient: "linear-gradient(135deg,#3B82F6,#06B6D4)",
    badge: null,
  },
  {
    icon: Users,
    title: "Babysitter Profiles",
    desc: "Create and share child care profiles securely. Routines, allergies, and notes — all in one safe place.",
    gradient: "linear-gradient(135deg,#10B981,#A855F7)",
    badge: null,
  },
  {
    icon: Award,
    title: "Parent Score & Streaks",
    desc: "Gamified motivation keeps you consistent — earn points, build streaks, and celebrate every parenting win.",
    gradient: "linear-gradient(135deg,#FFD166,#EF4444)",
    badge: null,
  },
];

const TESTIMONIALS = [
  {
    name: "Priya M.",
    location: "Mumbai, India",
    text: "Amy built us a 12-step plan for tantrums. In 3 weeks, meltdowns went from daily to maybe twice a week. I never thought a parenting app could be this specific — it felt like talking to an actual child psychologist.",
    avatar: "P",
    color: "#A855F7",
    result: "Tantrums reduced 80% in 3 weeks",
  },
  {
    name: "Rahul & Kavya",
    location: "Bangalore, India",
    text: "The behavior tracker revealed our daughter gets difficult after 9 PM. We shifted her dinner by 30 mins and it completely changed our evenings. Data-driven parenting actually works — we saw the pattern in the app first.",
    avatar: "R",
    color: "#06B6D4",
    result: "Identified sleep-trigger pattern in 5 days",
  },
  {
    name: "Sarah K.",
    location: "Dubai, UAE",
    text: "Twin toddlers + infant sleep tracker + Amy's personalized CDC-aligned tips = sanity saved. The sleep schedule feature got our 6-month-old sleeping through the night in 11 days. Nothing else had worked.",
    avatar: "S",
    color: "#EC4899",
    result: "Baby sleeping through the night in 11 days",
  },
];

export default function LandingPage() {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden text-white relative"
      style={{
        background: "linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%)",
      }}
    >
      <style>{`
        @keyframes amyFloat {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-10px) }
        }
        @keyframes amyBounce {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
        }
        @keyframes amyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6) }
          50% { box-shadow: 0 0 0 18px rgba(168,85,247,0) }
        }
        @keyframes amyFadeUp {
          from { opacity: 0; transform: translateY(24px) }
          to { opacity: 1; transform: translateY(0) }
        }
        @keyframes amyShimmer {
          0% { background-position: 0% 50% }
          100% { background-position: 200% 50% }
        }
        @keyframes amyColorCycle {
          0%   { color: #7B3FF2 }
          25%  { color: #FF4ECD }
          50%  { color: #4FC3F7 }
          75%  { color: #FFD166 }
          100% { color: #7B3FF2 }
        }
        @keyframes amyCounterGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.3) }
          50% { box-shadow: 0 0 24px 4px rgba(168,85,247,0.2) }
        }
        @keyframes scrollX {
          0% { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
        .amy-float { animation: amyFloat 5s ease-in-out infinite }
        .amy-bounce { animation: amyBounce 2.6s ease-in-out infinite }
        .amy-pulse { animation: amyPulse 2.8s ease-out infinite }
        .amy-fade-up { animation: amyFadeUp 0.8s ease-out both }
        .amy-fade-up-1 { animation: amyFadeUp 0.8s ease-out 0.1s both }
        .amy-fade-up-2 { animation: amyFadeUp 0.8s ease-out 0.2s both }
        .amy-fade-up-3 { animation: amyFadeUp 0.8s ease-out 0.35s both }
        .amy-fade-up-4 { animation: amyFadeUp 0.8s ease-out 0.5s both }
        .amy-color-cycle {
          animation: amyColorCycle 4s ease-in-out infinite;
          will-change: color;
          text-shadow: 0 0 24px rgba(168,85,247,0.35);
        }
        .amy-gradient-text {
          background: linear-gradient(90deg,#A855F7,#6366F1,#06B6D4,#A855F7);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: amyShimmer 6s linear infinite;
        }
        .amy-glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .amy-glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
        }
        .amy-glass-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px -10px rgba(168,85,247,0.4);
          border-color: rgba(168,85,247,0.4);
        }
        .amy-cta {
          background: linear-gradient(135deg,#A855F7 0%,#EC4899 100%);
          box-shadow: 0 10px 40px rgba(168,85,247,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .amy-cta:hover {
          transform: scale(1.05);
          box-shadow: 0 14px 50px rgba(236,72,153,0.6), 0 0 0 1px rgba(255,255,255,0.2) inset;
        }
        .amy-stat-card {
          animation: amyCounterGlow 3s ease-in-out infinite;
        }
        .amy-feature-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .amy-feature-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 40px -8px rgba(168,85,247,0.35);
          border-color: rgba(168,85,247,0.35);
        }
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
        .marquee-track {
          display: flex;
          gap: 12px;
          animation: scrollX 28s linear infinite;
          width: max-content;
        }
        .marquee-track:hover { animation-play-state: paused }
        @keyframes amyBlink {
          0%, 45%, 100% { transform: scaleY(1) }
          48% { transform: scaleY(0.18) }
          50% { transform: scaleY(0.04) }
          52% { transform: scaleY(0.18) }
        }
        @keyframes amyCapBob {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-1px) }
        }
        @keyframes amyCapShine {
          0%, 100% { opacity: 0.7 }
          50% { opacity: 1 }
        }
        .amy-eye {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #1a1a2e;
          border-radius: 50%;
          border: 2px solid white;
          animation: amyBlink 3.5s ease-in-out infinite;
          transform-origin: center;
        }
        .amy-face-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg,#7C3AED,#A855F7,#F472B6);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          gap: 3px;
          flex-shrink: 0;
          box-shadow: 0 5px 14px rgba(168,85,247,0.55);
          position: relative;
          animation: amyCapBob 2.6s ease-in-out infinite;
        }
        .amy-face-wrap::before {
          content: "";
          position: absolute;
          top: -6px;
          left: 2px;
          right: 2px;
          height: 9px;
          border-radius: 999px 999px 4px 4px;
          background: linear-gradient(90deg,#4C1D95,#7C3AED,#A855F7,#EC4899);
          box-shadow: 0 1px 0 rgba(255,255,255,0.45) inset;
          animation: amyCapShine 2.8s ease-in-out infinite;
        }
        .amy-face-iris {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #fff;
          border-radius: 50%;
          position: relative;
          z-index: 1;
          box-shadow: 0 0 0 1px rgba(30,20,60,0.2);
        }
      `}</style>

      {/* Glow blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle,#A855F7,transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle,#3B82F6,transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#EC4899,transparent 70%)" }}
        />
        <div
          className="absolute top-2/3 left-10 w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle,#06B6D4,transparent 70%)" }}
        />
      </div>

      {/* NAV */}
      <header className="relative z-20 flex items-center justify-between px-5 py-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <AmyIcon size={44} ring bounce />
            <div className="flex flex-col leading-tight">
              <span
                className="font-quicksand font-black text-xl"
                style={{
                  background: "linear-gradient(90deg,#A855F7,#EC4899,#06B6D4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AmyNest AI
              </span>
              <span className="text-[10px] text-white/45 font-medium tracking-wide">
                Where Smart Parenting Starts
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/sign-in">
            <button className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-3 py-1.5">
              {t("landing.nav_sign_in")}
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="amy-cta text-sm font-bold px-5 py-2 rounded-xl text-white hidden md:flex items-center gap-1.5">
              Get Started Free <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center text-center px-5 pt-12 pb-16">
        <div className="amy-fade-up-1 relative -mb-6 flex items-center justify-center">
          <div className="amy-hero-float">
            <img
              src={heroImg}
              alt="AmyNest AI"
              className="amy-hero-glow w-80 md:w-[560px] object-contain"
              style={{ mixBlendMode: "screen" }}
            />
          </div>
        </div>

        <h1 className="amy-fade-up-2 amy-color-cycle font-quicksand font-black text-4xl md:text-6xl leading-[1.1] tracking-tight max-w-3xl mb-4">
          {t("landing.hero_headline")}
        </h1>

        <p className="amy-fade-up-3 text-white/75 text-base md:text-xl max-w-xl leading-relaxed mb-10">
          {t("landing.hero_sub")}
        </p>

        <div className="amy-fade-up-4 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/sign-up">
            <button
              className="amy-cta inline-flex items-center gap-2 text-base md:text-lg font-bold px-9 md:px-10 py-4 md:py-5 rounded-2xl text-white"
              data-testid="button-hero-cta"
            >
              {t("landing.hero_cta")}
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="amy-glass inline-flex items-center gap-2 text-sm font-semibold px-7 py-4 rounded-2xl text-white/80 hover:text-white hover:border-white/20 transition-all">
              {t("landing.nav_sign_in")}
            </button>
          </Link>
        </div>

      </section>

      {/* SCIENCE CITATIONS SCROLLING MARQUEE */}
      <div
        className="relative z-10 overflow-hidden py-3 border-y"
        style={{
          borderColor: "rgba(168,85,247,0.15)",
          background: "rgba(168,85,247,0.04)",
        }}
      >
        <div className="marquee-track">
          {[...SCIENCE_CITATIONS, ...SCIENCE_CITATIONS].map((cite, i) => (
            <span
              key={i}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] text-white/55 font-medium whitespace-nowrap"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {cite}
            </span>
          ))}
        </div>
      </div>

      {/* PROBLEM HOOK */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 amy-glass mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white/80">
              <Sparkles className="h-3 w-3 text-pink-300" />
              {t("landing.problems_eyebrow")}
            </div>
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              {t("landing.problems_heading")}
            </h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">
              {t("landing.problems_sub")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
            {PROBLEMS.map(({ icon: Icon, labelKey, color }) => (
              <div
                key={labelKey}
                className="amy-glass-card rounded-2xl p-4 md:p-5 flex items-center gap-3"
              >
                <div
                  className="h-10 w-10 md:h-11 md:w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <Icon className="h-5 w-5 md:h-5 md:w-5" style={{ color }} />
                </div>
                <span className="text-white/90 text-sm md:text-base font-semibold">{t(labelKey)}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-white/70 text-base md:text-lg italic">
            {t("landing.not_alone")}
          </p>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              {t("landing.features_heading")}
            </h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">
              {t("landing.features_sub")}
            </p>
          </div>

          {/* Amy Coach hero card */}
          <div
            className="amy-glass-card rounded-3xl p-7 md:p-10 mb-5 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(99,102,241,0.12) 60%, rgba(255,255,255,0.04) 100%)",
              borderColor: "rgba(168,85,247,0.35)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(circle,#A855F7,transparent 70%)" }}
            />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-7 mb-6">
                <div
                  className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#A855F7,#6366F1)",
                    boxShadow: "0 10px 30px rgba(168,85,247,0.45)",
                  }}
                >
                  <Brain className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h3 className="font-quicksand font-bold text-xl md:text-2xl text-white">
                      {t("landing.coach_title")}
                    </h3>
                    <span
                      className="text-[10px] md:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                      style={{
                        background: "linear-gradient(135deg,#A855F7,#EC4899)",
                        boxShadow: "0 4px 14px rgba(236,72,153,0.4)",
                      }}
                    >
                      {t("landing.core_feature")}
                    </span>
                  </div>
                  <p className="text-white/75 text-sm md:text-base leading-relaxed">
                    {t("landing.coach_desc")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {COACH_HIGHLIGHT_KEYS.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-purple-300 shrink-0" />
                    <span className="text-white/85 text-xs md:text-sm font-medium">{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kids Control Center hero card */}
          <div
            className="amy-glass-card rounded-3xl p-7 md:p-10 mb-5 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(123,63,242,0.18) 0%, rgba(255,78,205,0.12) 60%, rgba(255,255,255,0.04) 100%)",
              borderColor: "rgba(123,63,242,0.35)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-35 pointer-events-none"
              style={{ background: "radial-gradient(circle,#FF4ECD,transparent 70%)" }}
            />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-7 mb-6">
                <div
                  className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#7B3FF2,#FF4ECD)",
                    boxShadow: "0 10px 30px rgba(255,78,205,0.45)",
                  }}
                >
                  <ShieldCheck className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h3 className="font-quicksand font-bold text-xl md:text-2xl text-white">
                      Kids Control Center
                    </h3>
                    <span
                      className="text-[10px] md:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                      style={{
                        background: "linear-gradient(135deg,#7B3FF2,#FF4ECD)",
                        boxShadow: "0 4px 14px rgba(255,78,205,0.4)",
                      }}
                    >
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-white/75 text-sm md:text-base leading-relaxed">
                    A dedicated child-safe experience built on AAP's 2023 digital wellness guidelines. Screen time
                    limits, focus mode, parent lock, and synced daily routines — all in a dashboard your child can
                    actually use independently.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {[
                  "Screen Time Limits (AAP-aligned)",
                  "Child-Safe Focus Mode",
                  "Routine Sync with Parent App",
                  "PIN-Protected Parent Lock",
                ].map((feat) => (
                  <div
                    key={feat}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-pink-300 shrink-0" />
                    <span className="text-white/85 text-xs md:text-sm font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {SECONDARY_FEATURES.map(({ icon: Icon, titleKey, descKey, gradient }) => (
              <div
                key={titleKey}
                className="amy-glass-card rounded-3xl p-5 md:p-7 flex flex-col gap-3 md:gap-4"
              >
                <div
                  className="h-11 w-11 md:h-12 md:w-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: gradient,
                    boxShadow: "0 8px 24px rgba(168,85,247,0.25)",
                  }}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-quicksand font-bold text-base md:text-lg text-white mb-1.5 md:mb-2">
                    {t(titleKey)}
                  </h3>
                  <p className="text-white/65 text-xs md:text-sm leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mid CTA */}
          <div className="text-center mt-12">
            <p className="text-white/80 text-base md:text-lg mb-5 font-medium">
              {t("landing.mid_cta")}
            </p>
            <Link href="/sign-up">
              <button
                className="amy-cta inline-flex items-center gap-2 text-sm md:text-base font-bold px-7 md:px-8 py-3.5 md:py-4 rounded-2xl text-white"
                data-testid="button-features-cta"
              >
                {t("landing.mid_cta_btn")}
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ALL FEATURES MEGA GRID */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 amy-glass mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white/80">
              <Sparkles className="h-3 w-3 text-cyan-300" />
              Everything in One App
            </div>
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              14+ Science-Backed Tools in One App
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              From newborns to teens — every feature is grounded in child psychology, AAP guidelines, and developmental research.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {ALL_FEATURES.map(({ icon: Icon, title, desc, gradient, badge }) => (
              <div
                key={title}
                className="amy-feature-card rounded-2xl p-5 md:p-6 flex flex-col gap-3 relative overflow-hidden"
              >
                {badge && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{
                      background: badge === "New"
                        ? "linear-gradient(135deg,#06B6D4,#3B82F6)"
                        : "linear-gradient(135deg,#F97316,#EF4444)",
                    }}
                  >
                    {badge}
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: gradient,
                      boxShadow: "0 6px 18px rgba(168,85,247,0.25)",
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-quicksand font-bold text-base text-white mb-1">{title}</h3>
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA after mega grid */}
          <div className="text-center mt-12">
            <Link href="/sign-up">
              <button className="amy-cta inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-2xl text-white">
                Unlock All Features Free
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <p className="mt-3 text-xs text-white/40">Free plan included · Upgrade anytime</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 amy-glass mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white/80">
              <Zap className="h-3 w-3 text-yellow-300" />
              {t("landing.how_eyebrow")}
            </div>
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              {t("landing.how_heading")}
            </h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">
              {t("landing.how_sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {STEPS.map(({ icon: Icon, titleKey, descKey }, idx) => (
              <div
                key={titleKey}
                className="amy-glass-card rounded-3xl p-6 md:p-7 relative"
              >
                <div
                  className="absolute -top-3 -left-3 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm font-quicksand"
                  style={{
                    background: "linear-gradient(135deg,#A855F7,#EC4899)",
                    boxShadow: "0 6px 18px rgba(236,72,153,0.45)",
                  }}
                >
                  {idx + 1}
                </div>
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg,#A855F7,#6366F1)",
                    boxShadow: "0 8px 24px rgba(168,85,247,0.3)",
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-quicksand font-bold text-lg md:text-xl text-white mb-2">
                  {t(titleKey)}
                </h3>
                <p className="text-white/65 text-sm leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 amy-glass mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white/80">
              <Heart className="h-3 w-3 text-pink-300" />
              Parent Stories
            </div>
            <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-white mb-3">
              Real Parents, Real Results
            </h2>
            <p className="text-white/60 text-base max-w-lg mx-auto">
              Thousands of families use AmyNest every day to raise happier, calmer, more confident kids.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, location, text, avatar, color, result }) => (
              <div key={name} className="amy-testimonial rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                {/* Outcome badge */}
                <div
                  className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg,${color}CC,${color}88)`,
                    border: `1px solid ${color}44`,
                  }}
                >
                  <BarChart3 className="h-3 w-3" />
                  {result}
                </div>
                <p className="text-white/80 text-sm leading-relaxed flex-1">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{
                      background: `linear-gradient(135deg,${color},${color}99)`,
                      boxShadow: `0 4px 14px ${color}40`,
                    }}
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

      {/* TRUST / SCIENCE */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div
            className="amy-glass rounded-3xl p-7 md:p-12 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.25)",
            }}
          >
            <div
              aria-hidden
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle,#6366F1,transparent 70%)" }}
            />

            <div className="relative text-center mb-9">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-5"
                style={{
                  background: "linear-gradient(135deg,#6366F1,#A855F7)",
                  boxShadow: "0 10px 30px rgba(99,102,241,0.45)",
                }}
              >
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <h2 className="font-quicksand font-bold text-2xl md:text-4xl text-white leading-tight mb-3">
                {t("landing.trust_heading")}
              </h2>
              <p className="text-white/65 text-base max-w-xl mx-auto leading-relaxed">
                {t("landing.trust_sub")}
              </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {TRUST_PILLARS.map(({ icon: Icon, titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="rounded-2xl p-5 md:p-6"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: "rgba(168,85,247,0.20)",
                      border: "1px solid rgba(168,85,247,0.35)",
                    }}
                  >
                    <Icon className="h-5 w-5 text-purple-300" />
                  </div>
                  <h3 className="font-quicksand font-bold text-base md:text-lg text-white mb-1.5">
                    {t(titleKey)}
                  </h3>
                  <p className="text-white/65 text-xs md:text-sm leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD THE APP */}
      <section className="relative z-10 px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <div
            className="amy-glass rounded-3xl overflow-hidden relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(99,102,241,0.14) 60%, rgba(236,72,153,0.10) 100%)",
              borderColor: "rgba(168,85,247,0.35)",
            }}
          >
            {/* bg glow blobs */}
            <div
              aria-hidden
              className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle,#A855F7,transparent 70%)" }}
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-25 pointer-events-none"
              style={{ background: "radial-gradient(circle,#EC4899,transparent 70%)" }}
            />

            <div className="relative flex flex-col md:flex-row items-center gap-10 md:gap-0 px-8 py-12 md:py-14">
              {/* Left: copy + buttons */}
              <div className="flex-1 text-center md:text-left z-10">
                <div className="inline-flex items-center gap-1.5 amy-glass mb-5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white/80">
                  <Smartphone className="h-3 w-3 text-purple-300" />
                  Available on iOS &amp; Android
                </div>
                <h2 className="font-quicksand font-black text-3xl md:text-4xl text-white leading-tight mb-4">
                  Take Amy with you{" "}
                  <span className="amy-gradient-text">everywhere</span>
                </h2>
                <p className="text-white/65 text-base md:text-lg max-w-md leading-relaxed mb-8">
                  Get personalised parenting guidance, AI-built routines, and behaviour
                  insights right from your pocket — free to download.
                </p>

                {/* Store buttons */}
                <div className="flex flex-col sm:flex-row items-center md:items-start gap-4">
                  {/* App Store — coming soon */}
                  <div
                    aria-label="App Store — coming soon"
                    className="relative flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-default select-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      opacity: 0.85,
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-white/70" aria-hidden>
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="text-left leading-tight">
                      <p className="text-white/40 text-[10px] font-medium">Download on the</p>
                      <p className="text-white/70 font-bold text-base">App Store</p>
                    </div>
                    <span
                      className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-white"
                      style={{ background: "linear-gradient(135deg,#A855F7,#EC4899)" }}
                    >
                      Soon
                    </span>
                  </div>

                  {/* Google Play — coming soon */}
                  <div
                    aria-label="Google Play — coming soon"
                    className="relative flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-default select-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      opacity: 0.85,
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 opacity-70" aria-hidden>
                      <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335"/>
                      <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04"/>
                      <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4"/>
                      <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853"/>
                    </svg>
                    <div className="text-left leading-tight">
                      <p className="text-white/40 text-[10px] font-medium">Get it on</p>
                      <p className="text-white/70 font-bold text-base">Google Play</p>
                    </div>
                    <span
                      className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-white"
                      style={{ background: "linear-gradient(135deg,#A855F7,#EC4899)" }}
                    >
                      Soon
                    </span>
                  </div>
                </div>

                {/* Social proof mini */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    {["P","R","S","K"].map((l,i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border-2 border-white/10 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: ["#A855F7","#06B6D4","#EC4899","#F97316"][i] }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <p className="text-white/55 text-xs">
                    <span className="text-white font-semibold">12,000+</span> parents already using the app
                  </p>
                </div>
              </div>

              {/* Right: phone mockup */}
              <div className="relative flex-shrink-0 flex items-end justify-center h-80 md:h-96 w-48 md:w-56">
                {/* Phone outer frame */}
                <div
                  className="relative w-44 md:w-52 rounded-[2.5rem] overflow-hidden"
                  style={{
                    height: "92%",
                    background: "linear-gradient(160deg,#1a1a2e,#16213e)",
                    border: "2px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 40px rgba(168,85,247,0.25)",
                  }}
                >
                  {/* Notch */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-20"
                    style={{ background: "#0f0c29" }}
                  />
                  {/* Screen content */}
                  <div className="absolute inset-0 pt-5 px-3 pb-3 flex flex-col gap-2 overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between items-center px-1 mt-1">
                      <span className="text-white/60 text-[8px] font-medium">9:41</span>
                      <div className="flex gap-1 items-center">
                        <div className="w-3 h-1.5 rounded-sm bg-white/60" />
                        <div className="w-1 h-1 rounded-full bg-white/60" />
                      </div>
                    </div>
                    {/* App header */}
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background:"linear-gradient(135deg,#7C3AED,#EC4899)" }}>
                        <span className="text-white text-[7px] font-black">A</span>
                      </div>
                      <span className="text-white text-[9px] font-bold">AmyNest AI</span>
                    </div>
                    {/* Today label */}
                    <div
                      className="rounded-xl px-2.5 py-2"
                      style={{ background:"rgba(168,85,247,0.18)", border:"1px solid rgba(168,85,247,0.3)" }}
                    >
                      <p className="text-white/50 text-[7px] font-semibold uppercase tracking-wide mb-1">Today's Routine</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { label:"Wake up & stretch", color:"#A855F7", time:"7:00" },
                          { label:"Breakfast time", color:"#F97316", time:"7:30" },
                          { label:"Reading zone", color:"#06B6D4", time:"8:00" },
                        ].map(({ label, color, time }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-white/80 text-[7px] flex-1">{label}</span>
                            <span className="text-white/40 text-[7px]">{time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Amy chat bubble */}
                    <div
                      className="rounded-xl px-2.5 py-2"
                      style={{ background:"rgba(236,72,153,0.15)", border:"1px solid rgba(236,72,153,0.25)" }}
                    >
                      <p className="text-white/50 text-[7px] font-semibold uppercase tracking-wide mb-1">Amy says</p>
                      <p className="text-white/75 text-[7px] leading-snug">
                        "Great morning! Liam completed 3 tasks. Try adding a calm-down corner today."
                      </p>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label:"Streak", value:"14d", color:"#FFD166" },
                        { label:"Score", value:"920", color:"#A855F7" },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className="rounded-xl p-2 text-center"
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}
                        >
                          <p className="font-bold text-[10px]" style={{ color }}>{value}</p>
                          <p className="text-white/45 text-[7px]">{label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Bottom nav bar */}
                    <div
                      className="mt-auto rounded-2xl px-3 py-1.5 flex justify-around"
                      style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}
                    >
                      {[Calendar, Brain, MessageCircle, Users].map((Icon, i) => (
                        <div key={i} className={`flex flex-col items-center gap-0.5 ${i === 0 ? "opacity-100" : "opacity-40"}`}>
                          <Icon className="h-3 w-3 text-white" />
                          <div className={`h-0.5 w-3 rounded-full ${i === 0 ? "bg-purple-400" : "bg-transparent"}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Reflective sheen */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)",
                    }}
                  />
                </div>
                {/* Phone shadow */}
                <div
                  aria-hidden
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-6 rounded-full pointer-events-none"
                  style={{ background:"rgba(168,85,247,0.3)", filter:"blur(16px)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-5 py-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-3">
              <AmyIcon size={38} ring />
              <div className="flex flex-col leading-tight">
                <span
                  className="font-quicksand font-black text-lg"
                  style={{
                    background: "linear-gradient(90deg,#A855F7,#EC4899,#06B6D4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  AmyNest AI
                </span>
                <span className="text-[10px] text-white/40 font-medium tracking-wide">
                  Where Smart Parenting Starts
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <Link href="/sign-up"><span className="hover:text-white/70 transition-colors cursor-pointer">Sign Up</span></Link>
            <Link href="/sign-in"><span className="hover:text-white/70 transition-colors cursor-pointer">Sign In</span></Link>
            <Link href="/privacy"><span className="hover:text-white/70 transition-colors cursor-pointer" data-testid="link-privacy">Privacy Policy</span></Link>
          </div>
          <p className="text-xs text-white/30">© 2026 AmyNest AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
