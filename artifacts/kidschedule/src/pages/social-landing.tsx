import { useEffect, useMemo, useRef, useState } from "react";
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
  Play,
  Pause,
  Baby,
  HeartHandshake,
  LineChart,
} from "lucide-react";
import { InfantParentingSection } from "@/components/marketing/infant-parenting-section";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { useTranslation } from "react-i18next";

const OFFICIAL_LOGO = "/amynest-logo-new.png";
const OG_IMAGE = "/opengraph.jpg";
const PROMO_IMAGE = "/promo/amynest-tap-to-download.png";
const REVIEW_SCREENSHOT = "/amynest-review-info.png";

type StoreTarget = "ios" | "android";
type LandingEventName =
  | "landing_page_view"
  | "store_button_click"
  | "install_intent"
  | "scroll_depth"
  | "screenshot_carousel_engagement"
  | "demo_video_engagement"
  | "exit_intent_shown";

function trackLandingEvent(event: LandingEventName, meta: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    page: "get-app",
    path: window.location.pathname,
    ...meta,
  };
  window.dispatchEvent(new CustomEvent("amynest_landing_event", { detail: payload }));
  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (type: string, name: string, params?: Record<string, unknown>) => void;
  };
  analyticsWindow.dataLayer?.push(payload);
  analyticsWindow.gtag?.("event", event, payload);
}

function useStoreTarget(): StoreTarget {
  const [target, setTarget] = useState<StoreTarget>(() => {
    if (typeof navigator === "undefined") return "ios";
    return navigator.userAgent.toLowerCase().includes("android") ? "android" : "ios";
  });

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setTarget(ua.includes("android") ? "android" : "ios");
  }, []);

  return target;
}

function getStoreMeta(target: StoreTarget) {
  return target === "android"
    ? { href: PLAY_STORE_URL, label: "Google Play", eyebrow: "Get it on", testId: "social-google-play" }
    : { href: APP_STORE_URL, label: "App Store", eyebrow: "Download on the", testId: "social-app-store" };
}

function StoreIcon({ target, className }: { target: StoreTarget; className: string }) {
  if (target === "android") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
        <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
        <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
        <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-white`} aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function StoreButton({
  target,
  size = "default",
  location,
  children,
}: {
  target: StoreTarget;
  size?: "default" | "large" | "compact";
  location: string;
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

  return (
    <a
      href={store.href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={store.testId}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center sm:justify-start gap-3 ${pad} rounded-2xl transition-all hover:bg-white/12 hover:scale-[1.02]`}
      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}
    >
      <StoreIcon target={target} className={`${icon} shrink-0`} />
      {children ?? (
        <div className="text-left leading-tight">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">{store.eyebrow}</p>
          <p className={`text-white font-bold ${title}`}>{store.label}</p>
        </div>
      )}
    </a>
  );
}

