import { parseApiJson } from "@/lib/safe-json-response";
import { useTranslation } from "react-i18next";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentRoutines, getGetRecentRoutinesQueryKey, useGetBehaviorStats, getGetBehaviorStatsQueryKey, useListRoutines, getListRoutinesQueryKey, useListChildren, getListChildrenQueryKey, type BehaviorStat, type Child } from "@workspace/api-client-react";
import { Redirect, useLocation } from "wouter";
import { AppLink } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
import { Calendar, Users, Star, ArrowRight, TrendingUp, Clock, CheckCircle2, Sparkles, Brain, Heart, Target, ChevronRight, MapPin } from "lucide-react";
import {
  DashboardCoachingCard,
  DashboardCompactStatsRow,
  DashboardMoreInsightsSection,
} from "@/components/dashboard-light-widgets";
import { AmyCoachCheckInCard } from "@/components/amy-coach-check-in-card";
import { formatAge } from "@/lib/age-groups";
import {
  formatRoutineDurationShort,
  formatRoutineTime,
} from "@/lib/routine-timeline-ui";
import { AmyIcon } from "@/components/amy-icon";
import { DashboardSkeleton } from "@/components/route-skeletons/dashboard-skeleton";
import { ContentReveal } from "@/components/premium-ux/content-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { DashboardAvailabilityBanner } from "@/components/dashboard-availability-banner";
import { DashboardSyncStatus } from "@/components/dashboard-sync-status";
import { logDashboardMount } from "@/lib/onboarding-debug";
import { trackAddSecondChildIntent } from "@/lib/onboarding-analytics";
import {
  EMPTY_DASHBOARD_SUMMARY,
  fetchBehaviorStatsResilient,
  fetchChildrenListResilient,
  fetchDashboardSummaryResilient,
  hasDashboardStaleCache,
  readCachedBehaviorStats,
  readCachedChildrenList,
  readCachedDashboardSummary,
  type DashboardSummary as CachedDashboardSummary,
} from "@/lib/dashboard-data-cache";
import { useDashboardShellReady } from "@/hooks/use-dashboard-shell-ready";
import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lazyPage } from "@/lib/safe-import";
import { isAndroidLiteClient } from "@/lib/device-lite";
import {
  generateHeroGreeting,
  heroGreetingRefreshKey,
  type HeroGreeting,
} from "@/lib/generate-hero-greeting";
import {
  consumeHomeContinuityGreeting,
  loadFirstExperienceContinuity,
} from "@/lib/first-experience/continuity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { asRoutineList, routineDateKey, routineItems } from "@/lib/routines";
import { safeFetch } from "@/lib/safe-fetch";
import { cacheRoutineStreak } from "@/lib/routine-streak-cache";
import { computeRoutineStreak } from "@/lib/routine-streak";
import { shouldBypassRoutineGeneratePaywall } from "@/lib/activation-gate";
import { ActivationResumeBanner } from "@/components/activation-resume-banner";
import { readActivationResume } from "@/lib/activation-resume";
import { RetentionHubSection } from "@/components/retention/retention-hub";
import { FeatureDiscoveryStrip } from "@/components/feature-discovery-strip";
import { FF_DASHBOARD_PRIORITY_ORDER } from "@/lib/dashboard-feature-flags";
import {
  FF_FIRST_VALUE_HERO,
  FF_FIRST_VALUE_DASHBOARD_PRIORITY,
} from "@/lib/first-value-activation-flags";
import {
  trackDashboardView,
  trackRoutineCtaClicked,
} from "@/lib/first-value-telemetry";
import { FirstValueHeroCard } from "@/components/first-value-hero-card";
import {
  resolveDashboardUserState,
  shouldShowActivationResumeBanner,
  shouldShowFeatureDiscovery,
  timelineFlexOrderClass,
} from "@/lib/dashboard-priority";
import { useRetention } from "@/hooks/use-retention";
import { useTrialState } from "@/hooks/use-trial-state";
import { pickRoutineForIntelligence, resolveFamilyIntelligenceSurface } from "@/lib/family-intelligence-surface";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { SevenDayJourneyCard } from "@/components/seven-day-journey-card";
import { InfantDashboardShortcut } from "@/components/infant/infant-dashboard-shortcut";
import { FF_INFANT_V2 } from "@/lib/infant-feature-flags";
import { useJourney } from "@/hooks/use-journey";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import {
  DASHBOARD_AMBIENT_TOP,
  DASHBOARD_CONTENT_AREA,
  DASHBOARD_CONTENT_GRADIENT,
  DASHBOARD_CHIP_IDLE,
  DASHBOARD_CHIP_SELECTED,
  DASHBOARD_TINTS,
} from "@/lib/dashboard-premium";
import { TodayHomeHero } from "@/components/today-home/today-home-hero";
import { isTodayHomeV1Enabled } from "@/lib/today-home/feature-flags";
import { resolveTodayNrt } from "@/lib/today-home/resolve-today-nrt";
import {
  buildWeatherInsightLine,
  resolveSupportingInsight,
  weatherChangesRecommendation,
} from "@/lib/today-home/supporting-insight";
import {
  trackTodayNrtCta,
  trackTodayNrtShown,
} from "@/lib/today-home/telemetry";

const HeroWeatherAmbient = lazyPage(() =>
  import("@/components/HeroWeatherAmbient").then((m) => ({
    default: m.HeroWeatherAmbient,
  })),
);
const POLL_INTERVAL_MS = 30_000;
type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
  ageBand?: string;
};
type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
  adaptations?: string[] | null;
};
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "dashboard.good_morning";
  if (hour >= 12 && hour < 17) return "dashboard.good_afternoon";
  return "dashboard.good_evening";
}

function parseTimeToMinutes(t: string): number {
  const [timePart, period] = (t ?? "").split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let h = hours;
  if (period === "PM" && hours !== 12) h += 12;
  if (period === "AM" && hours === 12) h = 0;
  return h * 60 + (minutes || 0);
}

type ChildRow = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  dobIsEstimated?: boolean;
  educationStage?: string | null;
};

const TODAY_HOME_V1 = isTodayHomeV1Enabled();

function filterRoutinesByChild(routines: Routine[], childId: number | null): Routine[] {
  if (childId == null) return routines;
  return routines.filter((r) => r.childId === childId);
}

// audit-block-ignore-start
// ─── Smart Hero Section — Live Weather Intelligence Card ─────────────────

type ChildBasic = { id: number; name: string; age: number; ageMonths: number };

const AQI_META: Record<string, { label: string; dotColor: string }> = {
  excellent:           { label: "Excellent",      dotColor: "#22c55e" },
  good:                { label: "Good",           dotColor: "#4ade80" },
  moderate:            { label: "Moderate",       dotColor: "#facc15" },
  unhealthy_sensitive: { label: "Sensitive",      dotColor: "#fb923c" },
  unhealthy:           { label: "Unhealthy",      dotColor: "#ef4444" },
  very_unhealthy:      { label: "Very Unhealthy", dotColor: "#a855f7" },
  hazardous:           { label: "Hazardous!",     dotColor: "#f43f5e" },
};

const WEATHER_EMOJI_MAP: Record<string, string> = {
  sunny: "☀️", cloudy: "⛅", rainy: "🌧️", stormy: "⛈️",
  humid: "🌊", cold: "❄️", heatwave: "🌡️", windy: "🌬️", foggy: "🌫️",
};

