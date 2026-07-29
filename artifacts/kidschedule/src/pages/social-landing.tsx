import { useEffect, useMemo, useRef, useState } from "react";
import {
  Baby,
  Check,
  ChevronDown,
  Lock,
  ShieldCheck,
  EyeOff,
  Sparkles,
  UserPlus,
  ListChecks,
  TrendingUp,
  Sun,
  Heart,
  Moon,
} from "lucide-react";
import { StoreQrCode } from "@/components/store-qr-code";
import { trackGetAppFunnelEvent } from "@/lib/marketing/ga4-analytics";
import {
  initMetaGetAppPixel,
  trackMetaAppDownloadClick,
  trackMetaGetAppPageView,
} from "@/lib/meta-get-app-attribution";
import { applySeoMeta, buildCanonicalUrl } from "@/lib/marketing/canonical-seo";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";

const OFFICIAL_LOGO = "/amynest-logo-new.png";
const OG_IMAGE = "/opengraph.jpg";
const HERO_DEMO_VIDEO = "/promo/get-app/demo-15s.mp4";
const HERO_POSTER = "/promo/get-app/screenshots/amy-assistant.jpg";
const AGE_STORAGE_KEY = "amynest_sl_age_band";
/** Primary CTA — benefit-led; store name stays as secondary line. */
const PRIMARY_CTA = "Get Today's Plan";
const APPLE_APP_ID = "6767664343";

type StoreTarget = "android" | "ios";
type AgeBand = "newborn" | "0-2" | "2-5" | "5-8" | "8-10";

type LandingEventName =
  | "landing_page_view"
  | "store_button_click"
  | "install_intent"
  | "scroll_depth"
  | "screenshot_carousel_engagement"
  | "scroll_cta_shown"
  | "exit_intent_shown"
  | "demo_question_click"
  | "age_selected"
  | "hero_video_start"
  | "hero_video_complete"
  | "demo_started"
  | "demo_completed"
  | "feature_view"
  | "testimonial_view"
  | "timeline_view"
  | "trust_view"
  | "faq_opened"
  | "sticky_cta_click"
  | "hero_cta_click"
  | "footer_cta_click"
  | "qr_scan"
  | "store_redirect"
  | "install_click"
  | "section_view";

function trackLandingEvent(
  event: LandingEventName,
  meta: Record<string, string | number | boolean | undefined> = {},
) {
  trackGetAppFunnelEvent(event, meta);
}

function trackStoreClick(target: StoreTarget, location: string) {
  trackLandingEvent("install_intent", { store: target, location });
  trackLandingEvent("store_button_click", { store: target, location });
  trackLandingEvent("store_redirect", { store: target, location });
  trackLandingEvent("install_click", { store: target, location });
  if (location.startsWith("hero")) trackLandingEvent("hero_cta_click", { store: target, location });
  if (location.startsWith("sticky")) trackLandingEvent("sticky_cta_click", { store: target, location });
  if (location.startsWith("final") || location.startsWith("footer")) {
    trackLandingEvent("footer_cta_click", { store: target, location });
  }
  trackMetaAppDownloadClick({ store: target, location });
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Fire once when section enters viewport (~40% visible). */
function useSectionView(section: string, enabled = true) {
  const ref = useRef<HTMLElement | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (!enabled || sent.current) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || sent.current) return;
        sent.current = true;
        trackLandingEvent("section_view", { section });
        if (section === "outcomes") trackLandingEvent("testimonial_view", { section });
        if (section === "features") trackLandingEvent("feature_view", { section });
        if (section === "timeline") trackLandingEvent("timeline_view", { section });
        if (section === "trust") trackLandingEvent("trust_view", { section });
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [section, enabled]);
  return ref;
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
  variant = "solid",
  ctaLabel,
}: {
  target: StoreTarget;
  size?: "default" | "large" | "compact";
  location: string;
  variant?: "glass" | "solid";
  ctaLabel?: string;
}) {
  const store = getStoreMeta(target);
  const pad = size === "large" ? "px-7 py-4" : size === "compact" ? "px-3 py-2.5" : "px-6 py-3.5";
  const icon = size === "large" ? "h-8 w-8" : size === "compact" ? "h-5 w-5" : "h-7 w-7";
  const title = size === "large" ? "text-lg" : size === "compact" ? "text-sm" : "text-base";
  const onClick = () => trackStoreClick(target, location);
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
      className={`flex flex-1 items-center justify-center sm:justify-start gap-2.5 ${pad} rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
      style={{ ...bg, textDecoration: "none" }}
      aria-label={`${ctaLabel ?? store.label} — ${store.label}`}
    >
      <StoreIcon target={target} className={`${icon} shrink-0 ${textClass}`} />
      <div className="text-left leading-tight">
        {ctaLabel ? (
          <>
            <p className={`font-bold ${title} ${textClass}`}>{ctaLabel}</p>
            <p className={`text-[10px] font-semibold ${subClass}`}>{store.label}</p>
          </>
        ) : (
          <>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${subClass}`}>{store.eyebrow}</p>
            <p className={`font-bold ${title} ${textClass}`}>{store.label}</p>
          </>
        )}
      </div>
    </a>
  );
}

/** Device-aware store row: primary store emphasized; both always available. */
function StoreButtonRow({
  size = "default",
  location,
  variant = "solid",
  primaryTarget,
  ctaLabel = PRIMARY_CTA,
}: {
  size?: "default" | "large" | "compact";
  location: string;
  variant?: "glass" | "solid";
  primaryTarget?: StoreTarget;
  ctaLabel?: string;
}) {
  const primary = primaryTarget ?? "android";
  const secondary: StoreTarget = primary === "android" ? "ios" : "android";
  return (
    <div className={`flex ${size === "compact" ? "flex-row" : "flex-col sm:flex-row"} items-stretch gap-2 sm:gap-3 w-full`}>
      <StoreButton
        target={primary}
        size={size}
        location={`${location}_${primary}`}
        variant={variant}
        ctaLabel={ctaLabel}
      />
      <StoreButton
        target={secondary}
        size={size === "large" ? "default" : size}
        location={`${location}_${secondary}`}
        variant={size === "compact" ? variant : "glass"}
      />
    </div>
  );
}