function StoreButtons({ size = "default", location }: { size?: "default" | "large"; location: string }) {
  const target = useStoreTarget();
  const otherTarget: StoreTarget = target === "android" ? "ios" : "android";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      <StoreButton target={target} size={size} location={`${location}_primary`} />
      <StoreButton target={otherTarget} size={size} location={`${location}_secondary`} />
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

function ProductPreview({ id }: { id: ProductScreenshot["id"] }) {
  const accent = {
    routine: "#a855f7",
    learning: "#38bdf8",
    hub: "#f472b6",
    nutrition: "#22c55e",
    speech: "#f59e0b",
  }[id];
  const rows = {
    routine: ["Morning plan ready", "School prep", "Outdoor play", "Wind-down routine"],
    learning: ["Phonics practice", "Math tricks", "Life skills", "Daily study path"],
    hub: ["Ask Amy", "Parent tips", "Progress insights", "Next best action"],
    nutrition: ["Breakfast idea", "Lunchbox balance", "Veggie boost", "Hydration reminder"],
    speech: ["Warm-up sounds", "Practice words", "Confidence streak", "Parent summary"],
  }[id];

  return (
    <div
      className="relative mx-auto w-full max-w-[230px] rounded-[2rem] overflow-hidden"
      style={{
        aspectRatio: "9/19",
        background: "linear-gradient(160deg,#14121f,#1e1b35)",
        border: "2px solid rgba(255,255,255,0.14)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 50px rgba(168,85,247,0.2)",
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10 bg-black/80" />
      <div className="absolute inset-0 pt-7 px-3 pb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <img src={OFFICIAL_LOGO} alt="" className="h-7 w-7 rounded-lg object-cover" />
          <div>
            <p className="text-[10px] font-bold text-white/90">AmyNest AI</p>
            <p className="text-[8px] text-white/45">Personalized plan</p>
          </div>
        </div>
        <div className="rounded-2xl px-3 py-3" style={{ background: `${accent}24`, border: `1px solid ${accent}66` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide text-white/80 mb-2">Today&apos;s next steps</p>
          {rows.map((item, i) => (
            <div key={item} className="flex items-center gap-2 mb-2 last:mb-0">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ background: i === 0 ? accent : "rgba(255,255,255,0.28)" }} />
              <span className="text-[9px] text-white/82 flex-1">{item}</span>
              {i === 0 && <Check className="h-3 w-3 text-emerald-400" />}
            </div>
          ))}
        </div>
        <div className="rounded-2xl px-3 py-3 mt-auto" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p className="text-[10px] text-white/82 leading-snug">&quot;Amy adjusted this plan for your child&apos;s age and daily rhythm.&quot;</p>
        </div>
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
  "social_landing.pain_learning",
  "social_landing.pain_screen",
  "social_landing.pain_communication",
  "social_landing.pain_meals",
  "social_landing.pain_overwhelm",
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
  { key: "social_landing.badge_child_safe", icon: ShieldCheck },
  { key: "social_landing.badge_free", icon: Gift },
] as const;

const STATS = [
  { value: "1000+", labelKey: "social_landing.stat_activities" },
  { value: "500+", labelKey: "social_landing.stat_routines" },
  { value: "300+", labelKey: "social_landing.stat_life_skills" },
  { value: "Patent Pending", labelKey: "social_landing.stat_patent" },
] as const;

const INSTALL_STEPS = [
  { icon: Baby, titleKey: "social_landing.step_1_title", descKey: "social_landing.step_1_desc" },
  { icon: Sparkles, titleKey: "social_landing.step_2_title", descKey: "social_landing.step_2_desc" },
  { icon: HeartHandshake, titleKey: "social_landing.step_3_title", descKey: "social_landing.step_3_desc" },
  { icon: LineChart, titleKey: "social_landing.step_4_title", descKey: "social_landing.step_4_desc" },
] as const;

type ProductScreenshot = {
  id: "routine" | "learning" | "hub" | "nutrition" | "speech";
  titleKey: string;
  benefitKey: string;
  image?: string;
};

const PRODUCT_SCREENSHOTS: ProductScreenshot[] = [
  { id: "routine", titleKey: "social_landing.shot_routine_title", benefitKey: "social_landing.shot_routine_benefit", image: REVIEW_SCREENSHOT },
  { id: "learning", titleKey: "social_landing.shot_learning_title", benefitKey: "social_landing.shot_learning_benefit" },
  { id: "hub", titleKey: "social_landing.shot_hub_title", benefitKey: "social_landing.shot_hub_benefit" },
  { id: "nutrition", titleKey: "social_landing.shot_nutrition_title", benefitKey: "social_landing.shot_nutrition_benefit" },
  { id: "speech", titleKey: "social_landing.shot_speech_title", benefitKey: "social_landing.shot_speech_benefit" },
];

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
            <h2 className="font-quicksand font-black text-2xl sm:text-3xl">See the plan before you install.</h2>
          </div>
        </div>
        <div className="px-2 md:px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300 mb-3">From download to daily habits</p>
          <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-4">A personalized parenting plan in minutes.</h2>
          <p className="text-white/64 text-base leading-relaxed mb-6">
            AmyNest AI turns your child&apos;s age, goals and daily challenges into routines, learning ideas, speech practice, meal support and progress nudges parents can use right away.
          </p>
          <button type="button" onClick={onPrimaryCta} className="sl-cta inline-flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-white">
            Start Your Child&apos;s Personalized Plan
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ScreenshotCarousel({ t }: { t: (key: string) => string }) {
  const [active, setActive] = useState(0);
  const item = PRODUCT_SCREENSHOTS[active];

  const select = (index: number) => {
    setActive(index);
    trackLandingEvent("screenshot_carousel_engagement", {
      index,
      feature: PRODUCT_SCREENSHOTS[index].id,
    });
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14">
      <div className="text-center mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Product Proof</p>
        <h2 className="font-quicksand font-black text-3xl sm:text-4xl">{t("social_landing.screenshots_heading")}</h2>
      </div>
      <div className="sl-glass rounded-3xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 items-center">
        <div className="flex justify-center">
          {item.image ? (
            <img
              src={item.image}
              alt={t(item.titleKey)}
              className="w-full max-w-[300px] rounded-[2rem] object-cover shadow-2xl"
              loading="lazy"
            />
          ) : (
            <ProductPreview id={item.id} />
          )}
        </div>
        <div>
          <h3 className="font-quicksand font-black text-2xl sm:text-3xl mb-3">{t(item.titleKey)}</h3>
          <p className="text-white/64 text-base leading-relaxed mb-6">{t(item.benefitKey)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRODUCT_SCREENSHOTS.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                onClick={() => select(index)}
                className={`text-left rounded-2xl px-4 py-3 transition-all ${
                  index === active ? "bg-white text-slate-950" : "bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-60">0{index + 1}</span>
                <span className="font-quicksand font-bold text-sm">{t(shot.titleKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExitIntentModal({ target }: { target: StoreTarget }) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 py-6">
      <div className="sl-glass w-full max-w-md rounded-3xl p-6 text-center shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300 mb-2">Before You Go</p>
        <h2 className="font-quicksand font-black text-2xl mb-3">Get your child&apos;s plan first.</h2>
        <p className="text-white/64 text-sm leading-relaxed mb-5">
          AmyNest AI is free to start and helps you turn routines, learning, communication and meals into one personalized family system.
        </p>
        <StoreButton target={target} location="exit_intent" size="default">
          <div className="text-left leading-tight">
            <p className="text-white/55 text-[10px] font-semibold uppercase tracking-wide">Free to start</p>
            <p className="text-white font-bold text-base">Start Personalized Plan</p>
          </div>
        </StoreButton>
        <button type="button" onClick={() => setVisible(false)} className="mt-4 text-xs text-white/50 underline">
          Continue browsing
        </button>
      </div>
    </div>
  );
}

export default function SocialLandingPage() {
  const { t } = useTranslation();
  const target = useStoreTarget();
  const primaryStore = getStoreMeta(target);
  const scrollDepths = useRef(new Set<number>());

  useEffect(() => {
    document.title = "AmyNest AI — Patent Pending AI Parenting Platform";
    const description = t("social_landing.meta_description");
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('link[rel="canonical"]', "href", "https://www.amynest.in/get-app");
    setMetaTag('meta[property="og:title"]', "content", "Raise Smarter. Parent Easier. | AmyNest AI");
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    setMetaTag('meta[property="og:type"]', "content", "website");
    setMetaTag('meta[property="og:url"]', "content", "https://www.amynest.in/get-app");
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", "Raise Smarter. Parent Easier. | AmyNest AI");
    setMetaTag('meta[name="twitter:description"]', "content", description);
    setMetaTag('meta[name="twitter:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    trackLandingEvent("landing_page_view", { store_target: target });
  }, [t]);

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
      "@type": "MobileApplication",
      name: "AmyNest AI",
      applicationCategory: "ParentingApplication",
      operatingSystem: "iOS, Android",
      description: t("social_landing.meta_description"),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    }),
    [t],
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
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

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
              <span className="hidden sm:block text-[10px] uppercase tracking-widest text-purple-200/70 font-bold">Patent Pending AI Parenting Platform</span>
            </div>
          </div>
          <StoreButton target={target} location="header" size="compact">
            <span className="text-xs sm:text-sm font-bold text-white">Start Plan</span>
          </StoreButton>
        </div>
      </header>

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

            <p className="sl-fade text-[11px] font-black uppercase tracking-[0.22em] text-purple-200 mb-3">Patent Pending Technology</p>
            <h1 className="sl-fade-1 font-quicksand font-black text-[2rem] sm:text-5xl lg:text-[3.25rem] leading-[1.08] tracking-tight mb-4">
              {t("social_landing.hero_line1")}
              <br />
              <span className="sl-gradient-text">{t("social_landing.hero_line2")}</span>
            </h1>

            <p className="sl-fade-2 text-white/68 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-7">
              {t("social_landing.hero_sub")}
            </p>

            <div className="sl-fade-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-6">
              <button type="button" onClick={openPrimaryStore} className="sl-cta inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-white text-base">
                {t("social_landing.primary_cta")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={scrollToDemo} className="sl-glass inline-flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-2xl text-white/85 hover:text-white transition-colors text-sm">
                <Play className="h-4 w-4" />
                {t("social_landing.secondary_cta")}
              </button>
            </div>

            <div className="sl-fade-3 max-w-md mx-auto lg:mx-0">
              <StoreButtons location="hero_store_buttons" />
            </div>
          </div>

          <div className="sl-fade-2 flex justify-center lg:justify-end sl-float">
            <div className="relative max-w-[360px]">
              <img src={PROMO_IMAGE} alt="Download AmyNest AI app" className="rounded-[2rem] shadow-2xl border border-white/10" loading="eager" />
              <div className="absolute -bottom-4 left-4 right-4 sl-glass rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-white">Personalized routines, learning, speech and nutrition in one app.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InfantParentingSection page="get-app" />

      <DemoVideo onPrimaryCta={openPrimaryStore} />
      <ScreenshotCarousel t={t} />

      <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-14">
        <div className="sl-glass rounded-3xl p-6 md:p-10" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl text-center mb-3">{t("social_landing.problem_heading")}</h2>
          <p className="text-white/55 text-center text-sm sm:text-base max-w-2xl mx-auto mb-8">{t("social_landing.problem_sub")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAIN_POINTS.map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <X className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-white/85 text-sm font-medium">{t(key)}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-quicksand font-bold text-white mt-8">{t("social_landing.problem_solution")}</p>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-12 text-center scroll-mt-20">
        <img src={OFFICIAL_LOGO} alt="" className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover mx-auto mb-5 shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.4)" }} />
        <h2 className="font-quicksand font-black text-3xl sm:text-4xl mb-3">{t("social_landing.solution_heading")}</h2>
        <p className="text-white/65 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">{t("social_landing.solution_desc")}</p>
      </section>

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

      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((stat) => (
            <div key={stat.labelKey} className="sl-card rounded-2xl p-5 text-center">
              <p className="font-quicksand font-black text-2xl sm:text-3xl sl-gradient-text">{stat.value}</p>
              <p className="text-white/58 text-xs sm:text-sm font-semibold mt-1">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300/80 mb-2">Less hesitation, faster wins</p>
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl">{t("social_landing.retention_heading")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {INSTALL_STEPS.map(({ icon: Icon, titleKey, descKey }, index) => (
            <div key={titleKey} className="sl-card rounded-2xl p-5">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.28)" }}>
                <Icon className="h-5 w-5 text-purple-200" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Step {index + 1}</p>
              <h3 className="font-quicksand font-bold text-lg mb-2">{t(titleKey)}</h3>
              <p className="text-white/56 text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

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

      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-28 md:pb-14">
        <div
          className="sl-glass rounded-3xl px-6 py-10 md:px-12 md:py-12 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.08) 100%)", borderColor: "rgba(168,85,247,0.25)" }}
        >
          <h2 className="font-quicksand font-black text-2xl sm:text-3xl md:text-4xl mb-3">{t("social_landing.final_heading")}</h2>
          <p className="text-white/62 text-base max-w-xl mx-auto mb-8 leading-relaxed">{t("social_landing.final_sub")}</p>
          <div className="max-w-lg mx-auto">
            <StoreButtons size="large" location="final_cta" />
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden sl-glass border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-quicksand font-black text-sm">AmyNest AI</p>
            <p className="text-[10px] text-white/55">Patent Pending · Free To Start</p>
          </div>
          <StoreButton target={target} location="sticky_mobile" size="compact">
            <span className="text-xs font-bold text-white">Start Plan</span>
          </StoreButton>
        </div>
      </div>

      <ExitIntentModal target={target} />

      <footer className="relative z-10 px-4 py-6 border-t border-white/10 text-center">
        <p className="text-xs text-white/35">© {new Date().getFullYear()} AmyNest AI · {t("social_landing.badge_patent")}</p>
      </footer>
    </div>
  );
}