// Semantic colour coding for smart tags — makes the hero scannable at a glance.
type TagStyle = { bg: string; border: string; dot: string };
const HERO_TAG_STYLES: Record<string, TagStyle> = {
  "High Pollution Alert":        { bg: "rgba(239,68,68,0.18)",  border: "rgba(239,68,68,0.42)",  dot: "#ef4444" },
  "Hydration Day":               { bg: "rgba(56,189,248,0.18)", border: "rgba(56,189,248,0.42)", dot: "#38bdf8" },
  "UV Protection Day":           { bg: "rgba(250,204,21,0.18)", border: "rgba(250,204,21,0.46)", dot: "#facc15" },
  "Indoor Activity Recommended": { bg: "rgba(251,146,60,0.18)", border: "rgba(251,146,60,0.42)", dot: "#fb923c" },
  "Limited Outdoor Time":        { bg: "rgba(251,191,36,0.16)", border: "rgba(251,191,36,0.40)", dot: "#fbbf24" },
  "Outdoor Play Friendly":       { bg: "rgba(74,222,128,0.18)", border: "rgba(74,222,128,0.42)", dot: "#4ade80" },
  "Clean Air Day":               { bg: "rgba(74,222,128,0.18)", border: "rgba(74,222,128,0.42)", dot: "#4ade80" },
  "Good Sleep Weather":          { bg: "rgba(129,140,248,0.18)",border: "rgba(129,140,248,0.42)",dot: "#818cf8" },
};
const DEFAULT_TAG_STYLE: TagStyle = { bg: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.24)", dot: "#ffffff" };

function getHeroGradient(condition: string | undefined): { bg: string; glowA: string; glowB: string } {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  if (isNight) return {
    bg: "linear-gradient(135deg,#3b1f6b 0%,#2d1558 55%,#1e0d45 100%)",
    glowA: "rgba(107,64,160,0.55)", glowB: "rgba(60,20,100,0.40)",
  };
  switch (condition) {
    case "rainy": case "stormy": return {
      bg: "linear-gradient(135deg,#3a72c0 0%,#2d5fa8 55%,#2050a0 100%)",
      glowA: "rgba(90,160,240,0.45)", glowB: "rgba(60,100,200,0.38)",
    };
    case "cold": return {
      bg: "linear-gradient(135deg,#5b8eb5 0%,#4a7da4 55%,#3a6b90 100%)",
      glowA: "rgba(140,190,220,0.45)", glowB: "rgba(80,140,180,0.38)",
    };
    case "cloudy": case "foggy": return {
      bg: "linear-gradient(135deg,#7c6fcd 0%,#6458b0 55%,#5448a0 100%)",
      glowA: "rgba(160,150,220,0.45)", glowB: "rgba(100,90,180,0.38)",
    };
    case "heatwave": return {
      bg: "linear-gradient(135deg,#e84040 0%,#cc2020 55%,#aa1010 100%)",
      glowA: "rgba(240,100,80,0.55)", glowB: "rgba(200,60,40,0.42)",
    };
    case "humid": return {
      bg: "linear-gradient(135deg,#20b2a0 0%,#1a9a8a 55%,#158070 100%)",
      glowA: "rgba(60,200,190,0.45)", glowB: "rgba(30,160,150,0.38)",
    };
    case "windy": return {
      bg: "linear-gradient(135deg,#6b7db5 0%,#5a6ca0 55%,#4a5b8a 100%)",
      glowA: "rgba(140,160,220,0.45)", glowB: "rgba(100,120,180,0.38)",
    };
    default: return {
      bg: "linear-gradient(135deg,#ff8a65 0%,#ff6f47 55%,#ff5a3c 100%)",
      glowA: "rgba(255,179,138,0.45)", glowB: "rgba(255,138,101,0.38)",
    };
  }
}

function buildInsights(
  snap: { temperatureC?: number; humidityPct?: number; uvIndexMax?: number; aqiUs?: number },
  aqiBucket: string,
  outdoorSuitability: string,
  childProfiles: ChildBasic[],
): string[] {
  const out: string[] = [];
  const { temperatureC: temp, humidityPct: humidity, uvIndexMax: uv } = snap;

  if (aqiBucket === "hazardous")           out.push("⚠️ Hazardous air quality — all children must stay indoors today.");
  else if (aqiBucket === "very_unhealthy") out.push("🏠 Very poor air quality — no outdoor activity recommended.");
  else if (aqiBucket === "unhealthy")      out.push("😷 Poor air quality — limit outdoor play time today.");
  else if (aqiBucket === "unhealthy_sensitive") out.push("🌬️ Air quality may affect sensitive children — monitor outdoor time.");
  else if (aqiBucket === "excellent" || aqiBucket === "good") out.push("🌿 Air quality is excellent — great for outdoor play!");

  if (temp != null) {
    if (temp >= 38)       out.push(`🌡️ Extreme heat (${temp}°C) — keep children cool and offer fluids every 30 min.`);
    else if (temp >= 33)  out.push(`💧 Hot at ${temp}°C — keep ${childProfiles[0]?.name ?? "your child"} hydrated throughout the day.`);
    else if (temp <= 10)  out.push("🧥 Very cold today — bundle up children well before going outside.");
    else if (temp <= 18)  out.push("🧣 Cool weather — a light jacket is recommended for outdoor time.");
    else if (temp >= 20 && temp <= 30 && outdoorSuitability === "yes") out.push("🌳 Perfect temperature for outdoor learning and play!");
  }

  if (humidity != null && humidity >= 85) out.push("👕 Very humid — dress children in lightweight breathable cotton.");
  else if (humidity != null && humidity >= 70 && temp != null && temp >= 28) out.push("🌡️ Hot and humid — extra hydration + light clothing recommended.");

  if (uv != null && uv >= 8)      out.push("☀️ Very high UV — apply SPF 50+ and avoid midday sun.");
  else if (uv != null && uv >= 5) out.push("🕶️ UV is elevated — sunscreen before any outdoor activity.");

  childProfiles.forEach(child => {
    const totalMonths = child.age * 12 + child.ageMonths;
    if (totalMonths < 12) {
      out.push(temp != null && temp >= 30
        ? `👶 ${child.name} (${totalMonths}mo) may overheat faster — check comfort regularly.`
        : `👶 Infants like ${child.name} need hydration even indoors today.`);
    } else if (child.age >= 1 && child.age <= 3 && outdoorSuitability === "yes") {
      out.push(`🌳 Great weather for ${child.name}'s outdoor sensory play!`);
    } else if (child.age >= 4 && child.age <= 7) {
      out.push(outdoorSuitability === "yes"
        ? `📚 Perfect day for ${child.name}'s outdoor learning activities.`
        : `🎨 Indoor day — try creative play or storytime with ${child.name}.`);
    } else if (child.age >= 8 && uv != null && uv >= 5) {
      out.push(`🎒 Remind ${child.name} to apply sunscreen before heading out.`);
    }
  });

  const hour = new Date().getHours();
  if (hour >= 15 && hour <= 17 && outdoorSuitability !== "no" && (temp == null || temp < 33)) {
    out.push("🌅 Best outdoor window: 5–6 PM when temperatures are cooler.");
  }
  if (hour >= 19) out.push("🌙 Evening wind-down — limit screen time 30 min before bed.");

  return out.length > 0 ? out : ["✨ All conditions look good — have a wonderful day with your child!"];
}

function getHeroTags(
  aqiBucket: string,
  outdoorSuitability: string,
  snap: { temperatureC?: number; uvIndexMax?: number; humidityPct?: number },
): string[] {
  const tags: string[] = [];
  if (outdoorSuitability === "yes")          tags.push("Outdoor Play Friendly");
  else if (outdoorSuitability === "limited") tags.push("Limited Outdoor Time");
  else                                       tags.push("Indoor Activity Recommended");

  if (["hazardous", "very_unhealthy", "unhealthy"].includes(aqiBucket)) tags.push("High Pollution Alert");
  else if (["excellent", "good"].includes(aqiBucket))                   tags.push("Clean Air Day");

  if (snap.temperatureC != null && snap.temperatureC >= 32) tags.push("Hydration Day");
  if (snap.uvIndexMax   != null && snap.uvIndexMax   >= 5)  tags.push("UV Protection Day");
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 6) tags.push("Good Sleep Weather");

  return tags.slice(0, 3);
}

// Country-code → full display name (used when GPS is not granted)
const CC_TO_COUNTRY: Record<string, string> = {
  IN: "India", US: "United States", GB: "United Kingdom", UK: "United Kingdom",
  AE: "United Arab Emirates", SG: "Singapore", AU: "Australia", CA: "Canada",
  NZ: "New Zealand", ZA: "South Africa", MY: "Malaysia", PH: "Philippines",
  NG: "Nigeria", KE: "Kenya", PK: "Pakistan", BD: "Bangladesh",
};