type AgeProfile = {
  id: AgeBand;
  label: string;
  shortLabel: string;
  heroLine: string;
  benefit: string;
  ctaLabel: string;
  infantFree: boolean;
  phoneImage: string;
  features: { title: string; line: string; image: string }[];
  schedule: { time: string; item: string }[];
  demoIds: string[];
};

const AGE_PROFILES: AgeProfile[] = [
  {
    id: "newborn",
    label: "Newborn",
    shortLabel: "Newborn",
    heroLine: "Decode cries, naps and feeds — without guessing at 2 AM.",
    benefit: "Infant Hub guides hunger, sleep and comfort cues from day one.",
    ctaLabel: "Start Free Today",
    infantFree: true,
    phoneImage: "/promo/get-app/screenshots/infant-hub.jpg",
    features: [
      { title: "Infant Hub", line: "Cry Insight, sleep predictions and feeding support — free.", image: "/promo/get-app/screenshots/infant-hub.jpg" },
      { title: "Ask AMY", line: "Get the next calm step when your baby won't settle.", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
      { title: "Daily Planner", line: "See nap and feed windows before chaos starts.", image: "/promo/get-app/screenshots/daily-routine.jpg" },
    ],
    schedule: [
      { time: "6:30", item: "Wake & feed" },
      { time: "8:00", item: "Morning nap window" },
      { time: "11:00", item: "Feed + tummy time" },
      { time: "14:00", item: "Afternoon nap" },
      { time: "18:30", item: "Bath & wind-down" },
      { time: "19:30", item: "Bedtime routine" },
    ],
    demoIds: ["crying", "routine", "activity"],
  },
  {
    id: "0-2",
    label: "0–2 years",
    shortLabel: "0–2",
    heroLine: "Sleep, feeding and milestones — one calm plan for toddlers too.",
    benefit: "Full AmyNest app is free for infants, with age-right daily guidance.",
    ctaLabel: "Start Free Today",
    infantFree: true,
    phoneImage: "/promo/infant-parenting/appstore-02-baby-today.jpg",
    features: [
      { title: "Infant Hub", line: "Milestones, vaccines, growth and weekly family reports.", image: "/promo/get-app/screenshots/infant-hub.jpg" },
      { title: "Morning Routine", line: "A simple rhythm parents can actually finish.", image: "/promo/get-app/screenshots/daily-routine.jpg" },
      { title: "Ask AMY", line: "Meals, naps and tantrums — clear next steps.", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
    ],
    schedule: [
      { time: "7:00", item: "Wake up" },
      { time: "7:30", item: "Breakfast" },
      { time: "9:00", item: "Play & exploration" },
      { time: "12:30", item: "Lunch" },
      { time: "14:00", item: "Nap" },
      { time: "17:00", item: "Outdoor play" },
      { time: "19:30", item: "Bedtime" },
    ],
    demoIds: ["crying", "vegetables", "bedtime", "routine"],
  },
  {
    id: "2-5",
    label: "2–5 years",
    shortLabel: "2–5",
    heroLine: "Turn screen time into speech, stories and calm routines.",
    benefit: "Speech Coach, Sound World and daily activities built for preschool years.",
    ctaLabel: PRIMARY_CTA,
    infantFree: false,
    phoneImage: "/promo/get-app/screenshots/speech-coach.png",
    features: [
      { title: "Speech Coach", line: "Gentle daily practice that builds clear words and confidence.", image: "/promo/get-app/screenshots/speech-coach.png" },
      { title: "Ask AMY", line: "Tantrums, meals and bedtime — practical answers fast.", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
      { title: "Learning Activities", line: "Age-right play that feels fun, not like homework.", image: "/promo/social/reels/learning-zone.png" },
    ],
    schedule: [
      { time: "7:00", item: "Wake up" },
      { time: "7:30", item: "Breakfast" },
      { time: "9:00", item: "Learning play" },
      { time: "12:30", item: "Lunch" },
      { time: "14:00", item: "Quiet time / nap" },
      { time: "17:00", item: "Outdoor play" },
      { time: "20:00", item: "Bedtime" },
    ],
    demoIds: ["vegetables", "speech", "screens", "bedtime", "activity"],
  },
  {
    id: "5-8",
    label: "5–8 years",
    shortLabel: "5–8",
    heroLine: "Homework battles become short, doable study wins.",
    benefit: "Smart Study Zone, phonics and routines that fit real school days.",
    ctaLabel: PRIMARY_CTA,
    infantFree: false,
    phoneImage: "/promo/get-app/screenshots/smart-study-zone.jpg",
    features: [
      { title: "Smart Study Zone", line: "A focused path for reading, spelling and daily practice.", image: "/promo/get-app/screenshots/smart-study-zone.jpg" },
      { title: "Morning Routine", line: "School prep without the morning chaos.", image: "/promo/get-app/screenshots/daily-routine.jpg" },
      { title: "Ask AMY", line: "Study resistance, screens and meals — one clear plan.", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
    ],
    schedule: [
      { time: "6:45", item: "Wake up" },
      { time: "7:15", item: "Breakfast" },
      { time: "8:00", item: "School / learning block" },
      { time: "16:00", item: "Homework focus (20 min)" },
      { time: "17:30", item: "Outdoor play" },
      { time: "19:30", item: "Family dinner" },
      { time: "20:30", item: "Wind-down & bed" },
    ],
    demoIds: ["study", "screens", "routine", "activity"],
  },
  {
    id: "8-10",
    label: "8–10+ years",
    shortLabel: "8–10+",
    heroLine: "Focus, confidence and better school habits — without nagging.",
    benefit: "Study plans, reading skills and parent coaching that grows with them.",
    ctaLabel: PRIMARY_CTA,
    infantFree: false,
    phoneImage: "/promo/social/reels/learning-zone.png",
    features: [
      { title: "Smart Study Zone", line: "Age-right focus sessions that stick.", image: "/promo/get-app/screenshots/smart-study-zone.jpg" },
      { title: "Ask AMY", line: "Motivation, screens and routines with less conflict.", image: "/promo/get-app/screenshots/amy-assistant.jpg" },
      { title: "Daily Planner", line: "A calm day plan parents and kids can follow together.", image: "/promo/get-app/screenshots/daily-routine.jpg" },
    ],
    schedule: [
      { time: "6:30", item: "Wake up" },
      { time: "7:00", item: "Breakfast" },
      { time: "8:00", item: "School day" },
      { time: "16:30", item: "Focused study (25 min)" },
      { time: "18:00", item: "Outdoor / hobby" },
      { time: "20:00", item: "Family time" },
      { time: "21:00", item: "Bedtime" },
    ],
    demoIds: ["study", "screens", "routine", "activity"],
  },
];

function useAgeProfile(): [AgeProfile, (id: AgeBand) => void] {
  const [ageId, setAgeId] = useState<AgeBand>("2-5");
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AGE_STORAGE_KEY) as AgeBand | null;
      if (stored && AGE_PROFILES.some((p) => p.id === stored)) setAgeId(stored);
    } catch {
      /* ignore */
    }
  }, []);
  const select = (id: AgeBand) => {
    setAgeId(id);
    try {
      sessionStorage.setItem(AGE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    trackLandingEvent("age_selected", { age_band: id });
  };
  const profile = AGE_PROFILES.find((p) => p.id === ageId) ?? AGE_PROFILES[2]!;
  return [profile, select];
}

/** Honest outcome cards — product promises, not fabricated reviews or ratings. */
const OUTCOME_CARDS = [
  {
    icon: Moon,
    title: "2 AM crying",
    body: "Infant Hub helps decode hunger, sleep, and comfort cues — free for infants.",
  },
  {
    icon: Sun,
    title: "Chaotic mornings",
    body: "AMY builds a short routine you can finish — wake, meals, school prep.",
  },
  {
    icon: ListChecks,
    title: "Homework battles",
    body: "Smart Study Zone starts with one small win kids can actually begin.",
  },
] as const;

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Child-safe" },
  { icon: Lock, label: "Privacy-first" },
  { icon: EyeOff, label: "No ads for kids" },
  { icon: Heart, label: "Built for parents" },
  { icon: Sparkles, label: "Personalized guidance" },
] as const;

type DemoExchange = { id: string; question: string; answers: Partial<Record<AgeBand, string>> & { default: string } };

const DEMO_EXCHANGES: DemoExchange[] = [
  {
    id: "study",
    question: "My child won't study",
    answers: {
      default:
        "For school age today:\n\nStudy block: 15 minutes\nGoal: one worksheet page\nReward: 10 minutes free play\n\nOpen Smart Study Zone → start the first focus session.",
      "5-8":
        "For a 6-year-old today:\n\nStudy: 15-minute reading block\nFocus: 5 new words + one short story\nBreak: movement game for 5 minutes\n\nOpen Smart Study Zone and finish one small win before screens.",
      "8-10":
        "For ages 8–10 today:\n\nStudy: 25-minute focus block\nTask: maths or reading — pick one\nThen: 10-minute outdoor break\n\nAMY tracks the streak so nagging drops.",
      "2-5":
        "For a preschooler, skip 'study'. Try:\n\n15 minutes color matching\n10 minutes story time\n5 minutes animal sounds (speech)\n\nOpen Learning Activities → today's play plan.",
    },
  },
  {
    id: "vegetables",
    question: "My toddler won't eat vegetables",
    answers: {
      default:
        "Today's gentle plan:\n\nBreakfast: banana oats\nLunch: dal + soft carrot mash mixed into rice\nSnack: cucumber sticks with yogurt dip\n\nOffer once without pressure. Repeat tomorrow — consistency beats force.",
      "0-2":
        "For ages 1–2 today:\n\nBreakfast: banana oats\nLunch: soft carrot + dal mash\nSnack: steamed apple\n\nOpen Nutrition Hub for the full age-right day plan.",
      "2-5":
        "For a 3-year-old today:\n\nBreakfast: banana oats\nLunch: dal rice + tiny carrot 'coins'\nSnack: cucumber with yogurt\nActivity after meal: 10-minute outdoor play\n\nNo battles — one calm offer, then move on.",
    },
  },
  {
    id: "crying",
    question: "My baby keeps crying",
    answers: {
      default:
        "Cry Insight suggests hunger is likely.\n\n1. Open Infant Hub → Cry Insight\n2. Check last feed time\n3. Next feeding window: ~25 minutes\n\nIf still unsettled after feed, try sleep cue next. Full Infant Hub is free.",
      newborn:
        "Cry Insight suggests hunger.\n\nOpen Infant Hub now.\nNext feeding in about 25 minutes.\nAfter feed: check burp + sleep cues.\n\nFree baby tracking — daily AI guidance included.",
      "0-2":
        "Likely cue: hunger or overtired.\n\n1. Open Infant Hub → Cry Insight\n2. Log the last feed/nap\n3. Follow the next nap window on Baby Today\n\nFull AmyNest app is free for infants.",
    },
  },
  {
    id: "bedtime",
    question: "Bedtime is a struggle",
    answers: {
      default:
        "Tonight's wind-down:\n\n7:30 Dim lights\n7:40 One short story\n7:50 Same song every night\n8:00 Lights out\n\nOpen Daily Planner → set bedtime as a fixed anchor.",
      "2-5":
        "For ages 2–5 tonight:\n\n7:30 Bath / dim lights\n7:40 Story (one only)\n7:50 Quiet song\n8:00 Bed\n\nSame order every night trains sleep faster than late screens.",
      "0-2":
        "Tonight:\n\nLast feed → dim room → swaddle/comfort → sleep song\nTarget bedtime: keep it within a 30-minute window daily.\n\nBaby Today shows the next nap/feed so evenings stay calmer.",
    },
  },
  {
    id: "screens",
    question: "My child spends too much time on screens",
    answers: {
      default:
        "Swap plan for today:\n\nScreen: 20 minutes max after one finished activity\nReplace block: Learning Activities or outdoor play\n\nOpen Ask AMY → set a daily screen limit with a fun alternative ready.",
      "2-5":
        "For preschoolers today:\n\nBefore any screen: 15 minutes color matching or Sound World\nThen: one short guided video max\nAfter: outdoor play\n\nAMY turns 'random YouTube' into guided skill time.",
      "5-8":
        "Rule that works:\n\nHomework or one AmyNest learning block first\nThen: 20 minutes screen\nEvening: outdoor or reading only\n\nOpen Daily Planner to lock the order.",
    },
  },
  {
    id: "activity",
    question: "What activity should we do today?",
    answers: {
      default:
        "Today's balanced trio:\n\nLearning: 15 minutes\nMovement: 15 minutes outdoor\nCalm: one story or quiet craft\n\nOpen Ask AMY for your child's age-picked list.",
      "2-5":
        "For a 3-year-old today:\n\nBreakfast: banana oats\nActivity: 15 minutes color matching\nSpeech: animal sounds (5 minutes)\nBedtime: 7:30 PM wind-down\n\nInstall to get this plan personalized daily.",
      "5-8":
        "Today:\n\nReading: 15 minutes\nSpelling game: 10 minutes\nOutdoor play: 20 minutes\n\nOpen Smart Study Zone → today's path.",
    },
  },
  {
    id: "speech",
    question: "My child struggles with speech",
    answers: {
      default:
        "Daily micro-practice:\n\n5 minutes animal sounds\n5 minutes repeat-after-me words\nOne story with slow clear speech\n\nOpen Speech Coach → today's gentle session.",
      "2-5":
        "For ages 2–5 today:\n\nWarm-up: animal sounds (3 min)\nPractice: 5 target words from Speech Coach\nPlay: name objects during snack\n\nShort, fun, every day — confidence follows.",
      "0-2":
        "For early talkers:\n\nNarrate daily routines ('water', 'ball', 'mama')\nUse Amy Sound World for listening play\nTrack new sounds in Infant Hub milestones\n\nKeep it playful — no pressure drills.",
    },
  },
  {
    id: "routine",
    question: "Help me create a daily routine",
    answers: {
      default:
        "Anchor the day first:\n\nWake → meals → bedtime (fixed)\nThen add: one learning block + one outdoor block\n\nOpen Routine Generator → AMY builds today's plan in minutes.",
      newborn:
        "Newborn rhythm:\n\nFeed → awake window → sleep → repeat\nLog in Infant Hub so predictions improve\n\nBaby Today shows the next nap/feed window — install free to start.",
      "5-8":
        "School-day skeleton:\n\n6:45 Wake\n7:15 Breakfast\n16:00 20-min homework\n17:30 Outdoor\n20:30 Wind-down\n\nOpen Daily Planner and personalize in the app.",
    },
  },
];

function resolveDemoAnswer(exchange: DemoExchange, age: AgeBand): string {
  return exchange.answers[age] ?? exchange.answers.default;
}

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full rounded-[2.2rem] overflow-hidden ${className ?? "max-w-[250px]"}`}
      style={{
        aspectRatio: "9/19",
        border: "2px solid rgba(255,255,255,0.22)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 40px rgba(168,85,247,0.16)",
        background: "#0d0b16",
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10 bg-black/80" />
      {children}
    </div>
  );
}

function InfantFreePill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ${className}`}
      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}
    >
      <Baby className="h-3 w-3 shrink-0" aria-hidden />
      Free baby tracking for every family
    </span>
  );
}

