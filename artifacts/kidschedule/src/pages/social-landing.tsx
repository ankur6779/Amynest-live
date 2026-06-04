import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Mic,
  GraduationCap,
  BookOpen,
  Calculator,
  Baby,
  Sparkles,
  ShieldCheck,
  Lock,
  EyeOff,
  HeartHandshake,
  Play,
  Pause,
  Check,
  X,
  Quote,
} from "lucide-react";
import { InfantParentingSection } from "@/components/marketing/infant-parenting-section";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";

const OFFICIAL_LOGO = "/amynest-logo-new.png";
const OG_IMAGE = "/opengraph.jpg";
const PROMO_IMAGE = "/promo/amynest-tap-to-download.png";

type StoreTarget = "android" | "ios";
type LandingEventName =
  | "landing_page_view"
  | "store_button_click"
  | "install_intent"
  | "scroll_depth"
  | "screenshot_carousel_engagement"
  | "demo_video_engagement"
  | "scroll_cta_shown"
  | "exit_intent_shown";

function trackLandingEvent(
  event: LandingEventName,
  meta: Record<string, string | number | boolean | undefined> = {},
) {
  if (typeof window === "undefined") return;
  const payload = { event, page: "get-app", path: window.location.pathname, ...meta };
  window.dispatchEvent(new CustomEvent("amynest_landing_event", { detail: payload }));
  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (type: string, name: string, params?: Record<string, unknown>) => void;
  };
  analyticsWindow.dataLayer?.push(payload);
  analyticsWindow.gtag?.("event", event, payload);
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
  const pad = size === "large" ? "px-7 py-4" : size === "compact" ? "px-4 py-2.5" : "px-6 py-3.5";
  const icon = size === "large" ? "h-8 w-8" : "h-7 w-7";
  const title = size === "large" ? "text-lg" : "text-base";
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
      className={`flex flex-1 items-center justify-center sm:justify-start gap-3 ${pad} rounded-2xl transition-all hover:scale-[1.02]`}
      style={{ ...bg, textDecoration: "none" }}
    >
      <StoreIcon target={target} className={`${icon} shrink-0 ${textClass}`} />
      {children ?? (
        <div className="text-left leading-tight">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${subClass}`}>{store.eyebrow}</p>
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
}: {
  size?: "default" | "large";
  location: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full">
      <StoreButton target="android" size={size} location={`${location}_android`} />
      <StoreButton target="ios" size={size} location={`${location}_ios`} />
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

const TESTIMONIALS = [
  {
    quote: "My daughter now practices reading daily — without me nagging. AmyNest turned it into something she actually looks forward to.",
    name: "Priya S.",
    role: "Mom of a 6-year-old",
  },
  {
    quote: "Speech Coach improved her pronunciation dramatically in a few weeks. I finally feel like I have real guidance, not random YouTube videos.",
    name: "Daniel R.",
    role: "Dad of a 4-year-old",
  },
  {
    quote: "Amy feels like a parenting co-pilot. Routines, learning, meals — it&apos;s all in one place and tailored to my son.",
    name: "Aisha K.",
    role: "First-time mom",
  },
  {
    quote: "Less screen-time guilt. The time he spends in the app actually teaches him something. That peace of mind is worth everything.",
    name: "Marcus T.",
    role: "Working dad of two",
  },
] as const;

const TRUST_INDICATORS = [
  { value: "1,000+", label: "Learning activities" },
  { value: "AI", label: "Powered guidance" },
  { value: "0–10+", label: "Built for every age" },
  { value: "100%", label: "Child-safe content" },
] as const;

const PAIN_SOLUTIONS = [
  {
    pain: "Hours lost to random, low-value videos",
    solution: "Turns screen time into guided, age-appropriate learning your child enjoys.",
  },
  {
    pain: "Reading and phonics struggles",
    solution: "Daily phonics and reading sessions that build confidence one win at a time.",
  },
  {
    pain: "Speech and pronunciation worries",
    solution: "Speech Coach gives gentle, structured practice that grows real confidence.",
  },
  {
    pain: "You never know which activity to pick",
    solution: "AMY recommends the next best activity based on your child's age and progress.",
  },
  {
    pain: "Overwhelmed by infant care decisions",
    solution: "Infant Parenting guidance for cries, sleep, feeding, growth and milestones.",
  },
  {
    pain: "Unsure what's healthy to feed your kids",
    solution: "Nutrition Hub makes balanced meals and snacks simple, with less decision fatigue.",
  },
] as const;

const OUTCOME_FEATURES = [
  {
    icon: Sparkles,
    title: "Get an Always-On AI Parenting Partner",
    desc: "AMY answers your parenting questions and suggests the next best step for your child — day or night.",
    gradient: "linear-gradient(135deg,#a855f7,#ec4899)",
  },
  {
    icon: Mic,
    title: "Help Your Child Speak Clearly and Confidently",
    desc: "Speech Coach guides daily pronunciation practice that builds real communication confidence.",
    gradient: "linear-gradient(135deg,#7c3aed,#a855f7)",
  },
  {
    icon: BookOpen,
    title: "Build Reading Confidence, One Session at a Time",
    desc: "Phonics and reading practice designed for your child's stage, so progress feels achievable.",
    gradient: "linear-gradient(135deg,#f97316,#ec4899)",
  },
  {
    icon: GraduationCap,
    title: "Make Study Time Focused and Stress-Free",
    desc: "Smart Study Zone keeps learning organized with the right activity at the right moment.",
    gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)",
  },
  {
    icon: Calculator,
    title: "Turn Math Into a Game They Want to Play",
    desc: "Abacus and smart math tricks build number confidence through playful, hands-on practice.",
    gradient: "linear-gradient(135deg,#10b981,#22c55e)",
  },
  {
    icon: Baby,
    title: "Feel Calm and Capable as a New Parent",
    desc: "Infant Parenting and Nutrition Hub give trusted, practical guidance for those early years.",
    gradient: "linear-gradient(135deg,#6366f1,#06b6d4)",
  },
] as const;

const BENEFITS = [
  { icon: GraduationCap, title: "Better learning habits", desc: "Consistent, bite-sized sessions that stick." },
  { icon: HeartHandshake, title: "Less educational stress", desc: "AMY tells you exactly what to do next." },
  { icon: Sparkles, title: "Guided daily activities", desc: "Never wonder what to do with your child today." },
  { icon: ShieldCheck, title: "A safe digital space", desc: "No ads, no harmful content, just learning." },
  { icon: Mic, title: "Personalized support", desc: "Everything adapts to your child's age and pace." },
  { icon: EyeOff, title: "Screen time you trust", desc: "Time on the app actually teaches something." },
] as const;

const TRUST_CARDS = [
  { icon: Lock, title: "Privacy first", desc: "Your family's data is protected and never sold." },
  { icon: ShieldCheck, title: "Child-safe by design", desc: "Every experience is built for young children." },
  { icon: EyeOff, title: "No harmful content", desc: "No ads, no autoplay rabbit holes, no surprises." },
  { icon: HeartHandshake, title: "Parent-focused", desc: "You stay in control, with guidance every step." },
] as const;

const STEPS = [
  { title: "Tell AMY about your child", desc: "Age, goals and a few daily challenges — that's it." },
  { title: "Get a personalized plan", desc: "Routines, learning, speech and meals tailored instantly." },
  { title: "Build better habits", desc: "Simple daily actions your whole family can follow." },
  { title: "Watch confidence grow", desc: "Track streaks, progress and your child's next wins." },
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
  { id: "amy", title: "AMY AI Assistant", benefit: "Your always-on parenting co-pilot for instant, personalized guidance.", accent: "#a855f7", image: "/promo/social/reels/amy-coach.png", rows: ["Ask Amy anything", "Next best activity", "Parenting tips", "Daily check-in"] },
  { id: "speech", title: "Speech Coach", benefit: "Help your child speak clearly and confidently with guided practice.", accent: "#f59e0b", image: "/promo/social/reels/speech-coach.png", rows: ["Warm-up sounds", "Practice words", "Confidence streak", "Parent summary"] },
  { id: "audio", title: "Amy Coach Audio Lessons", benefit: "Screen-free audio lessons your child can learn from anywhere.", accent: "#38bdf8", rows: ["Today&apos;s audio lesson", "Listen & repeat", "Story-led learning", "Hands-free play"] },
  { id: "study", title: "Smart Study Zone", benefit: "Keep learning focused with the right activity at the right time.", accent: "#3b82f6", image: "/promo/social/reels/learning-zone.png", rows: ["Daily study path", "Focus session", "Skill builder", "Progress saved"] },
  { id: "phonics", title: "Phonics Learning", benefit: "Build reading confidence one playful phonics session at a time.", accent: "#ec4899", rows: ["Letter sounds", "Blend & read", "Sight words", "Reading streak"] },
  { id: "abacus", title: "Abacus & Math Tricks", benefit: "Turn numbers into a game with hands-on math practice.", accent: "#22c55e", rows: ["Bead counting", "Quick math tricks", "Mental math", "Level up"] },
  { id: "pdf", title: "Daily PDF Worksheets", benefit: "Download fresh printable worksheets for offline practice every day.", accent: "#f97316", rows: ["Today&apos;s worksheet", "Tap to download", "Print & practice", "New set daily"] },
  { id: "spelling", title: "Spelling Mastery", benefit: "Grow a strong vocabulary with adaptive spelling challenges.", accent: "#8b5cf6", rows: ["Word of the day", "Spell & check", "Tricky words", "Mastery badge"] },
  { id: "videos", title: "Bedtime & Art Videos", benefit: "Calm bedtime stories plus art and craft videos kids love.", accent: "#06b6d4", rows: ["Bedtime story", "Art & craft", "Calm wind-down", "Safe playlist"] },
  { id: "infant", title: "Infant Parenting", benefit: "Trusted guidance for cries, sleep, feeding and milestones.", accent: "#f472b6", image: "/promo/infant-parenting/appstore-02-baby-today.jpg", rows: ["Cry insight", "Today&apos;s care", "Growth tracking", "Milestones"] },
];

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[250px] rounded-[2.2rem] overflow-hidden"
      style={{
        aspectRatio: "9/19",
        border: "2px solid rgba(255,255,255,0.16)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 50px rgba(168,85,247,0.18)",
        background: "#0d0b16",
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10 bg-black/80" />
      {children}
    </div>
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
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">A peek inside</p>
        <h2 className="font-quicksand font-black text-3xl sm:text-4xl">Everything your child needs to learn and grow</h2>
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

function DemoVideo({ onPrimaryCta }: { onPrimaryCta: () => void }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackedMilestones = useRef(new Set<string>());

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
      trackLandingEvent("demo_video_engagement", { action: "play" });
    } else {
      video.pause();
      setPlaying(false);
      trackLandingEvent("demo_video_engagement", { action: "pause" });
    }
  };

  return (
    <section id="demo" className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14 scroll-mt-24">
      <div className="sl-glass rounded-3xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[0.95fr_1fr] gap-6 items-center">
        <div className="relative overflow-hidden rounded-[2rem] min-h-[360px] md:min-h-[460px]" style={{ background: "linear-gradient(160deg,#151024,#080711)" }}>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            autoPlay
            muted
            playsInline
            poster={PROMO_IMAGE}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (!video.duration || Number.isNaN(video.duration)) return;
              const progress = video.currentTime / video.duration;
              if (progress >= 0.5 && !trackedMilestones.current.has("50")) {
                trackedMilestones.current.add("50");
                trackLandingEvent("demo_video_engagement", { action: "50_percent" });
              }
            }}
            onEnded={() => trackLandingEvent("demo_video_engagement", { action: "complete" })}
          >
            <source src="/promo/get-app/demo-15s.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            type="button"
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl"
            aria-label={playing ? "Pause demo video" : "Play demo video"}
          >
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
          </button>
          <div className="absolute left-5 right-5 bottom-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200 mb-2">15 Second Demo</p>
            <h2 className="font-quicksand font-black text-2xl sm:text-3xl">See it before you install.</h2>
          </div>
        </div>
        <div className="px-2 md:px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300 mb-3">From download to daily habits</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-4">A personalized learning plan in minutes.</h2>
          <p className="text-white/64 text-base leading-relaxed mb-6">
            AmyNest AI turns your child&apos;s age and goals into routines, learning, speech practice, and meal support you can use right away.
          </p>
          <button type="button" onClick={onPrimaryCta} className="sl-cta inline-flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-white">
            Start Your Child&apos;s Free Plan
            <ArrowRight className="h-4 w-4" />
          </button>
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
        <h2 className="font-quicksand font-black text-2xl mb-2">Give your child an AI learning head start.</h2>
        <p className="text-white/64 text-sm leading-relaxed mb-5">
          AmyNest is free to start. Set up your child&apos;s personalized plan in under 2 minutes.
        </p>
        <StoreButtonRow location="exit_intent" />
        <button type="button" onClick={() => setVisible(false)} className="mt-4 text-xs text-white/50 underline">
          Maybe later
        </button>
      </div>
    </div>
  );
}

function ScrollCta({ target }: { target: StoreTarget }) {
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
      <div className="sl-glass rounded-2xl p-3 flex items-center gap-3 shadow-2xl" style={{ borderColor: "rgba(168,85,247,0.4)" }}>
        <img src={OFFICIAL_LOGO} alt="" className="h-11 w-11 rounded-xl object-cover" />
        <div className="leading-tight pr-1">
          <p className="font-quicksand font-black text-sm text-white">Start free today</p>
          <p className="text-[11px] text-white/55">Android &amp; iOS · Free</p>
        </div>
        <StoreButton target={target} location="scroll_cta" size="compact" variant="solid">
          <span className="text-xs font-bold text-slate-900">Install</span>
        </StoreButton>
      </div>
    </div>
  );
}

export default function SocialLandingPage() {
  const target = useStoreTarget();
  const primaryStore = getStoreMeta(target);
  const scrollDepths = useRef(new Set<number>());

  useEffect(() => {
    document.title = "Get AmyNest AI — Your AI Parenting & Learning Partner";
    const description =
      "AmyNest AI turns everyday screen time into learning time. AMY guides routines, phonics, speech, study, nutrition and infant care for kids 0–10+. Free to start on Android & iOS.";
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('link[rel="canonical"]', "href", "https://www.amynest.in/get-app");
    setMetaTag('meta[property="og:title"]', "content", "Raise Smarter, Happier Kids With Your AI Parenting Partner");
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    setMetaTag('meta[property="og:type"]', "content", "website");
    setMetaTag('meta[property="og:url"]', "content", "https://www.amynest.in/get-app");
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", "Raise Smarter, Happier Kids With AmyNest AI");
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

  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
    trackLandingEvent("demo_video_engagement", { action: "scroll_to_demo" });
  };

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
          name: "AmyNest AI",
          operatingSystem: "ANDROID, IOS",
          applicationCategory: "EducationApplication",
          description:
            "AI-powered parenting and learning platform with AMY AI assistant, Speech Coach, phonics, smart study, abacus, spelling, infant parenting and nutrition for children 0–10+.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          installUrl: PLAY_STORE_URL,
          downloadUrl: PLAY_STORE_URL,
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is AmyNest free to download?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. AmyNest AI is free to start on both Google Play and the App Store, with a personalized plan set up in minutes." },
            },
            {
              "@type": "Question",
              name: "What ages is AmyNest for?",
              acceptedAnswer: { "@type": "Answer", text: "AmyNest supports children from infancy through age 10 and beyond, with content that adapts to each child's stage." },
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
              <span className="font-quicksand font-black text-base sm:text-lg truncate block">AmyNest AI</span>
              <span className="hidden sm:block text-[10px] uppercase tracking-widest text-purple-200/70 font-bold">AI Parenting &amp; Learning</span>
            </div>
          </div>
          <StoreButton target={target} location="header" size="compact" variant="solid">
            <span className="text-xs sm:text-sm font-bold text-slate-900">Install Free</span>
          </StoreButton>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-12 md:pt-14 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <p className="sl-fade inline-flex items-center gap-2 sl-glass px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              Patent Pending AI Parenting Platform
            </p>
            <h1 className="sl-fade-1 font-quicksand font-black text-[2.1rem] sm:text-5xl lg:text-[3.25rem] leading-[1.06] tracking-tight mb-4">
              Raise Smarter, Happier Kids With Your{" "}
              <span className="sl-gradient-text">AI Parenting Partner</span>
            </h1>
            <p className="sl-fade-2 text-white/70 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6">
              AmyNest turns everyday screen time into learning time — guiding routines, reading, speech and study, all personalized to your child.
            </p>

            <div className="sl-fade-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 text-sm text-white/70 font-semibold">
                <Sparkles className="h-4 w-4 text-purple-300" />
                Now on Android &amp; iOS
              </span>
              <span className="hidden sm:block h-4 w-px bg-white/15" />
              <span className="inline-flex items-center gap-1.5 text-sm text-white/70 font-semibold">
                <HeartHandshake className="h-4 w-4 text-pink-300" />
                Free to start in minutes
              </span>
            </div>

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

          <div className="sl-fade-2 flex justify-center lg:justify-end sl-float">
            <div className="relative max-w-[360px]">
              <img src={PROMO_IMAGE} alt="AmyNest AI app preview" className="rounded-[2rem] shadow-2xl border border-white/10" loading="eager" />
              <div className="absolute -bottom-4 -left-4 sl-glass rounded-2xl px-4 py-3 shadow-2xl">
                <p className="text-[10px] text-white/55 uppercase tracking-wide font-bold mb-1">AMY AI</p>
                <p className="text-[11px] font-bold text-white">Personalized in minutes</p>
              </div>
              <div className="absolute -top-4 -right-2 sl-glass rounded-2xl px-4 py-3 shadow-2xl">
                <p className="text-[10px] text-white/55 uppercase tracking-wide font-bold">Today</p>
                <p className="text-[11px] font-bold text-white">Reading practice ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUST_INDICATORS.map((item) => (
            <div key={item.label} className="sl-card rounded-2xl p-5 text-center">
              <p className="font-quicksand font-black text-2xl sm:text-3xl sl-gradient-text">{item.value}</p>
              <p className="text-white/60 text-xs sm:text-sm font-semibold mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Loved by real parents</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">What parents are saying</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTIMONIALS.map((review) => (
            <figure key={review.name} className="sl-card rounded-2xl p-6 relative">
              <Quote className="h-7 w-7 text-purple-400/40 mb-3" aria-hidden />
              <blockquote className="text-white/85 text-base leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: `&ldquo;${review.quote}&rdquo;` }} />
              <figcaption className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-quicksand font-bold text-sm text-white">{review.name}</p>
                  <p className="text-white/50 text-xs">{review.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
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

      <DemoVideo onPrimaryCta={openPrimaryStore} />

      {/* OUTCOME FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Everything in one app</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">Real outcomes for your child</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTCOME_FEATURES.map((f) => (
            <div key={f.title} className="sl-card rounded-2xl p-5 md:p-6">
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

      {/* WHY PARENTS LOVE AMYNEST */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Why parents love AmyNest</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">Less stress. More growth.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="sl-card rounded-2xl p-5 flex items-start gap-3.5">
              <span className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.28)" }}>
                <b.icon className="h-5 w-5 text-purple-200" />
              </span>
              <div>
                <h3 className="font-quicksand font-bold text-base text-white mb-1">{b.title}</h3>
                <p className="text-white/58 text-sm leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-14">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Peace of mind</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">Safe, private, parent-controlled</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUST_CARDS.map((c) => (
            <div key={c.title} className="sl-card rounded-2xl p-5 text-center">
              <div className="mx-auto h-11 w-11 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.28)" }}>
                <c.icon className="h-5 w-5 text-purple-200" />
              </div>
              <h3 className="font-quicksand font-bold text-sm text-white mb-1">{c.title}</h3>
              <p className="text-white/55 text-xs leading-snug">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-14">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Set up in minutes</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl">What happens after you install</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="sl-card rounded-2xl p-5">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4 font-quicksand font-black text-lg sl-gradient-text" style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.28)" }}>
                {index + 1}
              </div>
              <h3 className="font-quicksand font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-white/56 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-28 md:pb-16">
        <div
          className="sl-glass rounded-3xl px-6 py-10 md:px-12 md:py-14 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.1) 100%)", borderColor: "rgba(168,85,247,0.28)" }}
        >
          <img src={OFFICIAL_LOGO} alt="" className="h-16 w-16 rounded-2xl object-cover mx-auto mb-5 shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.4)" }} />
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl md:text-[2.75rem] mb-3 leading-tight">Start Your Child&apos;s Learning Journey Today</h2>
          <p className="text-white/65 text-base sm:text-lg max-w-xl mx-auto mb-7 leading-relaxed">
            Download AmyNest and give your child an AI-powered learning companion — free to start.
          </p>
          <div className="max-w-lg mx-auto mb-4">
            <StoreButtonRow size="large" location="final_cta" />
          </div>
          <p className="text-white/45 text-xs">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* STICKY MOBILE INSTALL BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden sl-glass border-t border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <img src={OFFICIAL_LOGO} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-quicksand font-black text-sm truncate">AmyNest AI</p>
            <p className="text-[10px] text-white/55">AI parenting &amp; learning · Free</p>
          </div>
          <StoreButton target={target} location="sticky_mobile" size="compact" variant="solid">
            <span className="text-sm font-bold text-slate-900">Install</span>
          </StoreButton>
        </div>
      </div>

      <ScrollCta target={target} />
      <ExitIntentModal />

      <footer className="relative z-10 px-4 py-6 border-t border-white/10 text-center">
        <p className="text-xs text-white/35">© {new Date().getFullYear()} AmyNest AI · Patent Pending · Privacy First · Free To Start</p>
      </footer>
    </div>
  );
}


