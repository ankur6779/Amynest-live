import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Mic,
  GraduationCap,
  BookOpen,
  Baby,
  Sparkles,
  ShieldCheck,
  Lock,
  EyeOff,
  Calendar,
  Utensils,
  Compass,
  MessageCircle,
  Check,
  X,
  UserPlus,
  Target,
  ListChecks,
  TrendingUp,
  ZoomIn,
  Award,
} from "lucide-react";
import { InfantParentingSection } from "@/components/marketing/infant-parenting-section";
import { PatentPendingPill, PATENT_TRUST_LINE } from "@/components/marketing/patent-pending-pill";
import { SeeAmyNestInActionSection } from "@/components/marketing/horizontal-showcase/horizontal-showcase";
import { trackGetAppFunnelEvent } from "@/lib/marketing/ga4-analytics";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";

const OFFICIAL_LOGO = "/amynest-logo-new.png";
const OG_IMAGE = "/opengraph.jpg";
const FAMILY_PHOTO = "/promo/social/carousels/vs-generic-apps/03-modern-families.png";

/** Outcome-focused hero headline options (CRO review — active: #1). */
const HERO_HEADLINE_OPTIONS = [
  "Turn Parenting Chaos Into Calm Daily Wins",
  "Know What To Do Next — From Crying Baby to Homework Battles",
  "Stop Googling at 2 AM. Get Clear Parenting Steps Instantly.",
  "Calmer Mornings, Better Meals, Confident Kids — One App",
  "Your Daily Parenting Plan — Ready in Minutes",
  "From Overwhelmed to On Track — Every Stage, Ages 0–10+",
  "Finally Know What To Feed, Teach, and Do Today",
  "Less Guesswork. More Good Days With Your Child.",
  "Parenting Answers When You Need Them — Not Hours Later",
  "Build Routines, Skills, and Calm — From Birth Through Age 10+",
] as const;

const HERO_HEADLINE = HERO_HEADLINE_OPTIONS[0];
const HERO_HEADLINE_LEAD = "Turn Parenting Chaos Into";
const HERO_HEADLINE_ACCENT = "Calm Daily Wins";

type StoreTarget = "android" | "ios";
type LandingEventName =
  | "landing_page_view"
  | "store_button_click"
  | "install_intent"
  | "scroll_depth"
  | "screenshot_carousel_engagement"
  | "scroll_cta_shown"
  | "exit_intent_shown"
  | "demo_question_click";

function trackLandingEvent(
  event: LandingEventName,
  meta: Record<string, string | number | boolean | undefined> = {},
) {
  trackGetAppFunnelEvent(event, meta);
}

/** Detect device. Defaults to Android so desktop visitors see Android first. */
function useStoreTarget(): StoreTarget {
  const [target, setTarget] = useState<StoreTarget>("android");
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setTarget("ios");
    else setTarget("android");
  }, []);
  return target;
}

function getStoreMeta(target: StoreTarget) {
  if (target === "ios") {
    return { href: APP_STORE_URL, label: "App Store", eyebrow: "Download on the", testId: "social-app-store" };
  }
  return { href: PLAY_STORE_URL, label: "Google Play", eyebrow: "Get it on", testId: "social-google-play" };
}