function HeroPhonePreview({ imageSrc }: { imageSrc: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [useImageFallback, setUseImageFallback] = useState(false);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const poster = imageSrc || HERO_POSTER;

  useEffect(() => {
    if (reducedMotion) {
      setUseImageFallback(true);
      return;
    }
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldLoadVideo(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoadVideo(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.15 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!shouldLoadVideo || useImageFallback) return;
    const video = videoRef.current;
    if (!video) return;
    const play = () => {
      void video.play().catch(() => setUseImageFallback(true));
    };
    if (video.readyState >= 2) play();
    else video.addEventListener("loadeddata", play, { once: true });
  }, [shouldLoadVideo, useImageFallback, poster]);

  return (
    <div ref={wrapRef} className="relative w-full max-w-[280px] mx-auto">
      <div
        aria-hidden
        className="absolute inset-0 blur-3xl opacity-40 hidden sm:block"
        style={{ background: "radial-gradient(circle,rgba(168,85,247,0.4),transparent 70%)" }}
      />
      <PhoneFrame className="max-w-[280px] relative z-10">
        <img
          src={poster}
          alt="AmyNest app preview"
          width={280}
          height={590}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {shouldLoadVideo && !useImageFallback ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={HERO_DEMO_VIDEO}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label="AmyNest app preview video"
            onPlay={() => {
              if (startedRef.current) return;
              startedRef.current = true;
              trackLandingEvent("hero_video_start", { src: "demo-15s" });
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (completedRef.current || !v.duration) return;
              if (v.currentTime / v.duration >= 0.9) {
                completedRef.current = true;
                trackLandingEvent("hero_video_complete", { src: "demo-15s" });
              }
            }}
            onError={() => setUseImageFallback(true)}
          />
        ) : null}
      </PhoneFrame>
    </div>
  );
}

function RiskReversal({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] sm:text-xs text-white/50 ${className}`}>
      Free to start · No credit card · Cancel anytime
    </p>
  );
}

function DesktopQrBlock({ primaryTarget }: { primaryTarget: StoreTarget }) {
  const href = primaryTarget === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
  const label = primaryTarget === "ios" ? "App Store" : "Google Play";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackLandingEvent("qr_scan", { store: primaryTarget, location: "hero_qr" });
        trackStoreClick(primaryTarget, "hero_qr");
      }}
      className="hidden lg:flex items-center gap-3 rounded-2xl px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
      aria-label={`Scan QR or open ${label} to install`}
    >
      <div className="rounded-xl bg-white p-2 shrink-0" aria-hidden>
        <StoreQrCode value={href} size={72} bgColor="#FFFFFF" fgColor="#1a1a2e" />
      </div>
      <div className="text-left">
        <p className="font-quicksand font-bold text-sm text-white">Scan to install</p>
        <p className="text-xs text-white/55 leading-snug">Camera → scan → {label}</p>
      </div>
    </a>
  );
}

function OutcomesSection() {
  const ref = useSectionView("outcomes");
  return (
    <section
      ref={ref}
      className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-8"
      aria-labelledby="outcomes-heading"
    >
      <div className="text-center mb-5">
        <h2 id="outcomes-heading" className="font-quicksand font-black text-xl sm:text-2xl text-white">
          Built for the moments parents struggle most
        </h2>
        <p className="text-white/55 text-sm mt-2">Free on Google Play &amp; the App Store · Child-safe · Privacy-first</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OUTCOME_CARDS.map((card) => (
          <article key={card.title} className="sl-glass rounded-2xl p-4 sm:p-5 text-left">
            <span
              className="h-9 w-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              <card.icon className="h-4 w-4 text-purple-200" aria-hidden />
            </span>
            <h3 className="font-quicksand font-bold text-sm text-white mb-1.5">{card.title}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgePersonalizationSection({
  profile,
  onSelect,
}: {
  profile: AgeProfile;
  onSelect: (id: AgeBand) => void;
}) {
  const ref = useSectionView("age_selector");
  return (
    <section ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-8" aria-labelledby="age-heading">
      <div className="text-center mb-4">
        <h2 id="age-heading" className="font-quicksand font-black text-2xl sm:text-3xl">
          How old is your child?
        </h2>
        <p className="text-white/60 text-sm mt-2">Personalize the plan in one tap.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-6" role="radiogroup" aria-label="Child age">
        {AGE_PROFILES.map((p) => {
          const active = p.id === profile.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(p.id)}
              className={`min-h-[44px] min-w-[4.5rem] px-4 py-2.5 rounded-full text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                active ? "bg-white text-slate-950" : "bg-white/8 text-white/85 border border-white/15 hover:bg-white/12"
              }`}
            >
              {p.shortLabel}
            </button>
          );
        })}
      </div>
      <div
        className="sl-glass rounded-3xl p-5 sm:p-7 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-center"
        key={profile.id}
      >
        <div>
          {profile.infantFree ? <div className="mb-3"><InfantFreePill /></div> : null}
          <p className="font-quicksand font-black text-xl sm:text-2xl text-white mb-2">{profile.label}</p>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-2">{profile.heroLine}</p>
          <p className="text-white/55 text-sm leading-relaxed mb-5">{profile.benefit}</p>
          <div className="max-w-md">
            <StoreButtonRow location={`age_${profile.id}`} ctaLabel={profile.ctaLabel} />
            <RiskReversal className="mt-3 text-center sm:text-left" />
          </div>
        </div>
        <PhoneFrame className="max-w-[180px]">
          <img
            src={profile.phoneImage}
            alt={`${profile.label} in AmyNest`}
            width={180}
            height={380}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </PhoneFrame>
      </div>
    </section>
  );
}

function TryAmyDemoSection({
  age,
  ctaLabel,
  primaryTarget,
}: {
  age: AgeBand;
  ctaLabel: string;
  primaryTarget: StoreTarget;
}) {
  const profile = AGE_PROFILES.find((p) => p.id === age) ?? AGE_PROFILES[2]!;
  const exchanges = useMemo(() => {
    const preferred = profile.demoIds
      .map((id) => DEMO_EXCHANGES.find((e) => e.id === id))
      .filter((e): e is DemoExchange => Boolean(e));
    const rest = DEMO_EXCHANGES.filter((e) => !profile.demoIds.includes(e.id));
    return [...preferred, ...rest].slice(0, 6);
  }, [profile.demoIds]);

  const first = exchanges[0]!;
  const [history, setHistory] = useState<{ id: string; question: string; answer: string }[]>(() => [
    { id: first.id, question: first.question, answer: resolveDemoAnswer(first, age) },
  ]);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set([first.id]));
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const ageRef = useRef(age);
  const demoStartedRef = useRef(false);
  const sectionRef = useSectionView("demo");
  ageRef.current = age;

  // Reset preview when age changes so answers stay personalized.
  useEffect(() => {
    const next = exchanges[0]!;
    setHistory([{ id: next.id, question: next.question, answer: resolveDemoAnswer(next, age) }]);
    setRevealedIds(new Set([next.id]));
    setTypingId(null);
    demoStartedRef.current = false;
  }, [age, exchanges]);

  useEffect(() => {
    if (!demoStartedRef.current && history.length > 0) {
      demoStartedRef.current = true;
      trackLandingEvent("demo_started", { age_band: age, question_id: history[0]?.id });
    }
  }, [age, history]);

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
    trackLandingEvent("demo_question_click", { question_id: exchange.id, age_band: ageRef.current });
    setRevealedIds((prev) => new Set(prev).add(exchange.id));
    setHistory((prev) => [...prev, { id: exchange.id, question: exchange.question, answer: "" }]);
    setTypingId(exchange.id);
    typingTimer.current = window.setTimeout(() => {
      const answer = resolveDemoAnswer(exchange, ageRef.current);
      setHistory((prev) => prev.map((item) => (item.id === exchange.id ? { ...item, answer } : item)));
      setTypingId(null);
      const nextCount = revealedIds.size + 1;
      if (nextCount >= 2) {
        trackLandingEvent("demo_completed", { age_band: ageRef.current, questions: nextCount });
      }
    }, 450);
  };

  return (
    <section ref={sectionRef} className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:py-10" aria-labelledby="try-amy-demo-heading">
      <div className="text-center mb-5">
        <h2 id="try-amy-demo-heading" className="font-quicksand font-black text-2xl sm:text-3xl">
          Ask AMY — see today's plan in 10 seconds
        </h2>
        <p className="text-white/60 text-sm max-w-xl mx-auto mt-2 leading-relaxed">
          Tap a question. Get a concrete plan for {profile.label.toLowerCase()}.
        </p>
      </div>

      <div className="sl-glass rounded-3xl p-4 sm:p-6" style={{ borderColor: "rgba(168,85,247,0.25)" }}>
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-white/10">
          <span
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="font-quicksand font-black text-sm text-white leading-tight">Chat with AMY</p>
            <p className="text-[11px] text-emerald-300">● Preview for {profile.label}</p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex flex-col gap-4 min-h-[160px] max-h-[360px] overflow-y-auto pr-1"
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
                    <p className="text-[13px] sm:text-sm text-white leading-snug whitespace-pre-line">{item.answer}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40 mb-3">Try another question</p>
          <div className="flex flex-wrap gap-2">
            {exchanges.map((exchange) => {
              const used = revealedIds.has(exchange.id);
              return (
                <button
                  key={exchange.id}
                  type="button"
                  onClick={() => askDemo(exchange)}
                  disabled={used || typingId !== null}
                  className={`text-left text-[13px] font-semibold rounded-full px-3.5 py-2.5 min-h-[44px] transition-all ${
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

      <div
        className="mt-5 rounded-3xl px-5 py-6 sm:px-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.1) 100%)",
          border: "1px solid rgba(168,85,247,0.28)",
        }}
      >
        <p className="font-quicksand font-black text-xl sm:text-2xl text-white mb-1.5">
          Get this personalized inside AmyNest
        </p>
        <p className="text-white/60 text-sm max-w-md mx-auto mb-5 leading-relaxed">
          Preview only. In the app, AMY builds today's plan for your child.
        </p>
        <div className="max-w-lg mx-auto">
          <StoreButtonRow location="try_amy_demo" primaryTarget={primaryTarget} ctaLabel={ctaLabel} />
          <RiskReversal className="mt-3" />
        </div>
      </div>
    </section>
  );
}