/** "Delhi, IN" → "India" | "Singapore" → "Singapore" | unknown → null */
function extractCountryFromCtxLabel(label: string): string | null {
  const parts = label.split(",");
  const cc = parts[parts.length - 1]?.trim().toUpperCase();
  if (!cc) return null;
  // Single-word label like "Singapore" — return as-is
  if (parts.length === 1) return cc.charAt(0) + cc.slice(1).toLowerCase();
  return CC_TO_COUNTRY[cc] ?? null;
}

function SmartHeroSection({
  displayName,
  hasChildren,
  childProfiles,
  journeyStreak = 0,
  routineStreak = 0,
  behaviorLoggedToday,
}: {
  displayName: string;
  hasChildren: boolean;
  childProfiles: ChildBasic[];
  journeyStreak?: number;
  routineStreak?: number;
  behaviorLoggedToday?: boolean;
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const timeLabel = t(getGreetingKey());
  const reducedMotion = useReducedMotion() ?? false;

  const [geo, setGeo]           = useState<{ lat: number; lng: number } | null>(null);
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    let done = false;
    const fallback = setTimeout(() => { if (!done) { done = true; setGeoReady(true); } }, 3000);
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!done) { done = true; clearTimeout(fallback); setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoReady(true); } },
        ()    => { if (!done) { done = true; clearTimeout(fallback); setGeoReady(true); } },
        { timeout: 2500, maximumAge: 600_000 },
      );
    } else { clearTimeout(fallback); setGeoReady(true); }
    return () => { done = true; clearTimeout(fallback); };
  }, []);

  const { data: envData, isError } = useQuery({
    queryKey: ["hero-env-ctx", geo?.lat, geo?.lng],
    queryFn: async () => {
      const qs = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : "";
      const res = await authFetch(`/api/environment/context${qs}`);
      if (!res.ok) throw new Error("env");
      return parseApiJson(res) as Promise<{ context: any; childName: string | null }>;
    },
    enabled: geoReady,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const ctx  = envData?.context;
  const snap = ctx?.snapshot ?? {};
  const aqiBucket          = ctx?.aqiBucket          ?? "moderate";
  const weatherCondition   = ctx?.weatherCondition;
  const outdoorSuitability = ctx?.outdoorSuitability ?? "limited";

  const insights = useMemo(
    () => ctx
      ? buildInsights(snap, aqiBucket, outdoorSuitability, childProfiles)
      : ["🌤️ Loading your personalised weather insights…"],
    [ctx, childProfiles],
  );

  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => { setInsightIdx(0); }, [insights]);
  useEffect(() => {
    if (insights.length <= 1) return;
    const id = setInterval(() => setInsightIdx(p => (p + 1) % insights.length), 4000);
    return () => clearInterval(id);
  }, [insights.length]);

  // ── Reverse geocoding: Nominatim (free, no key) — only when GPS is available ──
  const { data: reverseGeoLabel } = useQuery<string | null>({
    queryKey: ["reverse-geo", geo?.lat, geo?.lng],
    queryFn: async () => {
      if (!geo) return null;
      type NominatimResponse = { address?: { city?: string; town?: string; village?: string; state?: string; country_code?: string; county?: string } };
      const data = await safeFetch<NominatimResponse>(
        `https://nominatim.openstreetmap.org/reverse?lat=${geo.lat}&lon=${geo.lng}&format=json&accept-language=en`,
        { headers: { "User-Agent": "AmyNest/1.0 (parenting-app)" } },
      );
      if (data?.fallback) return null;
      const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county;
      const state = data.address?.state;
      const cc = data.address?.country_code?.toUpperCase();
      if (city && state) return `${city}, ${state}`;
      if (city && cc)    return `${city}, ${cc}`;
      if (state && cc)   return `${state}, ${cc}`;
      return null;
    },
    enabled: !!geo,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  // Resolved display label:
  //   GPS granted  → reverse-geocoded "City, State" (e.g. "Mumbai, Maharashtra")
  //   GPS denied   → just country name (e.g. "India") extracted from ctx.location.label
  const ctxLocationLabel = ctx?.location?.label;
  const fallbackCountry =
    ctxLocationLabel && ctxLocationLabel !== "User location"
      ? extractCountryFromCtxLabel(ctxLocationLabel)
      : null;
  const locationLabel: string | null = reverseGeoLabel ?? fallbackCountry;

  const grad    = getHeroGradient(weatherCondition);
  const aqiMeta = AQI_META[aqiBucket] ?? AQI_META.moderate;
  const heroTags = ctx ? getHeroTags(aqiBucket, outdoorSuitability, snap) : [];
  const weatherEmoji = WEATHER_EMOJI_MAP[weatherCondition ?? ""] ?? "🌤️";
  const nowTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const isDay = (() => {
    const h = new Date().getHours();
    return h >= 6 && h < 20;
  })();

  const greetingRefreshKey = heroGreetingRefreshKey({ weatherCondition });
  const [heroGreeting, setHeroGreeting] = useState<HeroGreeting>(() => {
    const continuity = consumeHomeContinuityGreeting();
    if (continuity) {
      return { id: "fe-continuity", title: continuity.title, subtitle: continuity.subtitle };
    }
    return generateHeroGreeting({
      displayName: displayName || undefined,
      weatherCondition,
      isDay,
      journeyStreak,
      routineStreak,
      behaviorLoggedToday,
    });
  });

  useEffect(() => {
    // Never overwrite the inherited first-experience greeting this session.
    if (heroGreeting.id === "fe-continuity") return;
    setHeroGreeting(
      generateHeroGreeting({
        displayName: displayName || undefined,
        weatherCondition,
        isDay,
        journeyStreak,
        routineStreak,
        behaviorLoggedToday,
      }),
    );
    // Refresh only when the day or weather classification changes (not mid-read).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingRefreshKey, displayName]);

  return (
    <div
      data-on-dark
      className="relative overflow-hidden rounded-3xl border border-white/10 px-5 sm:px-7 py-5 sm:py-6 shadow-xl"
      style={{ background: grad.bg, transition: "background 0.8s ease" }}
    >
      {/* Glow blobs */}
      <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full pointer-events-none blur-3xl" style={{ background: grad.glowA }} />
      <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full pointer-events-none blur-3xl" style={{ background: grad.glowB }} />

      {/* Weather-reactive ambient layer — skipped on Android PWA (GPU / memory). */}
      {!isAndroidLiteClient() && (
        <Suspense fallback={null}>
          <HeroWeatherAmbient
            weatherCondition={weatherCondition}
            isDay={isDay}
          />
        </Suspense>
      )}

      {/* Row 1: greeting label + weather condition pill (temp lives in the metrics bar) */}
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/65">{timeLabel}</p>
        {ctx && weatherCondition && (
          <div className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/20 text-[11px] font-bold text-white/90 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.25)" }}>
            <span>{weatherEmoji}</span>
            <span className="capitalize">{weatherCondition.replace(/_/g, " ")}</span>
          </div>
        )}
      </div>

      {/* Dynamic greeting — refreshes on day / weather change only */}
      <AnimatePresence mode="wait">
        <motion.div
          key={heroGreeting.id}
          className="relative mt-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-quicksand text-2xl sm:text-[27px] font-black text-white leading-[1.12] tracking-tight">
            {heroGreeting.title}
          </h1>
          <p className="mt-1 text-[13px] sm:text-sm text-white/78 font-medium leading-snug max-w-xl">
            {heroGreeting.subtitle}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Rotating insight — highlighted glass chip with accent bar */}
      <div className="relative mt-3 min-h-[44px]">
        <div
          key={insightIdx}
          className="flex items-start gap-2.5 rounded-xl border border-white/10 pl-3 pr-3 py-2 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1 duration-500"
          style={{ background: "rgba(0,0,0,0.18)", borderLeft: "3px solid rgba(255,255,255,0.55)" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-white/80 shrink-0 mt-[3px]" />
          <p className="text-[13px] sm:text-sm text-white font-medium leading-snug">
            {isError ? "⚠️ Unable to fetch live weather currently." : insights[insightIdx]}
          </p>
        </div>
      </div>

      {/* Smart tags — semantic colour coding for instant scanning */}
      {heroTags.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5 mt-3">
          {heroTags.map(tag => {
            const ts = HERO_TAG_STYLES[tag] ?? DEFAULT_TAG_STYLE;
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 text-[10.5px] font-bold rounded-full pl-2 pr-2.5 py-0.5 border text-white backdrop-blur-sm"
                style={{ background: ts.bg, borderColor: ts.border }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: ts.dot, boxShadow: `0 0 6px ${ts.dot}` }} />
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Weather metrics bar — colour-tinted chips for faster scanning */}
      {ctx && (
        <div className="relative flex items-center gap-1.5 sm:gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Location pill — GPS reverse-geocoded or region default */}
          {locationLabel && (
            <div className="shrink-0 flex items-center gap-1 text-[11px] sm:text-xs rounded-lg px-2 py-[3px] sm:py-1 border" style={{ background: "rgba(0,0,0,0.22)", borderColor: "rgba(255,255,255,0.15)" }}>
              <MapPin className="h-3 w-3 text-white/70 shrink-0" />
              {/* i18n-ok: dynamic location label from reverse-geocoding / env API */}
              <span className="font-semibold text-white truncate max-w-[130px]">{locationLabel}</span>
            </div>
          )}
          {snap.temperatureC != null && (
            <div className="shrink-0 flex items-center gap-1 text-[11px] sm:text-xs rounded-lg px-2 py-[3px] sm:py-1 border" style={{ background: "rgba(251,146,60,0.16)", borderColor: "rgba(251,146,60,0.34)" }}>
              🌡️ <span className="font-bold text-white">{snap.temperatureC}°C</span>
              {snap.apparentC != null && snap.apparentC !== snap.temperatureC && (
                <span className="text-white/55 text-[10px] ml-0.5">feels {snap.apparentC}°C</span>
              )}
            </div>
          )}
          {snap.aqiUs != null && (
            <div className="shrink-0 flex items-center gap-1.5 text-[11px] sm:text-xs rounded-lg px-2 py-[3px] sm:py-1 border" style={{ background: `${aqiMeta.dotColor}22`, borderColor: `${aqiMeta.dotColor}5c` }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: aqiMeta.dotColor, boxShadow: `0 0 6px ${aqiMeta.dotColor}` }} />
              <span className="font-bold text-white">AQI {snap.aqiUs}</span>
              <span className="text-white/60 text-[10px]">{aqiMeta.label}</span>
            </div>
          )}
          {snap.humidityPct != null && (
            <div className="shrink-0 flex items-center gap-1 text-[11px] sm:text-xs rounded-lg px-2 py-[3px] sm:py-1 border" style={{ background: "rgba(56,189,248,0.16)", borderColor: "rgba(56,189,248,0.34)" }}>
              💧 <span className="font-bold text-white">{snap.humidityPct}%</span>
            </div>
          )}
          {snap.uvIndexMax != null && (
            <div className="shrink-0 flex items-center gap-1 text-[11px] sm:text-xs rounded-lg px-2 py-[3px] sm:py-1 border" style={{ background: "rgba(250,204,21,0.16)", borderColor: "rgba(250,204,21,0.36)" }}>
              ☀️ <span className="font-bold text-white">UV {snap.uvIndexMax}</span>
            </div>
          )}
        </div>
      )}

      {/* Live status bar */}
      <div className="relative flex items-center gap-2 mt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/10 text-white text-xs backdrop-blur" style={{ background: "rgba(26,19,38,0.80)" }}>
          <span className="relative inline-flex items-center h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#ff7a59" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#ff7a59" }} />
          </span>
          <span className="font-semibold">
            {t("pages.dashboard.live")} · {nowTime}
            {ctx && snap.aqiUs != null && ` · AQI ${aqiMeta.label}`}
          </span>
        </span>
        {!hasChildren && <span className="text-[11px] text-white/65">{t("dashboard.setup_first")}</span>}
      </div>
    </div>
  );
}
// audit-block-ignore-end

// ─── Compact child filter chips ────────────────────────────────────────────
function ChildrenChipBar({
  children,
  selectedChildId,
  onSelectChild,
}: {
  children: ChildRow[];
  selectedChildId: number | null;
  onSelectChild: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  if (!children || children.length === 0) return null;
  const showAll = children.length > 1;
  const selectedChild =
    children.find((c) => c.id === selectedChildId)
    ?? (children.length === 1 ? children[0] : null);

  return (
    <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      {showAll ? (
        <button
          type="button"
          onClick={() => onSelectChild(null)}
          className={`shrink-0 ${selectedChildId == null ? DASHBOARD_CHIP_SELECTED : DASHBOARD_CHIP_IDLE}`}
        >
          {t("dashboard.all_children")}
        </button>
      ) : null}
      {children.map((c) => {
        const ageMonths = c.ageMonths ?? 0;
        const selected = selectedChildId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectChild(selected && showAll ? null : c.id)}
            className={`shrink-0 ${selected ? DASHBOARD_CHIP_SELECTED : DASHBOARD_CHIP_IDLE}`}
          >
            {c.name}
            <span className="font-normal opacity-75 ml-1">{formatAge(c.age, ageMonths)}</span>
          </button>
        );
      })}
      <AddChildLink
        source={children.length === 1 ? "dashboard-add-second-child" : "dashboard-add-child"}
        className="shrink-0 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-xs font-bold text-white/60 hover:border-violet-400/40 hover:text-white/80 transition-colors"
        onClick={() => {
          if (children.length === 1) {
            trackAddSecondChildIntent("dashboard-child-chips", 1);
          }
        }}
      >
        + {children.length === 1 ? t("dashboard.add_second_child") : t("dashboard.add_child")}
      </AddChildLink>
      <AppLink href="/children" source="dashboard-manage-children" className="shrink-0 text-[11px] font-bold text-violet-300 hover:underline ml-auto">
        {t("dashboard.manage")}
      </AppLink>
    </div>
    {selectedChild?.dobIsEstimated ? (
      <p className="text-[11px] font-medium text-white/45 px-0.5">
        {t("dashboard.birthday_not_added")}
      </p>
    ) : null}
    </div>
  );
}

// ─── Now / Next Timeline ───────────────────────────────────────────────────
function TimelineProgressChip({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="text-right shrink-0">
      <p className="text-[11px] font-bold text-amber-300">{t("dashboard.timeline_progress", { done, total })}</p>
      <div className="w-[72px] h-1 rounded-full bg-white/15 mt-1 ml-auto overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NowNextTimeline({
  routines,
  selectedChildName,
  onGenerate,
  journeyHandlesGenerate,
}: {
  routines: Routine[];
  selectedChildName?: string | null;
  onGenerate?: () => void;
  journeyHandlesGenerate?: boolean;
}) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => routineDateKey(r) === todayStr);
  if (todayRoutines.length === 0) {
    return (
      <DashboardGlassCard tintRgb={DASHBOARD_TINTS.timeline}>
        <div className="p-6 text-center space-y-3">
          <div className="text-4xl">🗓️</div>
          <p className="font-bold text-white">
            {selectedChildName
              ? t("dashboard.no_plan_for_child", { name: selectedChildName })
              : t("pages.dashboard.no_plan_for_today_yet")}
          </p>
          <p className="text-xs text-white/65">
            {journeyHandlesGenerate
              ? t("dashboard.no_plan_journey_hint")
              : t("dashboard.no_plan_subtitle")}
          </p>
          {!journeyHandlesGenerate && onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              data-testid="dashboard-generate-routine-btn"
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-300 hover:to-amber-400 text-white font-bold text-sm px-5 py-2.5 shadow-[0_4px_20px_rgba(251,146,60,0.35)] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {t("dashboard.generate_today")}
            </button>
          ) : null}
        </div>
      </DashboardGlassCard>
    );
  }
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const allItems = todayRoutines.flatMap(r => routineItems<RoutineItem>(r).map(item => ({
    ...item,
    childName: r.childName,
    routineId: r.id
  }))).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  let currentIdx = -1;
  for (let i = 0; i < allItems.length; i++) {
    const itemMinutes = parseTimeToMinutes(allItems[i].time);
    const nextMinutes = i + 1 < allItems.length ? parseTimeToMinutes(allItems[i + 1].time) : 24 * 60;
    if (itemMinutes <= nowMinutes && nowMinutes < nextMinutes) {
      currentIdx = i;
      break;
    }
  }
  const displayItems = currentIdx >= 0 ? allItems.slice(currentIdx, currentIdx + 3) : allItems.filter(item => parseTimeToMinutes(item.time) > nowMinutes).slice(0, 3);
  if (displayItems.length === 0) {
    return (
      <DashboardGlassCard tintRgb={DASHBOARD_TINTS.timeline}>
        <div className="p-5 text-center space-y-1">
          <div className="text-3xl">🌙</div>
          <p className="font-bold text-white">{t("pages.dashboard.day_complete")}</p>
          <p className="text-xs text-white/65">{t("pages.dashboard.time_to_relax_and_recharge")}</p>
        </div>
      </DashboardGlassCard>
    );
  }
  const allTodayItems = todayRoutines.flatMap((r) => routineItems<RoutineItem>(r));
  const doneCount = allTodayItems.filter((i) => i.status === "completed").length;
  const nextItem = allItems.find((item) => item.status !== "completed");
  const intelligenceRoutine = pickRoutineForIntelligence(todayRoutines, todayStr);
  const todaySurface = resolveFamilyIntelligenceSurface({
    routines: todayRoutines,
    adaptations: intelligenceRoutine?.adaptations,
  });

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.timeline}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.08]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-300 shrink-0" />
            <span className="font-quicksand font-bold text-sm text-white">{t("dashboard.todays_timeline")}</span>
          </div>
          {nextItem ? (
            <p className="text-[11px] text-white/60 mt-1 truncate">
              {t("dashboard.timeline_next_up", { task: nextItem.activity })}
            </p>
          ) : doneCount > 0 && doneCount >= allTodayItems.length ? (
            <p className="text-[11px] text-white/60 mt-1">{t("dashboard.day_complete")}</p>
          ) : null}
        </div>
        <TimelineProgressChip done={doneCount} total={allTodayItems.length} />
      </div>
      {todaySurface ? (
        <div className="px-4 py-2 border-b border-white/[0.08] bg-white/[0.04]">
          <p className="text-[11px] leading-snug text-white/75">
            <Sparkles className="h-3 w-3 inline mr-1 align-text-bottom text-amber-300" />
            {todaySurface.headline}
          </p>
        </div>
      ) : null}
      <div className="p-3 space-y-1.5">
        {displayItems.map((item, idx) => {
        const isCurrent = currentIdx >= 0 && idx === 0;
        const isNext = idx === (currentIdx >= 0 ? 1 : 0);
        const completed = item.status === "completed";
        return <AppLink key={`${item.routineId}-${idx}`} href={`/routines/${item.routineId}`} source="dashboard-routine-timeline">
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_4px_16px_rgba(251,146,60,0.30)]" : "bg-white/[0.06] hover:bg-white/[0.10]"}`}>
                <div className={`flex flex-col items-center w-14 shrink-0 ${isCurrent ? "text-white" : "text-white/55"}`}>
                  <div className="text-xs font-bold">{formatRoutineTime(item.time)}</div>
                  {isCurrent && <span className="mt-1 text-[9px] font-black uppercase bg-white/25 px-1.5 py-0.5 rounded-full">{t("pages.dashboard.now")}</span>}
                  {!isCurrent && isNext && <span className="mt-1 text-[9px] font-black uppercase bg-white/10 text-amber-200 px-1.5 py-0.5 rounded-full">{t("pages.dashboard.next")}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${isCurrent ? "text-white" : "text-white/90"} ${completed ? "line-through opacity-60" : ""}`} style={{
                wordBreak: "break-word",
                whiteSpace: "normal"
              }}>
                    {item.activity}
                  </div>
                  <div className={`text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap ${isCurrent ? "text-white/75" : "text-white/55"}`}>
                    <span>{[item.childName, formatRoutineDurationShort(item)].filter(Boolean).join(" · ")}</span>
                    {item.ageBand && <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${isCurrent ? "bg-white/20 text-white border-white/30" : "text-amber-200/90 bg-white/[0.06] border-white/10"}`}>
                        <Users className="h-2.5 w-2.5" />
                        {t("pages.dashboard.ages")} {item.ageBand.replace("-", "–")}
                      </span>}
                  </div>
                </div>
                {completed && !isCurrent && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              </div>
            </AppLink>;
      })}
      </div>
    </DashboardGlassCard>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────