function StoreIcon({ target, className }: { target: StoreTarget; className: string }) {
  if (target === "ios") {
    return (
      <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
      <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
      <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
      <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
    </svg>
  );
}

function StoreButton({
  target,
  size = "default",
  location,
  variant = "glass",
  children,
}: {
  target: StoreTarget;
  size?: "default" | "large" | "compact";
  location: string;
  variant?: "glass" | "solid";
  children?: React.ReactNode;
}) {
  const store = getStoreMeta(target);
  const pad = size === "large" ? "px-7 py-4" : size === "compact" ? "px-3 py-2" : "px-6 py-3.5";
  const icon = size === "large" ? "h-8 w-8" : size === "compact" ? "h-5 w-5" : "h-7 w-7";
  const title = size === "large" ? "text-lg" : size === "compact" ? "text-xs" : "text-base";
  const eyebrow = size === "compact" ? "hidden" : "text-[10px] font-semibold uppercase tracking-wide";
  const onClick = () => {
    trackLandingEvent("install_intent", { store: target, location });
    trackLandingEvent("store_button_click", { store: target, location });
  };
  const bg =
    variant === "solid"
      ? { background: "#ffffff", border: "1px solid #ffffff" }
      : { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" };
  const textClass = variant === "solid" ? "text-slate-900" : "text-white";
  const subClass = variant === "solid" ? "text-slate-500" : "text-white/55";

  return (
    <a
      href={store.href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={store.testId}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center sm:justify-start gap-2 ${pad} rounded-xl transition-all hover:scale-[1.02]`}
      style={{ ...bg, textDecoration: "none" }}
    >
      <StoreIcon target={target} className={`${icon} shrink-0 ${textClass}`} />
      {children ?? (
        <div className="text-left leading-tight">
          <p className={`${eyebrow} ${subClass}`}>{store.eyebrow}</p>
          <p className={`font-bold ${title} ${textClass}`}>{store.label}</p>
        </div>
      )}
    </a>
  );
}

/** Android first, then iOS — never iOS-only. */
function StoreButtonRow({
  size = "default",
  location,
  variant = "glass",
}: {
  size?: "default" | "large" | "compact";
  location: string;
  variant?: "glass" | "solid";
}) {
  return (
    <div className={`flex ${size === "compact" ? "flex-row" : "flex-col sm:flex-row"} items-stretch gap-2 sm:gap-3 w-full`}>
      <StoreButton target="android" size={size} location={`${location}_android`} variant={variant} />
      <StoreButton target="ios" size={size} location={`${location}_ios`} variant={variant} />
    </div>
  );
}

function setMetaTag(selector: string, attr: "content" | "href", value: string) {
  const existing = document.querySelector(selector);
  if (existing) {
    existing.setAttribute(attr, value);
    return;
  }
  const tag = selector.includes("canonical") ? document.createElement("link") : document.createElement("meta");
  if (selector.includes("canonical")) {
    tag.setAttribute("rel", "canonical");
    tag.setAttribute("href", value);
  } else {
    const propertyMatch = selector.match(/property="([^"]+)"/);
    const nameMatch = selector.match(/name="([^"]+)"/);
    if (propertyMatch) tag.setAttribute("property", propertyMatch[1]);
    if (nameMatch) tag.setAttribute("name", nameMatch[1]);
    tag.setAttribute("content", value);
  }
  document.head.appendChild(tag);
}

const TRUST_BAR = [
  { icon: Sparkles, label: "AI Parenting Guidance" },
  { icon: Award, label: "Patent-Pending AI" },
  { icon: Calendar, label: "Daily Routines" },
  { icon: Baby, label: "Infant Hub · 100% Free" },
  { icon: Mic, label: "Speech Development" },
  { icon: BookOpen, label: "Learning Activities" },
  { icon: ShieldCheck, label: "Child-Safe Experience" },
] as const;


function InfantFreePill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ${className}`}
      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}
    >
      <Baby className="h-3 w-3 shrink-0" aria-hidden />
      100% free for infants
    </span>
  );
}

type ChatTurn = { parent: string; amy: string };

const AMY_CHAT: ChatTurn[] = [
  { parent: "My child refuses to study.", amy: "Let's build a simple 15-minute learning routine that feels easy to start today." },
  { parent: "What should my toddler eat today?", amy: "Here's a balanced meal plan with breakfast, lunch and two healthy snacks." },
  { parent: "My baby keeps crying.", amy: "Let's identify the likely cause — hunger, sleep or comfort — and what to try next." },
];

/**
 * SAFE interactive demo data — 100% local, no network, no AI inference, no token usage.
 * Every response below is a static preview string. Nothing here calls a backend or LLM.
 */
type DemoExchange = { id: string; question: string; answer: string };

const DEMO_EXCHANGES: DemoExchange[] = [
  {
    id: "study",
    question: "My child won't study",
    answer:
      "Start with a 10-minute study block and one small win. Consistency matters more than duration.",
  },
  {
    id: "vegetables",
    question: "My toddler won't eat vegetables",
    answer:
      "Try pairing vegetables with familiar foods and offer small portions repeatedly without pressure.",
  },
  {
    id: "crying",
    question: "My baby keeps crying",
    answer:
      "Check hunger, sleep and comfort cues first. The Infant Hub helps decode cries — and the full app is 100% free for infants.",
  },
  {
    id: "bedtime",
    question: "Bedtime is a struggle",
    answer:
      "Keep a calm, predictable wind-down: dim lights, one story, same time each night. Routine signals the brain it's time to sleep.",
  },
  {
    id: "screens",
    question: "My child spends too much time on screens",
    answer:
      "Swap some screen time for one guided activity they enjoy. Clear limits work best when there's a fun alternative ready.",
  },
  {
    id: "activity",
    question: "What activity should we do today?",
    answer:
      "Pick one learning, one movement and one calm activity. A simple mix keeps the day balanced and engaging.",
  },
  {
    id: "speech",
    question: "My child struggles with speech",
    answer:
      "Practice a few target sounds daily through play and repetition. Short, gentle sessions build clarity and confidence over time.",
  },
  {
    id: "routine",
    question: "Help me create a daily routine",
    answer:
      "Anchor the day around wake-up, meals and bedtime first. Build everything else around those fixed points for a calm rhythm.",
  },
];

const STAGES = [
  {
    range: "0–2 Years",
    label: "The Newborn Years",
    icon: Baby,
    gradient: "linear-gradient(135deg,#f472b6,#a855f7)",
    items: ["Cry Insight", "Feeding Support", "Sleep Guidance", "Full app · 100% free"],
  },
  {
    range: "2–5 Years",
    label: "Early Discovery",
    icon: Compass,
    gradient: "linear-gradient(135deg,#a855f7,#6366f1)",
    items: ["Speech Coach", "Amy Sound World", "Phonics", "Stories"],
  },
  {
    range: "5–8 Years",
    label: "Building Skills",
    icon: BookOpen,
    gradient: "linear-gradient(135deg,#6366f1,#06b6d4)",
    items: ["Reading Skills", "Spelling Mastery", "Smart Study Zone"],
  },
  {
    range: "8–10+ Years",
    label: "School-Age & Beyond",
    icon: GraduationCap,
    gradient: "linear-gradient(135deg,#06b6d4,#22c55e)",
    items: ["Study & Focus Plans", "Reading & Writing", "Confidence Building", "Age-Right Learning"],
  },
] as const;

const PARENT_AMY_QUESTIONS: ChatTurn[] = [
  {
    parent: "My baby keeps crying and I don't know why.",
    amy: "Let's identify the likely cause — hunger, sleep, or comfort — and what to try in the next 10 minutes.",
  },
  {
    parent: "What should my toddler eat today?",
    amy: "Here's a balanced meal plan with breakfast, lunch, and two healthy snacks matched to their age.",
  },
  {
    parent: "My child refuses to study after school.",
    amy: "Let's build a simple 15-minute learning routine that feels easy to start today.",
  },
  {
    parent: "How do I create a bedtime routine that actually sticks?",
    amy: "I'll map a wind-down sequence with timing, cues, and one small win you can repeat tonight.",
  },
  {
    parent: "Is my baby's development on track?",
    amy: "I'll walk through age-based milestones and what to watch for — plus when to talk with your pediatrician.",
  },
  {
    parent: "My child struggles to pronounce words clearly.",
    amy: "Speech Coach can start with gentle daily practice — I'll pick sounds and activities for their level.",
  },
  {
    parent: "Our mornings are always chaotic. Where do I start?",
    amy: "The Routine Generator will build a calm morning plan around wake-up, meals, and getting out the door.",
  },
  {
    parent: "How much screen time is okay for my 5-year-old?",
    amy: "Here's an age-appropriate limit and guided activities to replace random scrolling with purposeful play.",
  },
  {
    parent: "What should we do with our child today?",
    amy: "Based on age and progress, here are three activities — learning, movement, and calm time — for today.",
  },
  {
    parent: "My child had a meltdown after school. What now?",
    amy: "Let's reset with a short calming routine, then one connection activity before any homework.",
  },
];

/** `them` = whether a typical learning app usually offers this. AmyNest offers all. */
const COMPARISON_ROWS = [
  { label: "AI Parenting Assistant", them: false },
  { label: "Infant Parenting — Full App Free", them: false },
  { label: "Daily Routine Generator", them: false },
  { label: "Nutrition Guidance", them: false },
  { label: "Speech Development", them: false },
  { label: "Learning Activities", them: true },
  { label: "Worksheets & Stories", them: false },
  { label: "Amy Sound World", them: false },
  { label: "Amy Coach", them: false },
  { label: "Age-Based Recommendations", them: false },
  { label: "One App For Ages 0–10+", them: false },
] as const;

const PAIN_SOLUTIONS = [
  {
    pain: "My child spends too much time watching random videos.",
    solution: "AMY turns screen time into guided, age-appropriate activities your child actually enjoys.",
  },
  {
    pain: "I don't know if my baby is developing normally.",
    solution: "The Infant Hub tracks milestones and decodes cries, sleep and feeding — the full app is 100% free for infants.",
  },
  {
    pain: "My child struggles with speech.",
    solution: "Speech Coach builds clear pronunciation and confidence through gentle daily practice.",
  },
  {
    pain: "Our mornings are always chaotic.",
    solution: "The AI Routine Generator builds a calm, personalized day your whole family can follow.",
  },
  {
    pain: "I never know what activities to choose.",
    solution: "AMY recommends the next best activity based on your child's age and progress.",
  },
  {
    pain: "I'm not sure what to feed my child each day.",
    solution: "The Nutrition Hub plans balanced meals and snacks, so there's no daily guesswork.",
  },
] as const;

const OUTCOME_FEATURES = [
  {
    icon: MessageCircle,
    title: "Get Parenting Guidance Exactly When You Need It",
    desc: "AMY answers real parenting questions and tells you the next best step — day or night.",
    gradient: "linear-gradient(135deg,#a855f7,#ec4899)",
  },
  {
    icon: Calendar,
    title: "End Daily Chaos With Personalized Routines",
    desc: "The AI Routine Generator turns mornings, study and bedtime into a calm, doable plan.",
    gradient: "linear-gradient(135deg,#7c3aed,#a855f7)",
  },
  {
    icon: Mic,
    title: "Help Your Child Speak Clearly and Confidently",
    desc: "Speech Coach guides daily practice that builds real pronunciation and confidence.",
    gradient: "linear-gradient(135deg,#f97316,#ec4899)",
  },
  {
    icon: Utensils,
    title: "Know What To Feed Your Child Every Day",
    desc: "The Nutrition Hub plans balanced meals and snacks, removing the daily what's-for-dinner stress.",
    gradient: "linear-gradient(135deg,#10b981,#22c55e)",
  },
  {
    icon: Baby,
    title: "Feel Calm and Capable In The Newborn Years",
    desc: "The Infant Hub decodes cries and guides feeding, sleep and milestones — the entire app is free for infants.",
    gradient: "linear-gradient(135deg,#6366f1,#06b6d4)",
  },
  {
    icon: GraduationCap,
    title: "Raise A Confident, Capable Learner",
    desc: "Phonics, reading, spelling and Smart Study Zone grow real skills, one win at a time.",
    gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)",
  },
] as const;