function FeatureFlowsSection({
  profile,
  primaryTarget,
}: {
  profile: AgeProfile;
  primaryTarget: StoreTarget;
}) {
  const ref = useSectionView("features");
  return (
    <section ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-10" aria-labelledby="features-heading">
      <div className="text-center mb-5">
        <h2 id="features-heading" className="font-quicksand font-black text-2xl sm:text-3xl">
          What you'll open tomorrow
        </h2>
        <p className="text-white/60 text-sm max-w-xl mx-auto mt-2">
          Real screens for {profile.label.toLowerCase()}.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {profile.features.map((feature) => (
          <article key={feature.title} className="sl-glass rounded-3xl overflow-hidden flex flex-col">
            <div className="relative aspect-[9/14] max-h-[280px] bg-black/40">
              <img
                src={feature.image}
                alt={feature.title}
                width={360}
                height={560}
                className="absolute inset-0 h-full w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-quicksand font-bold text-base text-white mb-1">{feature.title}</h3>
              <p className="text-white/65 text-sm leading-relaxed mb-3 flex-1">{feature.line}</p>
              <StoreButton
                target={primaryTarget}
                size="compact"
                location={`feature_${feature.title.toLowerCase().replace(/\s+/g, "_")}`}
                variant="solid"
                ctaLabel={PRIMARY_CTA}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AfterInstallSection() {
  const ref = useSectionView("timeline");
  const steps = [
    { icon: UserPlus, title: "Install AmyNest", desc: "Free on Google Play and the App Store." },
    { icon: ListChecks, title: "Answer 3 questions", desc: "Age, goal, biggest challenge." },
    { icon: Sparkles, title: "AMY builds today's plan", desc: "Ready in under 2 minutes." },
    { icon: Sun, title: "Start your first routine", desc: "One clear next step." },
    { icon: TrendingUp, title: "Feel more confident", desc: "Less guessing tonight." },
  ] as const;

  return (
    <section ref={ref} className="relative z-10 max-w-3xl mx-auto px-4 py-6 md:py-10" aria-labelledby="after-install-heading">
      <div className="text-center mb-5">
        <h2 id="after-install-heading" className="font-quicksand font-black text-2xl sm:text-3xl">
          Your first 2 minutes
        </h2>
        <p className="text-white/60 text-sm mt-2">No credit card. Clear path to your first win.</p>
      </div>
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.2))",
                  border: "1px solid rgba(168,85,247,0.35)",
                }}
              >
                <step.icon className="h-5 w-5 text-purple-100" />
              </span>
              {index < steps.length - 1 ? (
                <span className="w-px flex-1 my-1 bg-gradient-to-b from-purple-400/40 to-transparent min-h-[20px]" aria-hidden />
              ) : null}
            </div>
            <div className="pb-6">
              <p className="font-quicksand font-bold text-base text-white">{step.title}</p>
              <p className="text-white/58 text-sm leading-relaxed mt-0.5">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TomorrowPreviewSection({ profile }: { profile: AgeProfile }) {
  const ref = useSectionView("tomorrow");
  return (
    <section ref={ref} className="relative z-10 max-w-xl mx-auto px-4 py-6 md:py-8" aria-labelledby="tomorrow-heading">
      <div className="text-center mb-4">
        <h2 id="tomorrow-heading" className="font-quicksand font-black text-2xl sm:text-3xl">
          Tomorrow with AmyNest
        </h2>
        <p className="text-white/60 text-sm mt-2">A calmer day for {profile.label.toLowerCase()}.</p>
      </div>
      <div className="sl-glass rounded-3xl overflow-hidden">
        {profile.schedule.map((row, i) => (
          <div
            key={`${row.time}-${row.item}`}
            className={`flex items-center gap-4 px-5 py-3.5 ${i % 2 ? "bg-white/[0.03]" : ""} ${
              i < profile.schedule.length - 1 ? "border-b border-white/8" : ""
            }`}
          >
            <span className="font-quicksand font-bold text-purple-200/90 w-14 shrink-0 tabular-nums">{row.time}</span>
            <span className="text-white/85 text-sm font-medium">{row.item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  const ref = useSectionView("trust");
  return (
    <section ref={ref} className="relative z-10 max-w-6xl mx-auto px-4 py-5" aria-label="Trust">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[12px] sm:text-sm font-semibold text-white/70">
            <Icon className="h-4 w-4 text-emerald-300/90 shrink-0" aria-hidden />
            {label}
          </span>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-white/40 max-w-lg mx-auto leading-relaxed">
        AmyNest provides parenting guidance and is not a substitute for professional medical advice.
      </p>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Is AmyNest free?",
    a: "Yes — free to start on Google Play and the App Store. Free baby tracking for every family, with daily AI guidance included. Upgrade anytime for unlimited expert support as your child grows.",
  },
  {
    q: "How fast can I get a plan?",
    a: "After install, answer 3 short questions. AMY builds today's plan in under 2 minutes — routines, meals, and the next best activity.",
  },
  {
    q: "Is it safe for kids?",
    a: "AmyNest is child-safe by design: no ads for kids, privacy-first, and age-appropriate guidance for ages 0–10+.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. Download free, explore, and cancel anytime. No card required to start.",
  },
] as const;

function FaqSection() {
  const ref = useSectionView("faq");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section ref={ref} className="relative z-10 max-w-2xl mx-auto px-4 py-6 md:py-8" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-quicksand font-black text-2xl sm:text-3xl text-center mb-4">
        Before you install
      </h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q} className="sl-glass rounded-2xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-expanded={isOpen}
                onClick={() => {
                  const next = isOpen ? null : index;
                  setOpen(next);
                  if (next !== null) trackLandingEvent("faq_opened", { question: item.q, index });
                }}
              >
                <span className="font-quicksand font-bold text-sm text-white">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/60 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <p className="px-4 pb-4 text-sm text-white/65 leading-relaxed">{item.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExitIntentModal({ ctaLabel, primaryTarget }: { ctaLabel: string; primaryTarget: StoreTarget }) {
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
        <h2 className="font-quicksand font-black text-2xl mb-2">Get today&apos;s plan in 2 minutes.</h2>
        <p className="text-white/64 text-sm leading-relaxed mb-5">
          Free to start. No credit card. Built for your child&apos;s age.
        </p>
        <StoreButtonRow location="exit_intent" primaryTarget={primaryTarget} ctaLabel={ctaLabel} />
        <RiskReversal className="mt-3" />
        <button type="button" onClick={() => setVisible(false)} className="mt-4 text-xs text-white/50 underline">
          Maybe later
        </button>
      </div>
    </div>
  );
}

function StickyMobileCta({ ctaLabel, primaryTarget }: { ctaLabel: string; primaryTarget: StoreTarget }) {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
      const show = pageHeight > 0 && window.scrollY > pageHeight * 0.08;
      setVisible(show);
      if (show && !shownRef.current) {
        shownRef.current = true;
        trackLandingEvent("scroll_cta_shown", { placement: "sticky_mobile" });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 px-3 py-2.5 transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ background: "rgba(10, 8, 22, 0.96)" }}
      aria-hidden={!visible}
    >
      <StoreButtonRow size="compact" location="sticky_mobile" variant="solid" primaryTarget={primaryTarget} ctaLabel={ctaLabel} />
    </div>
  );
}

export default function SocialLandingPage() {
  const target = useStoreTarget();
  const [profile, selectAge] = useAgeProfile();
  const scrollDepths = useRef(new Set<number>());

  useEffect(() => {
    const pageTitle = "Get Today's Parenting Plan — AmyNest App";
    const description =
      "Stop guessing at 2 AM. AmyNest gives clear next steps for sleep, meals, routines, speech and learning from newborn to age 10. Free to start on Google Play and the App Store.";
    applySeoMeta({
      path: "/get-app",
      title: pageTitle,
      description,
      ogImage: buildCanonicalUrl(OG_IMAGE),
      keywords: "AmyNest app, parenting app, infant hub, AI parenting, install AmyNest",
    });

    // Apple Smart App Banner (iOS Safari)
    let smartBanner = document.querySelector('meta[name="apple-itunes-app"]');
    if (!smartBanner) {
      smartBanner = document.createElement("meta");
      smartBanner.setAttribute("name", "apple-itunes-app");
      document.head.appendChild(smartBanner);
    }
    smartBanner.setAttribute(
      "content",
      `app-id=${APPLE_APP_ID}, app-argument=${buildCanonicalUrl("/get-app")}`,
    );

    // LCP: hint browser to fetch hero poster early
    let preload = document.querySelector('link[data-get-app-poster]') as HTMLLinkElement | null;
    if (!preload) {
      preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "image";
      preload.href = HERO_POSTER;
      preload.setAttribute("data-get-app-poster", "1");
      document.head.appendChild(preload);
    }

    trackLandingEvent("landing_page_view", { store_target: target, headline_variant: "cro_pass_v3" });
    initMetaGetAppPixel();
    trackMetaGetAppPageView({ store_target: target, headline_variant: "cro_pass_v3" });
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
            "AmyNest helps parents with personalized guidance for sleep, meals, learning, emotions, routines and development from newborn to age 10+.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          installUrl: PLAY_STORE_URL,
          downloadUrl: PLAY_STORE_URL,
          url: buildCanonicalUrl("/get-app"),
          sameAs: [PLAY_STORE_URL, APP_STORE_URL],
          featureList: [
            "AMY AI Parenting Assistant",
            "AI Daily Routine Generator",
            "Infant Parenting Hub",
            "Nutrition Hub",
            "Speech Coach",
            "Smart Study Zone",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
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
        @keyframes slFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .sl-fade { animation: slFadeUp 0.5s ease-out both; }
        .sl-fade-1 { animation: slFadeUp 0.5s ease-out 0.06s both; }
        .sl-fade-2 { animation: slFadeUp 0.5s ease-out 0.12s both; }
        .sl-fade-3 { animation: slFadeUp 0.5s ease-out 0.18s both; }
        @media (prefers-reduced-motion: reduce) {
          .sl-fade, .sl-fade-1, .sl-fade-2, .sl-fade-3 { animation: none !important; }
        }
        .sl-gradient-text {
          background: linear-gradient(90deg,#e9d5ff,#f9a8d4,#7dd3fc);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .sl-glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        @keyframes slTyping { 0%,60%,100% { opacity:0.25; transform:translateY(0); } 30% { opacity:1; transform:translateY(-2px); } }
        .sl-typing-dot { animation: slTyping 1.1s ease-in-out infinite; }
        .sl-typing-dot:nth-child(2) { animation-delay: 0.18s; }
        .sl-typing-dot:nth-child(3) { animation-delay: 0.36s; }
        @media (prefers-reduced-motion: reduce) { .sl-typing-dot { animation: none !important; } }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full opacity-25" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.5),transparent 68%)" }} />
        <div className="absolute top-[30%] -right-28 w-[360px] h-[360px] rounded-full opacity-18" style={{ background: "radial-gradient(circle,rgba(99,102,241,0.4),transparent 68%)" }} />
      </div>

      <header
        className="sticky top-0 z-30 border-b border-white/10"
        style={{ background: "rgba(10, 8, 22, 0.92)" }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <img src={OFFICIAL_LOGO} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover" />
            <span className="font-quicksand font-black text-sm sm:text-base text-white">AmyNest</span>
          </div>
          <a
            href={getStoreMeta(target).href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackStoreClick(target, "header")}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-sm font-bold text-slate-950 bg-white hover:scale-[1.02] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300"
          >
            {PRIMARY_CTA}
          </a>
        </div>
      </header>

      {/* HERO — 3-second value: emotion → product → CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-4 pb-4 md:pt-10 md:pb-8" aria-labelledby="hero-heading">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3 lg:gap-y-3 items-center">
          <h1
            id="hero-heading"
            className="sl-fade-1 font-quicksand font-black text-[1.7rem] sm:text-4xl lg:text-[2.65rem] leading-[1.1] tracking-tight text-center lg:text-left lg:col-start-1 lg:row-start-1"
          >
            Stop Guessing.{" "}
            <span className="sl-gradient-text">Get Today&apos;s Plan.</span>
          </h1>
          <p className="sl-fade-2 text-white/70 text-[14px] sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 text-center lg:text-left lg:col-start-1 lg:row-start-2">
            Sleep, meals, routines, speech &amp; learning — clear next steps for your child&apos;s age.
          </p>

          <div className="sl-fade-2 max-w-[200px] sm:max-w-[220px] lg:max-w-[280px] mx-auto lg:col-start-2 lg:row-start-1 lg:row-span-5 lg:self-center">
            <HeroPhonePreview imageSrc={profile.phoneImage} />
          </div>

          <div className="sl-fade-2 flex justify-center lg:justify-start lg:col-start-1 lg:row-start-3">
            {profile.infantFree ? (
              <InfantFreePill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
            ) : (
              <RiskReversal />
            )}
          </div>

          <div className="sl-fade-3 max-w-lg mx-auto lg:mx-0 w-full lg:col-start-1 lg:row-start-4">
            <StoreButtonRow
              location="hero"
              primaryTarget={target}
              ctaLabel={profile.ctaLabel}
              size="large"
            />
            {profile.infantFree ? <RiskReversal className="mt-2.5 text-center lg:text-left" /> : null}
          </div>

          <div className="sl-fade-3 flex flex-col items-center lg:items-start gap-3 lg:col-start-1 lg:row-start-5">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-[12px] text-white/55">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />Free to start</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-sky-300" />Child-safe</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-purple-300" />Privacy-first</span>
            </div>
            <DesktopQrBlock primaryTarget={target} />
          </div>
        </div>
      </section>

      <OutcomesSection />
      <AgePersonalizationSection profile={profile} onSelect={selectAge} />
      <TryAmyDemoSection age={profile.id} ctaLabel={profile.ctaLabel} primaryTarget={target} />
      <FeatureFlowsSection profile={profile} primaryTarget={target} />
      <AfterInstallSection />
      <TomorrowPreviewSection profile={profile} />
      <TrustSection />
      <FaqSection />

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-28 md:pb-14 pt-2" aria-labelledby="final-cta-heading">
        <div
          className="sl-glass rounded-3xl px-6 py-8 md:px-12 md:py-10 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.1) 100%)",
            borderColor: "rgba(168,85,247,0.28)",
          }}
        >
          <img
            src={OFFICIAL_LOGO}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-2xl object-cover mx-auto mb-3"
            style={{ boxShadow: "0 16px 48px rgba(124,58,237,0.35)" }}
          />
          <h2 id="final-cta-heading" className="font-quicksand font-black text-2xl sm:text-3xl mb-2 leading-tight">
            Get today&apos;s parenting plan
          </h2>
          <p className="text-white/65 text-sm sm:text-base max-w-md mx-auto mb-5 leading-relaxed">
            {profile.heroLine}
          </p>
          <div className="max-w-lg mx-auto mb-2">
            <StoreButtonRow size="large" location="final_cta" primaryTarget={target} ctaLabel={profile.ctaLabel} />
          </div>
          <RiskReversal />
        </div>
      </section>

      <StickyMobileCta ctaLabel={profile.ctaLabel} primaryTarget={target} />
      <ExitIntentModal ctaLabel={profile.ctaLabel} primaryTarget={target} />

      <footer className="relative z-10 px-4 py-6 border-t border-white/10 text-center">
        <div className="space-y-1.5 text-xs text-white/45">
          <p>AmyNest AI is a product of AmyWorld.</p>
          <p>
            <a href="/privacy" className="underline hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded">
              Privacy
            </a>
            {" · "}
            <a href="/terms" className="underline hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded">
              Terms
            </a>
            {" · "}
            <a href="/support" className="underline hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded">
              Support
            </a>
          </p>
          <p>
            © {new Date().getFullYear()} AmyNest AI · Patent Pending · Not medical advice · Free to start
          </p>
        </div>
      </footer>
    </div>
  );
}