function OnboardingScreen({
  displayName
}: {
  displayName: string;
}) {
  const {
    t
  } = useTranslation();
  const features = [{
    icon: <Brain className="h-5 w-5" />,
    emoji: "🧠",
    label: "Amy AI Routine Generator",
    desc: "Smart daily schedules tailored to your child's age and needs.",
    color: "from-primary to-primary",
    bg: "bg-muted dark:bg-card border-border dark:border-border"
  }, {
    icon: <TrendingUp className="h-5 w-5" />,
    emoji: "📊",
    label: "Progress Tracking",
    desc: "Monitor growth, streaks, and milestones in one beautiful view.",
    color: "from-primary to-primary",
    bg: "bg-muted dark:bg-card border-border dark:border-border"
  }, {
    icon: <Target className="h-5 w-5" />,
    emoji: "🎯",
    label: "Daily Activities",
    desc: "Age-based activities that build skills while keeping kids engaged.",
    color: "from-primary to-primary",
    bg: "bg-muted dark:bg-card border-border dark:border-border"
  }, {
    icon: <Star className="h-5 w-5" />,
    emoji: "🧩",
    label: "Learning & Puzzles",
    desc: "Adaptive daily puzzles that grow harder as your child levels up.",
    color: "from-primary to-primary",
    bg: "bg-muted dark:bg-card border-border dark:border-border"
  }, {
    icon: <Heart className="h-5 w-5" />,
    emoji: "❤️",
    label: "Parenting Tips",
    desc: "Expert-curated tips, sleep guides, and milestone insights.",
    color: "from-primary to-primary",
    bg: "bg-muted dark:bg-card border-border dark:border-border"
  }];
  return <div className="min-h-[80vh] flex flex-col items-center justify-start animate-in fade-in duration-500">
      <div data-on-dark className="w-full rounded-3xl bg-gradient-to-br from-primary via-primary to-primary p-8 mb-8 text-white text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-12 translate-x-12 blur-sm" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-white/10 translate-y-10 -translate-x-10 blur-sm" />
        <div className="relative z-10 flex justify-center mb-5">
          <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="80" cy="128" rx="55" ry="8" fill="white" fillOpacity="0.15" />
            <rect x="42" y="68" width="26" height="48" rx="13" fill="white" fillOpacity="0.9" />
            <circle cx="55" cy="55" r="18" fill="white" fillOpacity="0.95" />
            <circle cx="49" cy="53" r="2.5" fill="hsl(var(--brand-indigo-500))" />
            <circle cx="61" cy="53" r="2.5" fill="hsl(var(--brand-indigo-500))" />
            <path d="M49 60 Q55 65 61 60" stroke="hsl(var(--brand-indigo-500))" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M68 82 Q88 72 96 78" stroke="white" strokeOpacity="0.9" strokeWidth="10" strokeLinecap="round" />
            <rect x="90" y="88" width="22" height="36" rx="11" fill="white" fillOpacity="0.85" />
            <circle cx="101" cy="76" r="14" fill="white" fillOpacity="0.95" />
            <circle cx="96.5" cy="74" r="2" fill="hsl(var(--brand-pink-500))" />
            <circle cx="105.5" cy="74" r="2" fill="hsl(var(--brand-pink-500))" />
            <path d="M97 80 Q101 84 105 80" stroke="hsl(var(--brand-pink-500))" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <text x="22" y="42" fontSize="16" fill="white" fillOpacity="0.7">✨</text>
            <text x="120" y="50" fontSize="12" fill="white" fillOpacity="0.6">⭐</text>
            <text x="118" y="100" fontSize="10" fill="white" fillOpacity="0.5">🌟</text>
          </svg>
        </div>
        <div className="relative z-10 space-y-2">
          <p className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">{t("pages.dashboard.meet_amy_ai")}</p>
          <h1 className="text-3xl font-black leading-tight">
            👋 Hi{displayName ? `, ${displayName}` : ""} 😊
          </h1>
          <p className="text-muted-foreground text-lg font-medium">{t("pages.dashboard.i_m_amy_your_smart_parenting_partner")}</p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed mt-1">
            {t("pages.dashboard.create_personalised_routines_track_progress_and_make_parenti")}
          </p>
        </div>
      </div>
      <div className="w-full flex items-center justify-center gap-2 mb-7">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
        <p className="text-sm font-bold text-muted-foreground px-3 text-center">
          {t("pages.dashboard.start_your_child_s_smart_routine_today")}
        </p>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
      </div>
      <div className="w-full grid grid-cols-1 gap-3 mb-8">
        {features.map((f, i) => <div key={f.label} className={`flex items-center gap-4 rounded-2xl border p-4 ${f.bg} animate-in fade-in duration-400`} style={{
        animationDelay: `${i * 80}ms`
      }}>
            <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
              {f.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{f.emoji} {f.label}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          </div>)}
      </div>
      <div className="w-full space-y-3">
        <AppLink href="/amy-coach" source="dashboard-experience-amy-coach">
          <button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary text-white font-black text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("pages.dashboard.experience_now")}
          </button>
        </AppLink>
        <AppLink href="/parenting-hub" source="dashboard-explore-parenting-hub">
          <button className="w-full h-12 rounded-2xl border-2 border-border bg-background text-foreground font-bold text-sm hover:bg-muted/50 hover:border-border active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <BookOpenIcon />
            {t("pages.dashboard.explore_parenting_hub")}
          </button>
        </AppLink>
        <AppLink href="/life-skills" source="dashboard-life-skills">
          <button className="w-full h-12 rounded-2xl border-2 border-[hsl(var(--brand-emerald-400))] dark:border-[hsl(var(--brand-emerald-700))] bg-[hsl(var(--brand-emerald-100)/0.5)] dark:bg-[hsl(var(--brand-emerald-800)/0.2)] text-[hsl(var(--brand-emerald-800))] dark:text-[hsl(var(--brand-emerald-100))] font-bold text-sm hover:bg-[hsl(var(--brand-emerald-100)/0.7)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            🧭 Life Skills Mode
          </button>
        </AppLink>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-6 pb-4">
        {t("pages.dashboard.works_for_ages_0_15_years_science_backed_parenting_plans")}
      </p>
    </div>;
}
function BookOpenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>;
}
export default function Dashboard() {
  const {
    t
  } = useTranslation();
  const {
    user,
    isLoaded: userLoaded,
    isSignedIn,
  } = useUser();
  const { isLoaded: authLoaded, authStatus } = useAuth();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const onboardingData = queryClient.getQueryData(["onboarding-status"]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const {
    isPremium,
    entitlements,
    loading: subLoading,
  } = useSubscription();
  const { trialDaysRemaining } = useTrialState();
  const {
    openPaywall
  } = usePaywall();
  const profileFetchedRef = useRef(false);
  const displayName =
    profileName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "";
  const staleCacheOnBoot = useMemo(() => hasDashboardStaleCache(), []);
  const {
    data: summary,
    isLoading: loadingSummary,
    isFetching: fetchingSummary,
    isError: isErrorSummary,
    dataUpdatedAt: summaryUpdatedAt,
    refetch: refetchSummary,
  } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      queryFn: () => fetchDashboardSummaryResilient(authFetch),
      placeholderData: () => readCachedDashboardSummary() ?? EMPTY_DASHBOARD_SUMMARY,
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  });
  const {
    data: routines,
    isLoading: loadingRoutines
  } = useGetRecentRoutines({
    query: {
      queryKey: getGetRecentRoutinesQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true
    }
  });
  const {
    data: allRoutines,
    dataUpdatedAt: routinesUpdatedAt
  } = useListRoutines(undefined, {
    query: {
      queryKey: getListRoutinesQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true
    }
  });
  const {
    data: childrenList,
    isLoading: loadingChildren,
    isFetching: fetchingChildren,
    isError: isErrorChildren,
    refetch: refetchChildren,
  } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      queryFn: () => fetchChildrenListResilient(authFetch) as unknown as Promise<Child[]>,
      placeholderData: () => (readCachedChildrenList() ?? []) as unknown as Child[],
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  });
  const {
    data: stats,
    isLoading: loadingStats,
    isFetching: fetchingStats,
    isError: isErrorStats,
    dataUpdatedAt: statsUpdatedAt,
    refetch: refetchStats,
  } = useGetBehaviorStats({
    query: {
      queryKey: getGetBehaviorStatsQueryKey(),
      queryFn: () => fetchBehaviorStatsResilient(authFetch) as unknown as Promise<BehaviorStat[]>,
      placeholderData: () => (readCachedBehaviorStats() ?? []) as unknown as BehaviorStat[],
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  });
  const authReady = userLoaded && authLoaded && authStatus !== "loading";
  const primaryQueriesSettled =
    authReady &&
    isSignedIn &&
    !fetchingSummary &&
    !subLoading &&
    !fetchingChildren &&
    !fetchingStats;
  const shellReady = useDashboardShellReady({
    hasStaleCache: staleCacheOnBoot,
    queriesSettled: primaryQueriesSettled,
  });

  const childrenSafe = Array.isArray(childrenList) ? childrenList : [];
  const recentRoutinesSafe = asRoutineList<Routine>(routines);
  const statsSafe = Array.isArray(stats) ? stats : [];
  const allRoutinesSafe = asRoutineList<Routine>(allRoutines);
  const todayKey = new Date().toISOString().slice(0, 10);
  const filteredRoutines = useMemo(
    () => filterRoutinesByChild(allRoutinesSafe, selectedChildId),
    [allRoutines, selectedChildId],
  );
  const filteredRecentRoutines = useMemo(
    () => filterRoutinesByChild(recentRoutinesSafe, selectedChildId),
    [routines, selectedChildId],
  );
  const filteredBehaviorStats = useMemo(() => {
    if (selectedChildId == null) return statsSafe;
    return statsSafe.filter((s: { childId: number }) => s.childId === selectedChildId);
  }, [stats, selectedChildId]);
  const selectedChild = useMemo(
    () => (childrenSafe as ChildRow[]).find((c) => c.id === selectedChildId) ?? null,
    [childrenList, selectedChildId],
  );
  const streak = useMemo(() => computeRoutineStreak(allRoutinesSafe), [allRoutines]);
  const hubUsage = useFeatureUsage();
  const { status: journeyStatus } = useJourney();
  const hasTodayRoutine = useMemo(
    () => allRoutinesSafe.some((r) => routineDateKey(r) === todayKey),
    [allRoutinesSafe, todayKey],
  );
  const journeyHandlesGenerate =
    journeyStatus?.active === true &&
    journeyStatus.todayTask?.taskId === "routine_generate";
  const showTimelineGenerate = !hasTodayRoutine && !journeyHandlesGenerate;
  const suppressAmyGenerate = !hasTodayRoutine;
  const generatePrimarySource = journeyHandlesGenerate
    ? ("journey" as const)
    : showTimelineGenerate
      ? ("timeline" as const)
      : undefined;

  useEffect(() => {
    cacheRoutineStreak(streak);
  }, [streak]);

  const todayProgress = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayList = filterRoutinesByChild(allRoutinesSafe, selectedChildId).filter(
      (r) => routineDateKey(r) === todayKey,
    );
    const items = todayList.flatMap((r) => routineItems<RoutineItem>(r));
    return {
      done: items.filter((i) => i.status === "completed").length,
      total: items.length,
    };
  }, [allRoutines, selectedChildId]);

  const routineCompletionPct =
    todayProgress.total > 0
      ? Math.round((todayProgress.done / todayProgress.total) * 100)
      : 0;
  const {
    data: retentionData,
    isLoading: retentionLoading,
    isError: retentionError,
  } = useRetention({ routineCompletionPct });
  const dashboardUserState = useMemo(
    () =>
      resolveDashboardUserState({
        hasTodayRoutine,
        todayDone: todayProgress.done,
        todayTotal: todayProgress.total,
        checkedInToday: retentionData?.checkedInToday ?? false,
        entitlements,
        trialDaysRemaining,
        inactiveDays: retentionData?.state?.inactiveDays,
      }),
    [
      hasTodayRoutine,
      todayProgress.done,
      todayProgress.total,
      retentionData?.checkedInToday,
      retentionData?.state?.inactiveDays,
      entitlements,
      trialDaysRemaining,
    ],
  );
  const dashboardPriorityEnabled =
    FF_DASHBOARD_PRIORITY_ORDER || FF_FIRST_VALUE_DASHBOARD_PRIORITY;
  const localActivationResume = readActivationResume();
  const showActivationResume = shouldShowActivationResumeBanner(
    dashboardPriorityEnabled,
    localActivationResume,
    !retentionLoading && !retentionError && retentionData != null,
  );
  const showFeatureDiscovery = shouldShowFeatureDiscovery(
    dashboardPriorityEnabled,
    dashboardUserState,
  );
  const timelineOrderClass = timelineFlexOrderClass(dashboardPriorityEnabled);
  const showFirstValueHero =
    !TODAY_HOME_V1 &&
    FF_FIRST_VALUE_HERO &&
    dashboardUserState === "no_routine" &&
    !journeyHandlesGenerate;

  const todayNrtItems = useMemo(() => {
    const todayList = filteredRoutines.filter((r) => routineDateKey(r) === todayKey);
    return todayList.flatMap((r) =>
      routineItems<RoutineItem>(r).map((item) => ({
        time: item.time,
        activity: item.activity,
        duration: item.duration,
        status: item.status,
        routineId: r.id,
      })),
    );
  }, [filteredRoutines, todayKey]);

  const todayNrtDecision = useMemo(() => {
    if (!TODAY_HOME_V1) return null;
    const continuity = loadFirstExperienceContinuity();
    return resolveTodayNrt({
      child: selectedChild
        ? {
            id: selectedChild.id,
            name: selectedChild.name,
            age: selectedChild.age,
            ageMonths: selectedChild.ageMonths ?? 0,
            educationStage: selectedChild.educationStage,
          }
        : null,
      todayRoutineItems: todayNrtItems,
      continuity,
    });
  }, [selectedChild, todayNrtItems]);

  const todayIntelligenceHeadline = useMemo(() => {
    if (!TODAY_HOME_V1) return null;
    const todayList = filteredRoutines.filter((r) => routineDateKey(r) === todayKey);
    if (todayList.length === 0) return null;
    const pick = pickRoutineForIntelligence(todayList, todayKey);
    const surface = resolveFamilyIntelligenceSurface({
      routines: todayList,
      adaptations: pick?.adaptations,
    });
    return surface?.headline ?? null;
  }, [filteredRoutines, todayKey]);

  const { data: todayHomeEnv } = useQuery({
    queryKey: ["today-home-env-ctx"],
    queryFn: async () => {
      const res = await authFetch("/api/environment/context");
      if (!res.ok) throw new Error("env");
      return parseApiJson(res) as Promise<{ context: any }>;
    },
    enabled: TODAY_HOME_V1 && shellReady && !!isSignedIn,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const todaySupportingInsight = useMemo(() => {
    if (!TODAY_HOME_V1 || !todayNrtDecision) return null;
    const ctx = todayHomeEnv?.context;
    const outdoor = ctx?.outdoorSuitability ?? null;
    const aqi = ctx?.aqiBucket ?? null;
    const temp = ctx?.snapshot?.temperatureC ?? null;
    const weatherSignal =
      ctx &&
      weatherChangesRecommendation({
        outdoorSuitability: outdoor,
        aqiBucket: aqi,
        temperatureC: temp,
      })
        ? {
            outdoorSuitability: outdoor,
            aqiBucket: aqi,
            temperatureC: temp,
            line:
              buildWeatherInsightLine({
                outdoorSuitability: outdoor,
                aqiBucket: aqi,
                temperatureC: temp,
              }) ?? "",
          }
        : null;
    const ageMonths =
      selectedChild != null
        ? selectedChild.age * 12 + (selectedChild.ageMonths ?? 0)
        : null;
    const infantLine =
      selectedChild && ageMonths != null && ageMonths < 24
        ? `${selectedChild.name} is still little — keep today’s step close and calm.`
        : null;
    return resolveSupportingInsight({
      weather: weatherSignal,
      familyHeadline: todayIntelligenceHeadline,
      infantLine,
      continuityEmotional: loadFirstExperienceContinuity()?.emotionalContext,
      heroWhy: todayNrtDecision.why,
    });
  }, [
    todayNrtDecision,
    todayHomeEnv,
    todayIntelligenceHeadline,
    selectedChild,
  ]);

  useEffect(() => {
    if (!shellReady || !isSignedIn) return;
    trackDashboardView({
      userState: dashboardUserState,
      hasTodayRoutine,
      routineCount: allRoutinesSafe.length,
      childCount: childrenSafe.length,
    });
  }, [
    shellReady,
    isSignedIn,
    dashboardUserState,
    hasTodayRoutine,
    allRoutinesSafe.length,
    childrenSafe.length,
  ]);

  useEffect(() => {
    if (!TODAY_HOME_V1 || !shellReady || !isSignedIn || !todayNrtDecision) return;
    trackTodayNrtShown({
      source: todayNrtDecision.source,
      childId: todayNrtDecision.childId,
      hasCta: true,
    });
  }, [shellReady, isSignedIn, todayNrtDecision?.source, todayNrtDecision?.childId]);

  useEffect(() => {
    // Single-flight ref lock — once the parent-profile fetch has been
    // attempted (success OR error), we never re-fire it from this effect.
    // Previously the catch block reset the ref, which under StrictMode + a
    // transient network error caused /api/parent-profile to be hit on every
    // render until it eventually succeeded. The dashboard's other queries
    // (useGetDashboardSummary, etc.) already handle their own retries with
    // refetchInterval, so a one-shot here is sufficient.
    if (!authReady || !isSignedIn || profileFetchedRef.current) return;
    profileFetchedRef.current = true;
    void authFetch("/api/parent-profile")
      .then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ name?: string }>(r);
      })
      .then((data) => {
        if (data?.name) setProfileName(data.name);
      })
      .catch((e) => {
        console.error("[dashboard] parent-profile fetch failed", e);
      });
  }, [authReady, isSignedIn, authFetch]);

  const summaryUsesFallback = (summary as CachedDashboardSummary | undefined)?.fallback === true;
  const showAvailabilityBanner =
    shellReady &&
    !fetchingSummary &&
    !fetchingChildren &&
    !fetchingStats &&
    (summaryUsesFallback || isErrorSummary || isErrorChildren || isErrorStats);

  const handleDashboardRetry = useCallback(() => {
    void refetchSummary();
    void refetchChildren();
    void refetchStats();
    void queryClient.invalidateQueries({ queryKey: ["subscription"] });
  }, [queryClient, refetchSummary, refetchChildren, refetchStats]);

  useEffect(() => {
    logDashboardMount({
      user,
      isLoaded: authReady,
      isSignedIn: !!isSignedIn,
      isLoading: !shellReady,
      loadingSummary,
      subLoading,
    });
  }, [
    user?.id,
    authReady,
    isSignedIn,
    shellReady,
    loadingSummary,
    subLoading,
  ]);

  if (!isSignedIn || !user) {
    if (!authReady) return <DashboardSkeleton />;
    console.warn("[dashboard] user missing, redirecting to sign-in");
    return <Redirect to="/sign-in" />;
  }

  if (!shellReady) {
    return <DashboardSkeleton />;
  }

  if (!summary && !loadingSummary && !isErrorSummary) {
    console.warn("[dashboard] summary resolved to undefined without error flag");
  }

  const lastUpdated = Math.max(summaryUpdatedAt ?? 0, routinesUpdatedAt ?? 0, statsUpdatedAt ?? 0);
  const isDashboardRefreshing = fetchingSummary || fetchingChildren || fetchingStats;
  const generateRoutineLocked =
    !isPremium && (entitlements?.usage?.features?.routine_generate?.locked ?? false);
  function handleGenerateRoutine(source = "dashboard_default") {
    trackRoutineCtaClicked({
      source,
      screen: "/dashboard",
      childId: selectedChildId ?? undefined,
      userState: dashboardUserState,
    });
    if (
      generateRoutineLocked &&
      !shouldBypassRoutineGeneratePaywall(allRoutinesSafe.length)
    ) {
      openPaywall("routines_limit");
    } else {
      const childQuery =
        selectedChildId != null ? `?childId=${selectedChildId}&source=${source}` : `?source=${source}`;
      setLocation(`/routines/generate${childQuery}`);
    }
  }

  function handleTodayHomeBegin() {
    if (!todayNrtDecision) return;
    trackTodayNrtCta({
      source: todayNrtDecision.source,
      childId: todayNrtDecision.childId,
      ctaKind: todayNrtDecision.cta.kind,
      userState: dashboardUserState,
    });
    if (todayNrtDecision.cta.kind === "begin_routine" && todayNrtDecision.cta.routineId != null) {
      setLocation(`/routines/${todayNrtDecision.cta.routineId}`);
      return;
    }
    if (todayNrtDecision.cta.kind === "generate") {
      // trackTodayNrtCta already emitted routine_cta_clicked — navigate only.
      if (
        generateRoutineLocked &&
        !shouldBypassRoutineGeneratePaywall(allRoutinesSafe.length)
      ) {
        openPaywall("routines_limit");
      } else {
        const source = "today_nrt_hero";
        const childQuery =
          selectedChildId != null
            ? `?childId=${selectedChildId}&source=${source}`
            : `?source=${source}`;
        setLocation(`/routines/generate${childQuery}`);
      }
    }
    // rest — no pressure, no navigation
  }
  const summaryFallback = (summary as CachedDashboardSummary | undefined)?.fallback === true;
  const noChildren =
    !fetchingSummary &&
    !fetchingChildren &&
    !summaryFallback &&
    !isErrorSummary &&
    !isErrorChildren &&
    childrenSafe.length === 0 &&
    (summary?.totalChildren ?? 0) === 0;
  if (noChildren) {
    return <OnboardingScreen displayName={displayName} />;
  }
  return (
    <div data-on-dark className="dashboard-page w-full min-w-0 max-w-full bg-[#0a1024]">
      <div className="flex flex-col gap-4 pb-6 md:pb-8">
          {showAvailabilityBanner && (
            <DashboardAvailabilityBanner
              visible
              onRetry={handleDashboardRetry}
            />
          )}
          <DashboardSyncStatus
            liveUpdatedAt={lastUpdated}
            isRefreshing={isDashboardRefreshing}
          />
          <ContentReveal.Hero>
            {TODAY_HOME_V1 && todayNrtDecision ? (
              <div className="px-3 pt-3 sm:px-4 sm:pt-4">
                <TodayHomeHero
                  decision={todayNrtDecision}
                  insight={todaySupportingInsight}
                  onBegin={handleTodayHomeBegin}
                />
              </div>
            ) : (
              <SmartHeroSection
                displayName={displayName}
                hasChildren={childrenSafe.length > 0}
                childProfiles={childrenSafe.map((c: any) => ({ id: c.id, name: c.name, age: c.age, ageMonths: c.ageMonths ?? 0 }))}
                journeyStreak={journeyStatus?.completedDays?.length ?? 0}
                routineStreak={streak}
                behaviorLoggedToday={
                  summary && (summary as CachedDashboardSummary).fallback !== true
                    ? (summary.positiveBehaviorsToday ?? 0) + (summary.negativeBehaviorsToday ?? 0) > 0
                    : undefined
                }
              />
            )}
          </ContentReveal.Hero>

          <div
            className={DASHBOARD_CONTENT_AREA}
            style={{ background: DASHBOARD_CONTENT_GRADIENT }}
          >
            <div className={DASHBOARD_AMBIENT_TOP} aria-hidden />
            <ContentReveal.Stagger className="relative z-10 flex flex-col gap-4">
            <ContentReveal.Item>
              {showFirstValueHero ? (
                <FirstValueHeroCard
                  childName={selectedChild?.name ?? childrenSafe[0]?.name}
                  continuityLine={(() => {
                    const c = loadFirstExperienceContinuity();
                    if (!c?.nextThing) return null;
                    return c.emotionalContext
                      ? `${c.emotionalContext} ${c.nextThing.title}`
                      : c.nextThing.title;
                  })()}
                  onGenerate={() => handleGenerateRoutine("first_value_hero")}
                />
              ) : null}
            </ContentReveal.Item>

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                {showActivationResume ? <ActivationResumeBanner /> : null}
              </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                <RetentionHubSection
                  childName={selectedChild?.name ?? null}
                  routineCompletionPct={routineCompletionPct}
                  hasTodayRoutine={hasTodayRoutine}
                  onGenerateRoutine={() => handleGenerateRoutine("retention_checkin")}
                  learningHref="/parenting-hub"
                />
              </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                <SevenDayJourneyCard />
              </ContentReveal.Item>
            ) : null}

            <ContentReveal.Item className={timelineOrderClass}>
              <NowNextTimeline
                routines={filteredRoutines}
                selectedChildName={selectedChild?.name ?? null}
                onGenerate={showTimelineGenerate ? () => handleGenerateRoutine("timeline_empty") : undefined}
                journeyHandlesGenerate={journeyHandlesGenerate}
              />
            </ContentReveal.Item>

            <ContentReveal.Item>
              <ChildrenChipBar
                children={childrenSafe as ChildRow[]}
                selectedChildId={selectedChildId}
                onSelectChild={setSelectedChildId}
              />
            </ContentReveal.Item>

            {FF_INFANT_V2 &&
              selectedChild &&
              selectedChild.age * 12 + (selectedChild.ageMonths ?? 0) < 24 &&
              !(TODAY_HOME_V1 && todaySupportingInsight?.kind === "infant") && (
              <ContentReveal.Item>
                <InfantDashboardShortcut
                  childId={selectedChild.id}
                  childName={selectedChild.name}
                  ageMonths={selectedChild.age * 12 + (selectedChild.ageMonths ?? 0)}
                />
              </ContentReveal.Item>
            )}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                {loadingSummary ? (
                  <Skeleton className="h-12 rounded-xl" />
                ) : (
                  <DashboardCompactStatsRow
                    streak={streak}
                    routines={allRoutinesSafe}
                    summary={summary}
                    todayDone={todayProgress.done}
                    todayTotal={todayProgress.total}
                  />
                )}
              </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                <AmyCoachCheckInCard />
              </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                <DashboardCoachingCard
                  routines={filteredRoutines}
                  streak={streak}
                  onGenerate={handleGenerateRoutine}
                  suppressGenerate={suppressAmyGenerate}
                  generatePrimarySource={generatePrimarySource}
                />
              </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 && showFeatureDiscovery ? (
            <ContentReveal.Item>
              <FeatureDiscoveryStrip
                childAgeYears={selectedChild?.age}
                hasRoutines={allRoutinesSafe.length > 0}
              />
            </ContentReveal.Item>
            ) : null}

            {!TODAY_HOME_V1 ? (
              <ContentReveal.Item>
                <DashboardMoreInsightsSection
                  allRoutines={allRoutinesSafe}
                  streak={streak}
                  selectedChildId={selectedChildId}
                  filteredBehaviorStats={filteredBehaviorStats}
                  loadingStats={loadingStats}
                  filteredRecentRoutines={filteredRecentRoutines}
                  loadingRoutines={loadingRoutines}
                  selectedChildName={selectedChild?.name ?? null}
                  gamingLocked={hubUsage.isFeatureLocked("hub_gaming_rewards")}
                  onGamingOpen={() => hubUsage.markFeatureUsed("hub_gaming_rewards")}
                  gamingLabel={t("pages.dashboard.gaming_reward")}
                  gamingSub={t("pages.dashboard.earn_points_from_routines_unlock_mini_games_and_redeem_real_")}
                />
              </ContentReveal.Item>
            ) : null}
            </ContentReveal.Stagger>
          </div>
      </div>
    </div>
  );
}