/** Real app UI captures served from /promo/get-app/screenshots/ */
const HERO_APP_SCREENSHOTS = [
  { id: "amy", title: "AMY Assistant", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
  { id: "routine", title: "Daily Routine Generator", image: "/promo/get-app/screenshots/daily-routine.jpg" },
  { id: "infant", title: "Infant Hub", image: "/promo/get-app/screenshots/infant-hub.jpg", free: true },
  { id: "speech", title: "Speech Coach", image: "/promo/get-app/screenshots/speech-coach.png" },
  { id: "study", title: "Smart Study Zone", image: "/promo/get-app/screenshots/smart-study-zone.jpg" },
] as const;

const INSTALL_ONBOARDING_STEPS = [
  { icon: UserPlus, title: "Create your child's profile", desc: "Add age and goals so every recommendation fits your child." },
  { icon: Target, title: "Tell AMY your biggest challenge", desc: "Sleep, meals, speech, study or infant care — share what matters most today. Infant features are 100% free." },
  { icon: Sparkles, title: "Get a personalized parenting and learning plan", desc: "AMY builds routines, activities and guidance tailored to your family." },
  { icon: ListChecks, title: "Start age-appropriate activities", desc: "Open the right hub and follow simple daily actions you can actually finish." },
  { icon: TrendingUp, title: "Track growth and progress", desc: "See milestones, streaks and wins update as your child grows." },
] as const;

type Screenshot = {
  id: string;
  title: string;
  benefit: string;
  accent: string;
  image?: string;
  rows: string[];
};

const SCREENSHOTS: Screenshot[] = [
  { id: "amy", title: "AMY Assistant", benefit: "Your always-on parenting co-pilot for instant, personalized answers.", accent: "#a855f7", image: "/promo/social/reels/amy-coach.png", rows: ["Ask Amy anything", "Next best step", "Parenting guidance", "Daily check-in"] },
  { id: "coach", title: "Amy Coach", benefit: "Guided coaching and audio lessons your child can learn from anywhere.", accent: "#38bdf8", rows: ["Today's lesson", "Listen and repeat", "Story-led learning", "Hands-free play"] },
  { id: "routine", title: "Routine Generator", benefit: "End daily chaos with calm, personalized routines for the whole day.", accent: "#7c3aed", image: "/promo/social/reels/daily-routines.png", rows: ["Morning plan", "School prep", "Study block", "Wind-down"] },
  { id: "infant", title: "Infant Hub", benefit: "Decode cries and guide feeding, sleep and milestones — the full AmyNest app is 100% free for infants.", accent: "#f472b6", image: "/promo/infant-parenting/appstore-02-baby-today.jpg", rows: ["Cry insight", "Feeding support", "Sleep guidance", "100% free"] },
  { id: "nutrition", title: "Nutrition Hub", benefit: "Know what to feed your child with balanced daily meal plans.", accent: "#22c55e", image: "/promo/social/reels/nutrition-hub.png", rows: ["Breakfast idea", "Balanced lunch", "Healthy snacks", "Hydration"] },
  { id: "speech", title: "Speech Coach", benefit: "Help your child speak clearly and confidently with guided practice.", accent: "#f59e0b", image: "/promo/social/reels/speech-coach.png", rows: ["Warm-up sounds", "Practice words", "Confidence streak", "Parent summary"] },
  { id: "study", title: "Smart Study Zone", benefit: "Keep learning focused with the right activity at the right time.", accent: "#3b82f6", image: "/promo/social/reels/learning-zone.png", rows: ["Daily study path", "Focus session", "Skill builder", "Progress saved"] },
  { id: "discovery", title: "Amy Sound World", benefit: "Spark curiosity with immersive, child-safe worlds of exploration.", accent: "#06b6d4", rows: ["Explore a world", "Guided discovery", "Fun challenges", "Earn rewards"] },
];

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full rounded-[2.2rem] overflow-hidden ${className ?? "max-w-[250px]"}`}
      style={{
        aspectRatio: "9/19",
        border: "2px solid rgba(255,255,255,0.22)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 50px rgba(168,85,247,0.18)",
        background: "#0d0b16",
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10 bg-black/80" />
      {children}
    </div>
  );
}

function ScreenshotLightbox({
  shot,
  onClose,
}: {
  shot: (typeof HERO_APP_SCREENSHOTS)[number];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${shot.title} screenshot`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full sl-glass flex items-center justify-center text-white"
        aria-label="Close screenshot"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
        <PhoneFrame>
          <img src={shot.image} alt={shot.title} className="absolute inset-0 h-full w-full object-cover object-top" />
        </PhoneFrame>
        <p className="mt-4 text-center font-quicksand font-bold text-lg text-white">{shot.title}</p>
        <p className="mt-1 text-center text-sm text-white/55">Tap outside to close</p>
      </div>
    </div>
  );
}

function AppScreenshotStrip() {
  const [expanded, setExpanded] = useState<(typeof HERO_APP_SCREENSHOTS)[number] | null>(null);

  const open = (shot: (typeof HERO_APP_SCREENSHOTS)[number]) => {
    setExpanded(shot);
    trackLandingEvent("screenshot_carousel_engagement", { feature: shot.id, action: "expand" });
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14" aria-labelledby="see-amynest-heading">
      <div className="text-center mb-6 md:mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Real app screens</p>
        <h2 id="see-amynest-heading" className="font-quicksand font-black text-3xl sm:text-4xl">
          See AmyNest In Action
        </h2>
        <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto mt-3 leading-relaxed">
          Swipe through the app, then tap any screen to enlarge.
        </p>
        <p className="inline-flex items-center justify-center gap-2 mt-4 text-sm font-semibold text-emerald-300/95">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          See real screens from the app. No marketing promises.
        </p>
      </div>

      <div
        className="flex gap-5 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {HERO_APP_SCREENSHOTS.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => open(shot)}
            className="snap-center shrink-0 w-[176px] sm:w-[200px] text-left group"
            aria-label={`View ${shot.title} screenshot`}
          >
            <div className="relative rounded-[2.35rem] p-1" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(99,102,241,0.15))" }}>
              <PhoneFrame className="max-w-none">
                <img
                  src={shot.image}
                  alt={shot.title}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  loading="eager"
                  decoding="async"
                />
              </PhoneFrame>
              <span className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4 text-white" aria-hidden />
              </span>
            </div>
            <p className="mt-3 font-quicksand font-bold text-[13px] sm:text-sm text-white text-center leading-tight px-0.5">
              {shot.title}
            </p>
            {"free" in shot && shot.free ? (
              <p className="mt-1.5 flex justify-center">
                <InfantFreePill />
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {expanded && <ScreenshotLightbox shot={expanded} onClose={() => setExpanded(null)} />}
    </section>
  );
}

function InstallOnboardingSection({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14" aria-labelledby="after-install-heading">
      <div className="text-center mb-8 md:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Simple setup</p>
        <h2 id="after-install-heading" className="font-quicksand font-black text-3xl sm:text-4xl">
          What Happens After You Install?
        </h2>
        <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
          No complicated onboarding — a clear path from download to your first win.
        </p>
      </div>

      <ol className="relative max-w-3xl mx-auto">
        <div aria-hidden className="absolute left-[1.35rem] top-8 bottom-8 w-px bg-gradient-to-b from-purple-500/50 via-purple-400/25 to-transparent" />
        {INSTALL_ONBOARDING_STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 sm:gap-5 pb-8 last:pb-0">
            <div
              className="relative z-10 h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center font-quicksand font-black text-sm text-white"
              style={{
                background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.2))",
                border: "1px solid rgba(168,85,247,0.35)",
              }}
            >
              {index + 1}
            </div>
            <div className="sl-card rounded-2xl p-4 sm:p-5 flex-1 flex gap-3.5 items-start">
              <span
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.28)" }}
              >
                <step.icon className="h-5 w-5 text-purple-200" />
              </span>
              <div>
                <h3 className="font-quicksand font-bold text-base sm:text-lg text-white mb-1">{step.title}</h3>
                <p className="text-white/58 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => {
            trackLandingEvent("install_intent", { location: "onboarding_cta" });
            onStartFree();
          }}
          className="sl-cta inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-white text-base"
        >
          Start Free Today
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-3 text-white/45 text-xs">Free to start · Android &amp; iOS · No credit card</p>
        <p className="mt-2 flex justify-center">
          <PatentPendingPill className="text-[10px] normal-case tracking-normal px-2.5 py-1" />
        </p>
      </div>
    </section>
  );
}

function MockScreen({ shot }: { shot: Screenshot }) {
  return (
    <div className="absolute inset-0 pt-7 px-3 pb-4 flex flex-col gap-3" style={{ background: "linear-gradient(160deg,#14121f,#1e1b35)" }}>
      <div className="flex items-center gap-2">
        <img src={OFFICIAL_LOGO} alt="" className="h-7 w-7 rounded-lg object-cover" />
        <div>
          <p className="text-[10px] font-bold text-white/90">{shot.title}</p>
          <p className="text-[8px] text-white/45">AmyNest AI</p>
        </div>
      </div>
      <div className="rounded-2xl px-3 py-3" style={{ background: `${shot.accent}24`, border: `1px solid ${shot.accent}66` }}>
        <p className="text-[9px] font-bold uppercase tracking-wide text-white/80 mb-2">For your child today</p>
        {shot.rows.map((item, i) => (
          <div key={item} className="flex items-center gap-2 mb-2 last:mb-0">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: i === 0 ? shot.accent : "rgba(255,255,255,0.28)" }} />
            <span className="text-[9px] text-white/82 flex-1" dangerouslySetInnerHTML={{ __html: item }} />
            {i === 0 && <Check className="h-3 w-3 text-emerald-400" />}
          </div>
        ))}
      </div>
      <div className="rounded-2xl px-3 py-2.5 mt-auto" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <p className="text-[9px] text-white/82 leading-snug">Personalized by AMY for your child&apos;s age and stage.</p>
      </div>
    </div>
  );
}

function ScreenshotCarousel() {
  const [active, setActive] = useState(0);
  const shot = SCREENSHOTS[active];
  const select = (index: number) => {
    setActive(index);
    trackLandingEvent("screenshot_carousel_engagement", { index, feature: SCREENSHOTS[index].id });
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">A peek inside the app</p>
        <h2 className="font-quicksand font-black text-3xl sm:text-4xl">Everything parenting needs, in one place</h2>
      </div>
      <div className="sl-glass rounded-3xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 md:gap-8 items-center">
        <div className="flex justify-center">
          <PhoneFrame>
            {shot.image ? (
              <img src={shot.image} alt={shot.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            ) : (
              <MockScreen shot={shot} />
            )}
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 42%)" }} />
          </PhoneFrame>
        </div>
        <div>
          <h3 className="font-quicksand font-black text-2xl sm:text-3xl mb-2">{shot.title}</h3>
          {shot.id === "infant" ? <div className="mb-3"><InfantFreePill /></div> : null}
          <p className="text-white/64 text-base leading-relaxed mb-6">{shot.benefit}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {SCREENSHOTS.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => select(index)}
                className={`text-left rounded-2xl px-3.5 py-2.5 transition-all ${index === active ? "bg-white text-slate-950" : "bg-white/6 text-white hover:bg-white/10"}`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-60">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-quicksand font-bold text-xs sm:text-sm leading-tight block">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ParentAmyQuestionsSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16" aria-labelledby="parent-questions-heading">
      <div className="text-center mb-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Real questions, real answers</p>
        <h2 id="parent-questions-heading" className="font-quicksand font-black text-3xl sm:text-4xl">
          Questions Parents Ask AMY Every Day
        </h2>
        <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
          The same kinds of moments families bring to AmyNest — answered with clear next steps, not generic articles.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PARENT_AMY_QUESTIONS.map((turn) => (
          <div key={turn.parent} className="sl-card rounded-2xl p-5 md:p-6">
            {turn.parent.toLowerCase().includes("baby") ? (
              <div className="mb-3">
                <InfantFreePill />
              </div>
            ) : null}
            <AmyConversation turns={[turn]} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function BuiltForFamiliesSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16" aria-labelledby="built-for-families-heading">
      <div className="sl-glass rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-0 items-stretch">
        <div className="relative min-h-[240px] lg:min-h-full">
          <img
            src={FAMILY_PHOTO}
            alt="Parent and child using AmyNest at home"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        </div>
        <div className="p-6 md:p-10 flex flex-col justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Built for real families</p>
          <h2 id="built-for-families-heading" className="font-quicksand font-black text-2xl sm:text-3xl mb-4">
            Technology should calm your day — not add another chore.
          </h2>
          <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
            AmyNest began with a frustration every parent knows: advice scattered across apps, blogs, and group chats — while mornings, meals, and bedtime still feel chaotic.
          </p>
          <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
            We built AMY so one place handles routines, infant care, nutrition, speech, and learning — guidance that adapts to your child&apos;s age instead of one-size-fits-all tips.
          </p>
          <p className="text-white/50 text-xs sm:text-sm leading-relaxed">
            Privacy first · Child-safe · No ads for kids · Free to start
          </p>
        </div>
      </div>
    </section>
  );
}

function ExitIntentModal() {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  useEffect(() => {
    const show = () => {
      if (shownRef.current) return;
      shownRef.current = true;
      setVisible(true);
      trackLandingEvent("exit_intent_shown", { trigger: "exit_or_delay" });
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 4) show();
    };
    const timer = window.setTimeout(show, 45000);
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true">
      <div className="sl-glass w-full max-w-md rounded-3xl p-6 text-center shadow-2xl">
        <img src={OFFICIAL_LOGO} alt="" className="h-14 w-14 rounded-2xl object-cover mx-auto mb-3" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300 mb-2">Before you go</p>
        <h2 className="font-quicksand font-black text-2xl mb-2">Meet AMY before you go.</h2>
        <p className="text-white/64 text-sm leading-relaxed mb-5">
          AmyNest is free to start. Set up your personalized parenting plan in under 2 minutes.
        </p>
        <StoreButtonRow location="exit_intent" />
        <button type="button" onClick={() => setVisible(false)} className="mt-4 text-xs text-white/50 underline">
          Maybe later
        </button>
      </div>
    </div>
  );
}

function ScrollCta() {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = window.scrollY / scrollable;
      const next = depth > 0.28 && depth < 0.92;
      setVisible(next);
      if (next && !shownRef.current) {
        shownRef.current = true;
        trackLandingEvent("scroll_cta_shown", {});
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`hidden md:block fixed bottom-6 right-6 z-40 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
    >
      <div className="sl-glass rounded-2xl p-3 shadow-2xl w-[min(100vw-3rem,20rem)]" style={{ borderColor: "rgba(168,85,247,0.4)" }}>
        <div className="flex items-center gap-3 mb-2.5">
          <img src={OFFICIAL_LOGO} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
          <div className="leading-tight min-w-0">
            <p className="font-quicksand font-black text-sm text-white">Start free today</p>
            <p className="text-[11px] text-white/55">Android &amp; iOS · Free</p>
          </div>
        </div>
        <StoreButtonRow size="compact" location="scroll_cta" variant="solid" />
      </div>
    </div>
  );
}

function AmyConversation({ turns, compact = false }: { turns: ChatTurn[]; compact?: boolean }) {
  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {turns.map((turn) => (
        <div key={turn.parent} className="flex flex-col gap-2">
          <div className="self-end max-w-[88%] rounded-2xl rounded-br-md px-4 py-2.5" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <p className={`${compact ? "text-[13px]" : "text-sm"} text-white/90 leading-snug`}>{turn.parent}</p>
          </div>
          <div className="self-start max-w-[92%] flex items-end gap-2">
            <span className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <div className="rounded-2xl rounded-bl-md px-4 py-2.5" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.22),rgba(99,102,241,0.18))", border: "1px solid rgba(168,85,247,0.4)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200/90 mb-0.5">AMY</p>
              <p className={`${compact ? "text-[13px]" : "text-sm"} text-white leading-snug`}>{turn.amy}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * "Try AMY in 10 Seconds" — a SAFE, frontend-only product preview.
 *
 * Hard guarantees (do not change without review):
 *  - No network requests, no fetch, no backend calls.
 *  - No OpenAI / GPT / Claude / Gemini / LLM inference. Zero token usage, zero API cost.
 *  - No free-form text input and no message submission — visitors can only tap predefined chips.
 *  - All responses come from the static, local DEMO_EXCHANGES array above.
 * This is a conversion preview, not a real chatbot or support tool.
 */
function TryAmyDemoSection() {
  // Pre-load the first realistic exchange so visitors see AMY's value with zero clicks.
  const [history, setHistory] = useState<DemoExchange[]>(() => [DEMO_EXCHANGES[0]]);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set([DEMO_EXCHANGES[0].id]));
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [history, typingId]);

  const askDemo = (exchange: DemoExchange) => {
    if (revealedIds.has(exchange.id) || typingId) return;
    // Local-only event dispatch (no network) for analytics parity with the rest of the page.
    trackLandingEvent("demo_question_click", { question_id: exchange.id });
    setRevealedIds((prev) => new Set(prev).add(exchange.id));
    setHistory((prev) => [...prev, { ...exchange, answer: "" }]);
    setTypingId(exchange.id);
    // Brief on-device "typing" for product realism. No request is in flight.
    typingTimer.current = window.setTimeout(() => {
      setHistory((prev) =>
        prev.map((item) => (item.id === exchange.id ? { ...item, answer: exchange.answer } : item)),
      );
      setTypingId(null);
    }, 550);
  };

  const hasResponse = history.some((item) => item.answer.length > 0);

  return (
    <section
      className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-16"
      aria-labelledby="try-amy-demo-heading"
    >
      <div className="text-center mb-7 md:mb-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">
          Interactive preview
        </p>
        <h2 id="try-amy-demo-heading" className="font-quicksand font-black text-3xl sm:text-4xl">
          Try AMY in 10 Seconds
        </h2>
        <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto mt-3 leading-relaxed">
          See how AMY helps with everyday parenting questions.
        </p>
        <p className="inline-flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-emerald-300/90">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          Free preview · No sign-up · Works offline
        </p>
        <p className="mt-3 flex justify-center">
          <InfantFreePill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
        </p>
        <p className="mt-2 flex justify-center">
          <PatentPendingPill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
        </p>
      </div>

      <div className="sl-glass rounded-3xl p-4 sm:p-6" style={{ borderColor: "rgba(168,85,247,0.25)" }}>
        {/* Chat header */}
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-white/10">
          <span
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="font-quicksand font-black text-sm text-white leading-tight">Chat with AMY</p>
            <p className="text-[11px] text-emerald-300">● Online · tap a question to preview</p>
          </div>
        </div>

        {/* Conversation area */}
        <div
          ref={scrollRef}
          className="flex flex-col gap-4 min-h-[180px] max-h-[340px] overflow-y-auto pr-1"
          style={{ scrollbarWidth: "thin" }}
          aria-live="polite"
        >
          {history.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 sl-fade">
                <div
                  className="self-end max-w-[88%] rounded-2xl rounded-br-md px-4 py-2.5"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)" }}
                >
                  <p className="text-[13px] sm:text-sm text-white/90 leading-snug">{item.question}</p>
                </div>
                <div className="self-start max-w-[92%] flex items-end gap-2">
                  <span
                    className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-2.5"
                    style={{
                      background: "linear-gradient(135deg,rgba(168,85,247,0.22),rgba(99,102,241,0.18))",
                      border: "1px solid rgba(168,85,247,0.4)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200/90 mb-0.5">AMY</p>
                    {typingId === item.id ? (
                      <span className="flex items-center gap-1 py-1" aria-label="AMY is typing">
                        <span className="sl-typing-dot h-1.5 w-1.5 rounded-full bg-purple-200/80" />
                        <span className="sl-typing-dot h-1.5 w-1.5 rounded-full bg-purple-200/80" />
                        <span className="sl-typing-dot h-1.5 w-1.5 rounded-full bg-purple-200/80" />
                      </span>
                    ) : (
                      <p className="text-[13px] sm:text-sm text-white leading-snug">{item.answer}</p>
                    )}
                  </div>
                </div>
            </div>
          ))}
        </div>
        {/* Suggested question chips — the ONLY way to interact. No text input by design. */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40 mb-3">Try another question</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_EXCHANGES.map((exchange) => {
              const used = revealedIds.has(exchange.id);
              return (
                <button
                  key={exchange.id}
                  type="button"
                  onClick={() => askDemo(exchange)}
                  disabled={used || typingId !== null}
                  className={`text-left text-[13px] font-semibold rounded-full px-3.5 py-2 transition-all ${
                    used
                      ? "bg-emerald-500/12 text-emerald-200/80 border border-emerald-400/25"
                      : "bg-white/6 text-white/85 border border-white/12 hover:bg-white/12 hover:border-purple-400/40 active:scale-[0.97]"
                  } ${typingId !== null && !used ? "opacity-50" : ""}`}
                  aria-pressed={used}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {used && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    {exchange.question}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA — appears after the first AMY response */}
      {hasResponse && (
        <div
          className="sl-fade mt-6 rounded-3xl px-5 py-6 sm:px-8 sm:py-7 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.1) 100%)",
            border: "1px solid rgba(168,85,247,0.28)",
          }}
        >
          <p className="font-quicksand font-black text-xl sm:text-2xl text-white mb-1.5">
            Get personalized guidance inside AmyNest.
          </p>
          <p className="text-white/60 text-sm max-w-md mx-auto mb-5 leading-relaxed">
            This is a preview. In the app, AMY tailors every answer to your child&apos;s age and stage.
          </p>
          <div className="max-w-lg mx-auto">
            <StoreButtonRow location="try_amy_demo" />
          </div>
        </div>
      )}
    </section>
  );
}

export default function SocialLandingPage() {
  const target = useStoreTarget();
  const primaryStore = getStoreMeta(target);
  const scrollDepths = useRef(new Set<number>());

  useEffect(() => {
    document.title = "AmyNest — Turn Parenting Chaos Into Calm Daily Wins";
    const description =
      "AmyNest helps you turn chaotic days into calm wins. Meet AMY for routines, infant care, nutrition, speech and learning from birth through age 10+. Free on Android & iOS.";
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('link[rel="canonical"]', "href", "https://www.amynest.in/get-app");
    setMetaTag('meta[property="og:title"]', "content", "Turn Parenting Chaos Into Calm Daily Wins — AmyNest");
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    setMetaTag('meta[property="og:type"]', "content", "website");
    setMetaTag('meta[property="og:url"]', "content", "https://www.amynest.in/get-app");
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", "Turn Parenting Chaos Into Calm Daily Wins — AmyNest");
    setMetaTag('meta[name="twitter:description"]', "content", description);
    setMetaTag('meta[name="twitter:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    trackLandingEvent("landing_page_view", { store_target: target });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = Math.round((window.scrollY / scrollable) * 100);
      [25, 50, 75, 100].forEach((marker) => {
        if (depth >= marker && !scrollDepths.current.has(marker)) {
          scrollDepths.current.add(marker);
          trackLandingEvent("scroll_depth", { percent: marker });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openPrimaryStore = () => {
    trackLandingEvent("install_intent", { store: target, location: "hero_primary" });
    window.open(primaryStore.href, "_blank", "noopener,noreferrer");
  };

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MobileApplication",
          name: "AmyNest",
          operatingSystem: "ANDROID, IOS",
          applicationCategory: "LifestyleApplication",
          description:
            "AmyNest is an AI parenting operating system with AMY AI assistant, AI routine generator, infant parenting hub, nutrition hub, speech coach, phonics, spelling, abacus, discovery worlds, worksheets, stories and audio lessons for children from birth to age 10+.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          installUrl: PLAY_STORE_URL,
          downloadUrl: PLAY_STORE_URL,
          featureList: [
            "AMY AI Parenting Assistant",
            "AI Daily Routine Generator",
            "Infant Parenting Hub",
            "Nutrition Hub",
            "Speech Coach",
            "Smart Study Zone",
            "Phonics, Spelling and Abacus",
            "Amy Sound World, Worksheets and Stories",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is AmyNest?",
              acceptedAnswer: { "@type": "Answer", text: "AmyNest is an AI-powered parenting operating system. AMY, your AI co-pilot, helps with routines, infant care, nutrition, speech and learning from birth through age 10 and beyond." },
            },
            {
              "@type": "Question",
              name: "Is AmyNest free to download?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. AmyNest is free to start on both Google Play and the App Store, with a personalized plan set up in minutes." },
            },
            {
              "@type": "Question",
              name: "What ages is AmyNest for?",
              acceptedAnswer: { "@type": "Answer", text: "AmyNest supports children from infancy through age 10 and beyond, with guidance that adapts to each stage of parenting." },
            },
            {
              "@type": "Question",
              name: "Is AmyNest safe for children?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. AmyNest is child-safe by design with no ads, no harmful content, and a privacy-first approach to your family's data." },
            },
          ],
        },
      ],
    }),
    [],
  );

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
        .sl-fade { animation: slFadeUp 0.6s ease-out both; }
        .sl-fade-1 { animation: slFadeUp 0.6s ease-out 0.08s both; }
        .sl-fade-2 { animation: slFadeUp 0.6s ease-out 0.16s both; }
        .sl-fade-3 { animation: slFadeUp 0.6s ease-out 0.24s both; }
        .sl-float { animation: slFloat 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sl-fade, .sl-fade-1, .sl-fade-2, .sl-fade-3, .sl-float, .sl-gradient-text { animation: none !important; }
        }
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
        .sl-card:hover { transform: translateY(-3px); border-color: rgba(168,85,247,0.35); box-shadow: 0 18px 45px -12px rgba(168,85,247,0.3); }
        .sl-cta {
          background: linear-gradient(135deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)));
          box-shadow: 0 12px 40px rgba(168,85,247,0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sl-cta:hover { transform: scale(1.03); box-shadow: 0 16px 48px rgba(236,72,153,0.5); }
        @keyframes slTyping { 0%,60%,100% { opacity:0.25; transform:translateY(0); } 30% { opacity:1; transform:translateY(-2px); } }
        .sl-typing-dot { animation: slTyping 1.1s ease-in-out infinite; }
        .sl-typing-dot:nth-child(2) { animation-delay: 0.18s; }
        .sl-typing-dot:nth-child(3) { animation-delay: 0.36s; }
        @media (prefers-reduced-motion: reduce) { .sl-typing-dot { animation: none !important; } }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-30" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.5),transparent 68%)" }} />
        <div className="absolute top-[20%] -right-32 w-[420px] h-[420px] rounded-full opacity-22" style={{ background: "radial-gradient(circle,rgba(99,102,241,0.45),transparent 68%)" }} />
        <div className="absolute bottom-[15%] left-[8%] w-[360px] h-[360px] rounded-full opacity-18" style={{ background: "radial-gradient(circle,rgba(236,72,153,0.35),transparent 68%)" }} />
      </div>

      <header className="sticky top-0 z-30 sl-glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={OFFICIAL_LOGO} alt="AmyNest AI" className="h-10 w-10 rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <span className="font-quicksand font-black text-base sm:text-lg truncate block">AmyNest</span>
              <span className="hidden sm:block text-[10px] uppercase tracking-widest text-purple-200/70 font-bold">
                Patent-Pending · AI Parenting OS
              </span>
            </div>
          </div>
          <div className="shrink-0 w-[min(100%,17.5rem)] sm:w-auto sm:max-w-xs">
            <StoreButtonRow size="compact" location="header" variant="solid" />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <p className="sl-fade inline-flex items-center gap-2 sl-glass px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              AI-Powered Parenting Operating System
            </p>
            <div className="sl-fade mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <PatentPendingPill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
            </div>
            <h1 className="sl-fade-1 font-quicksand font-black text-[2.1rem] sm:text-5xl lg:text-[3.1rem] leading-[1.08] tracking-tight mb-4">
              {HERO_HEADLINE_LEAD}{" "}
              <span className="sl-gradient-text">{HERO_HEADLINE_ACCENT}</span>
            </h1>
            <p className="sl-fade-2 text-white/70 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-4">
              Meet AMY — clear next steps for routines, infant care, meals, speech and learning, from birth through age 10+.
            </p>
            <p className="sl-fade-2 mb-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <InfantFreePill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
            </p>

            <div className="sl-fade-3 max-w-lg mx-auto lg:mx-0 mb-5">
              <StoreButtonRow location="hero" />
            </div>

            <div className="sl-fade-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-[12px] text-white/55">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />Free to start</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-purple-300" />Privacy first</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-sky-300" />Child-safe</span>
              <span className="inline-flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5 text-pink-300" />No ads for kids</span>
            </div>
          </div>

          {/* AMY AI showcase */}
          <div className="sl-fade-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[400px]">
              <div className="sl-glass rounded-[2rem] p-5 shadow-2xl sl-float" style={{ boxShadow: "0 28px 70px rgba(0,0,0,0.5), 0 0 50px rgba(168,85,247,0.18)" }}>
                <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-white/10">
                  <span className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="font-quicksand font-black text-sm text-white">Chat with AMY</p>
                    <p className="text-[11px] text-emerald-300">● Online · your parenting co-pilot</p>
                  </div>
                </div>
                <AmyConversation turns={AMY_CHAT.slice(0, 2)} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-2">
        <div className="sl-glass rounded-2xl px-3 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5">
          {TRUST_BAR.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 text-[12px] sm:text-sm font-semibold text-white/75">
              <Icon className="h-4 w-4 text-purple-300 shrink-0" />
              {label}
            </span>
          ))}
        </div>
      </section>

      <SeeAmyNestInActionSection />

      <TryAmyDemoSection />

      <AppScreenshotStrip />

      <InstallOnboardingSection onStartFree={openPrimaryStore} />

      {/* FLAGSHIP — MEET AMY */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">The heart of AmyNest</p>
          <div className="mb-3 flex justify-center">
            <PatentPendingPill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
          </div>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl md:text-5xl mb-3">Meet AMY — Your AI Parenting Co-Pilot</h2>
          <p className="text-white/65 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Ask anything, any time. AMY turns your real parenting moments into clear, personalized next steps.
          </p>
        </div>
        <div className="sl-glass rounded-3xl p-5 md:p-8 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center" style={{ borderColor: "rgba(168,85,247,0.25)" }}>
          <div className="text-center lg:text-left">
            <div className="inline-flex h-16 w-16 rounded-2xl items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", boxShadow: "0 16px 40px rgba(168,85,247,0.4)" }}>
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-quicksand font-black text-2xl sm:text-3xl mb-3">Guidance that feels magical.</h3>
            <p className="text-white/64 text-base leading-relaxed mb-6">
              From a crying newborn to a child who won&apos;t study, AMY understands the moment and responds with a plan you can use right now — no searching, no guesswork.
            </p>
            <div className="mb-6">
              <InfantFreePill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
            </div>
            <div className="max-w-sm mx-auto lg:mx-0">
              <StoreButtonRow location="flagship_amy" />
            </div>
          </div>
          <div className="rounded-[1.75rem] p-5 md:p-6" style={{ background: "linear-gradient(160deg,#120f20,#1b1733)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <AmyConversation turns={AMY_CHAT} />
          </div>
        </div>
      </section>

      {/* ONE APP FOR EVERY STAGE */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Grows with your child</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">One App for Every Stage of Parenting</h2>
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4">
          <div aria-hidden className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.5),rgba(34,197,94,0.5),transparent)" }} />
          {STAGES.map((stage) => (
            <div key={stage.range} className="sl-card rounded-2xl p-5 relative">
              {stage.range === "0–2 Years" ? (
                <div className="absolute top-3 right-3 z-20">
                  <InfantFreePill />
                </div>
              ) : null}
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 relative z-10" style={{ background: stage.gradient, boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>
                <stage.icon className="h-6 w-6 text-white" />
              </div>
              <p className="font-quicksand font-black text-xl text-white">{stage.range}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-purple-300/70 mb-3">{stage.label}</p>
              <ul className="space-y-2">
                {stage.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-white/75 text-sm">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-9 max-w-lg mx-auto">
          <StoreButtonRow location="every_stage" />
        </div>
      </section>

      {/* COMPARISON */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Not just a learning app</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-3">Why Families Choose AmyNest</h2>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            AmyNest is a complete parenting and child-development platform — not just another learning app.
          </p>
        </div>
        <div className="sl-glass rounded-3xl overflow-hidden">
          <div className="grid grid-cols-[1fr_4.5rem_5rem] sm:grid-cols-[1fr_9rem_9rem] items-stretch border-b border-white/10">
            <span className="px-4 sm:px-6 py-4 text-white/50 text-xs sm:text-sm font-bold uppercase tracking-wide self-center">Capability</span>
            <span className="px-1 py-4 text-white/45 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center leading-tight self-center">Typical Learning Apps</span>
            <span className="px-1 py-4 text-center text-[11px] sm:text-sm font-black uppercase tracking-wide text-white self-center" style={{ background: "linear-gradient(160deg,rgba(168,85,247,0.32),rgba(99,102,241,0.18))" }}>AmyNest</span>
          </div>
          {COMPARISON_ROWS.map((row, i) => (
            <div key={row.label} className="grid grid-cols-[1fr_4.5rem_5rem] sm:grid-cols-[1fr_9rem_9rem] items-stretch">
              <span className={`px-4 sm:px-6 py-3.5 text-white/85 text-sm font-medium self-center ${i % 2 ? "bg-white/[0.02]" : ""}`}>{row.label}</span>
              <span className={`flex items-center justify-center py-3.5 ${i % 2 ? "bg-white/[0.02]" : ""}`}>
                {row.them ? (
                  <Check className="h-4 w-4 text-white/35" />
                ) : (
                  <X className="h-5 w-5 text-white/25" />
                )}
              </span>
              <span className="flex items-center justify-center py-3.5" style={{ background: "linear-gradient(160deg,rgba(168,85,247,0.12),rgba(99,102,241,0.07))" }}>
                <span className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-400" />
                </span>
              </span>
            </div>
          ))}
          <div className="px-4 sm:px-6 py-4 text-center border-t border-white/10" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.1),rgba(236,72,153,0.06))" }}>
            <p className="font-quicksand font-bold text-sm sm:text-base text-white">One app for parenting, learning and child development — ages 0–10+.</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-purple-300/80">{PATENT_TRUST_LINE}</p>
          </div>
        </div>
        <div className="mt-9 max-w-lg mx-auto">
          <StoreButtonRow location="comparison" />
        </div>
      </section>

      <InfantParentingSection page="get-app" />

      {/* PROBLEM -> SOLUTION */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Sound familiar?</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-3">From everyday struggles to everyday wins</h2>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto">Every parenting challenge below has a clear answer inside AmyNest.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PAIN_SOLUTIONS.map((row) => (
            <div key={row.pain} className="sl-card rounded-2xl p-5 sm:p-6">
              {row.pain.toLowerCase().includes("baby") ? (
                <div className="mb-3">
                  <InfantFreePill />
                </div>
              ) : null}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/10">
                <span className="h-7 w-7 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0"><X className="h-4 w-4 text-rose-400" /></span>
                <p className="text-white/70 text-sm font-medium pt-0.5">{row.pain}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0"><Check className="h-4 w-4 text-emerald-400" /></span>
                <p className="text-white text-sm font-medium pt-0.5">{row.solution}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 max-w-lg mx-auto">
          <StoreButtonRow location="problem_solution" />
        </div>
      </section>

      {/* OUTCOME FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Outcomes, not features</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">What AmyNest actually does for your family</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTCOME_FEATURES.map((f) => (
            <div key={f.title} className="sl-card rounded-2xl p-5 md:p-6">
              {f.icon === Baby ? (
                <div className="mb-3">
                  <InfantFreePill />
                </div>
              ) : null}
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.gradient, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-quicksand font-bold text-lg text-white mb-2 leading-snug">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ScreenshotCarousel />

      <ParentAmyQuestionsSection />

      <BuiltForFamiliesSection />

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-28 md:pb-16">
        <div
          className="sl-glass rounded-3xl px-6 py-10 md:px-12 md:py-14 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.1) 100%)", borderColor: "rgba(168,85,247,0.28)" }}
        >
          <img src={OFFICIAL_LOGO} alt="" className="h-16 w-16 rounded-2xl object-cover mx-auto mb-5 shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.4)" }} />
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl md:text-[2.75rem] mb-3 leading-tight">Start Your Child&apos;s Growth Journey Today</h2>
          <p className="text-white/65 text-base sm:text-lg max-w-xl mx-auto mb-7 leading-relaxed">
            Parenting, Learning and Daily Guidance — all powered by AMY.
          </p>
          <div className="mb-6 flex justify-center">
            <PatentPendingPill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
          </div>
          <div className="max-w-lg mx-auto mb-4">
            <StoreButtonRow size="large" location="final_cta" />
          </div>
          <p className="text-white/45 text-xs">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* STICKY MOBILE INSTALL BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden sl-glass border-t border-white/10 px-3 py-2">
        <StoreButtonRow size="compact" location="sticky_mobile" variant="solid" />
      </div>

      <ScrollCta />
      <ExitIntentModal />

      <footer className="relative z-10 px-4 py-6 border-t border-white/10 text-center">
        <p className="text-xs text-white/45 text-center">
          © {new Date().getFullYear()} AmyNest AI · <span className="text-purple-300/80 font-semibold">Patent Pending Technology</span> · Privacy First · Free To Start
        </p>
      </footer>
    </div>
  );
}


