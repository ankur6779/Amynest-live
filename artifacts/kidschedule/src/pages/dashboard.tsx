import { useTranslation } from "react-i18next";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentRoutines, getGetRecentRoutinesQueryKey, useGetBehaviorStats, getGetBehaviorStatsQueryKey, useListRoutines, getListRoutinesQueryKey, useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Redirect, useLocation } from "wouter";
import { Calendar, Users, Star, ArrowRight, Activity, TrendingUp, Clock, CheckCircle2, Sparkles, Bot, Brain, Heart, Target, ChevronRight, MapPin, Ribbon, ShieldCheck } from "lucide-react";
import { DashboardSectionHeader } from "@/components/dashboard-section-header";
import {
  BehaviorHighlightsSection,
  DashboardWeeklyInsightsCard,
  RecentRoutinesCollapsible,
  RewardsCompactCard,
  TodaySnapshotCard,
} from "@/components/dashboard-phase2-widgets";
import { getAgeGroup, getAgeGroupInfo, formatAge } from "@/lib/age-groups";
import { AmyIcon } from "@/components/amy-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { logDashboardMount } from "@/lib/onboarding-debug";
import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { lazyPage } from "@/lib/safe-import";
import { isAndroidLiteClient } from "@/lib/device-lite";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { asRoutineList, routineDateKey, routineItems } from "@/lib/routines";
import { safeFetch } from "@/lib/safe-fetch";
import { cacheRoutineStreak } from "@/lib/routine-streak-cache";
import { buildFamilyIntelligenceSurface } from "@/lib/family-intelligence-surface";
import { LockedBlock } from "@/components/locked-block";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { SevenDayJourneyCard } from "@/components/seven-day-journey-card";
import { useJourney } from "@/hooks/use-journey";

const HeroAmbientLayer = lazyPage(() =>
  import("@/components/hero-ambient-layer").then((m) => ({
    default: m.HeroAmbientLayer,
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
function computeStreak(routines: Routine[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(routines.map(r => routineDateKey(r)).filter(Boolean));
  let streak = 0;
  while (true) {
    const d = new Date(today);
    d.setDate(d.getDate() - streak);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

type ChildRow = { id: number; name: string; age: number; ageMonths?: number };
type ChildTodayProgress = { done: number; total: number };

function computeChildProgressMap(
  children: ChildRow[],
  routines: Routine[],
  todayKey: string,
): Record<number, ChildTodayProgress> {
  const map: Record<number, ChildTodayProgress> = {};
  for (const child of children) {
    const routine = routines.find(
      (r) => routineDateKey(r) === todayKey && r.childId === child.id,
    );
    if (!routine) {
      map[child.id] = { done: 0, total: 0 };
      continue;
    }
    const items = routineItems<RoutineItem>(routine);
    map[child.id] = {
      done: items.filter((i) => i.status === "completed").length,
      total: items.length,
    };
  }
  return map;
}

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
  displayName, hasChildren, lastUpdated, childProfiles,
}: {
  displayName: string; hasChildren: boolean; lastUpdated: number; childProfiles: ChildBasic[];
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const greeting = t(getGreetingKey());
  const heading  = displayName
    ? t("dashboard.greeting_with_name", { name: displayName })
    : t("dashboard.greeting_no_name");

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
      return res.json() as Promise<{ context: any; childName: string | null }>;
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
  const isNight = (() => { const h = new Date().getHours(); return h >= 20 || h < 6; })();

  return (
    <div
      data-on-dark
      className="relative overflow-hidden rounded-3xl border border-white/10 px-5 sm:px-7 py-5 sm:py-6 shadow-xl animate-in fade-in duration-400"
      style={{ background: grad.bg, transition: "background 0.8s ease" }}
    >
      {/* Glow blobs */}
      <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full pointer-events-none blur-3xl" style={{ background: grad.glowA }} />
      <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full pointer-events-none blur-3xl" style={{ background: grad.glowB }} />

      {/* Weather-reactive ambient layer — skipped on Android PWA (GPU / memory). */}
      {!isAndroidLiteClient() && (
        <Suspense fallback={null}>
          <HeroAmbientLayer
            weatherCondition={weatherCondition}
            aqiBucket={aqiBucket}
            heroTags={heroTags}
            isNight={isNight}
          />
        </Suspense>
      )}

      {/* Row 1: greeting label + weather pill */}
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70">{greeting}</p>
        {ctx && (
          <div className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/20 text-[11px] font-bold text-white/90" style={{ background: "rgba(0,0,0,0.25)" }}>
            <span>{weatherEmoji}</span>
            {snap.temperatureC != null && <span>{snap.temperatureC}°C</span>}
            <span className="text-white/50">·</span>
            <span className="capitalize">{weatherCondition?.replace(/_/g, " ") ?? ""}</span>
          </div>
        )}
      </div>

      {/* Heading */}
      <h1 className="relative font-quicksand text-2xl sm:text-[27px] font-black text-white mt-1 leading-[1.15] tracking-tight">
        👋 {heading}
      </h1>

      {/* Rotating insight */}
      <div className="relative mt-2 min-h-[40px] flex items-start">
        <p key={insightIdx} className="text-sm text-white/90 leading-snug animate-in fade-in duration-500">
          {isError ? "⚠️ Unable to fetch live weather currently." : insights[insightIdx]}
        </p>
      </div>

      {/* Smart tags */}
      {heroTags.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5 mt-3">
          {heroTags.map(tag => (
            <span key={tag} className="inline-flex items-center text-[10.5px] font-bold rounded-full px-2.5 py-0.5 border border-white/20 text-white backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.14)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Weather metrics bar */}
      {ctx && (
        <div className="relative flex items-center gap-2 mt-3 overflow-x-auto pb-0.5">
          {/* Location pill — GPS reverse-geocoded or region default */}
          {locationLabel && (
            <div className="shrink-0 flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-white/15" style={{ background: "rgba(0,0,0,0.20)" }}>
              <MapPin className="h-3 w-3 text-white/70 shrink-0" />
              {/* i18n-ok: dynamic location label from reverse-geocoding / env API */}
              <span className="font-semibold text-white truncate max-w-[130px]">{locationLabel}</span>
            </div>
          )}
          {snap.temperatureC != null && (
            <div className="shrink-0 flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-white/15" style={{ background: "rgba(0,0,0,0.20)" }}>
              🌡️ <span className="font-bold text-white">{snap.temperatureC}°C</span>
              {snap.apparentC != null && snap.apparentC !== snap.temperatureC && (
                <span className="text-white/55 text-[10px] ml-0.5">feels {snap.apparentC}°C</span>
              )}
            </div>
          )}
          {snap.aqiUs != null && (
            <div className="shrink-0 flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 border border-white/15" style={{ background: "rgba(0,0,0,0.20)" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: aqiMeta.dotColor }} />
              <span className="font-bold text-white">AQI {snap.aqiUs}</span>
              <span className="text-white/60 text-[10px]">{aqiMeta.label}</span>
            </div>
          )}
          {snap.humidityPct != null && (
            <div className="shrink-0 flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-white/15" style={{ background: "rgba(0,0,0,0.20)" }}>
              💧 <span className="font-bold text-white">{snap.humidityPct}%</span>
            </div>
          )}
          {snap.uvIndexMax != null && (
            <div className="shrink-0 flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-white/15" style={{ background: "rgba(0,0,0,0.20)" }}>
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

// Tiny section label used to chunk the dashboard into clear groups
function SectionLabel({
  children,
  action
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return <div className="flex items-center justify-between mt-1 mb-0.5 px-0.5">
      <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-white/60">{children}</p>
      {action}
    </div>;
}

// ─── Children Profile Strip (horizontal scroll) ────────────────────────────
function ChildrenStrip({
  children,
  selectedChildId,
  onSelectChild,
  onOpenChild,
  progressByChildId,
}: {
  children: ChildRow[];
  selectedChildId: number | null;
  onSelectChild: (id: number | null) => void;
  onOpenChild: (id: number) => void;
  progressByChildId: Record<number, ChildTodayProgress>;
}) {
  const { t } = useTranslation();
  if (!children || children.length === 0) return null;
  const showAll = children.length > 1;

  return (
    <div>
      <DashboardSectionHeader
        label={t("dashboard.your_little_ones")}
        icon={Users}
        action={
          <Link href="/children" className="text-[11px] font-bold text-primary hover:underline">
            {t("dashboard.manage")} →
          </Link>
        }
      />
      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory -mx-0.5 px-0.5 overscroll-x-contain">
        {showAll ? (
          <button
            type="button"
            onClick={() => onSelectChild(null)}
            className={`relative shrink-0 snap-start min-w-[100px] rounded-2xl border p-3.5 text-left transition-all ${
              selectedChildId == null
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="text-xl mb-1">👨‍👩‍👧</div>
            <p className="font-bold text-sm text-foreground">{t("dashboard.all_children")}</p>
          </button>
        ) : null}
        {children.map((c, i) => {
          const ageMonths = c.ageMonths ?? 0;
          const group = getAgeGroup(c.age, ageMonths);
          const info = getAgeGroupInfo(group);
          const selected = selectedChildId === c.id;
          const prog = progressByChildId[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (selected) onOpenChild(c.id);
                else onSelectChild(c.id);
              }}
              className={`relative shrink-0 snap-start min-w-[160px] sm:min-w-[175px] rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-muted dark:bg-card border border-border">
                  {info.emoji}
                  {prog && prog.total > 0 ? (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                        prog.done >= prog.total ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{formatAge(c.age, ageMonths)}</p>
                </div>
              </div>
              {prog && prog.total > 0 ? (
                <p className="text-[10px] font-bold text-primary mt-2">
                  {t("dashboard.tasks_today_short", { done: prog.done, total: prog.total })}
                </p>
              ) : null}
            </button>
          );
        })}
        <Link href="/children/new" className="shrink-0 snap-start min-w-[110px]">
          <div className="rounded-2xl border border-dashed border-border p-3.5 flex items-center justify-center text-center h-full hover:border-primary/40 hover:bg-muted/50 transition-all">
            <div>
              <div className="text-xl mb-1">➕</div>
              <p className="text-xs font-bold text-muted-foreground">{t("dashboard.add_child")}</p>
            </div>
          </div>
        </Link>
      </div>
      {selectedChildId != null && children.length > 1 ? (
        <button
          type="button"
          onClick={() => onSelectChild(null)}
          className="mt-2 text-[11px] font-bold text-primary hover:underline w-full text-center"
        >
          {t("dashboard.clear_filter")}
        </button>
      ) : null}
    </div>
  );
}

// ─── Live indicator dot ────────────────────────────────────────────────────
function LiveDot() {
  const {
    t
  } = useTranslation();
  return <span className="relative inline-flex items-center h-2 w-2" aria-label={t("pages.dashboard.live_data")}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
    </span>;
}

function TimelineProgressChip({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="text-right shrink-0">
      <p className="text-[11px] font-bold text-primary">{t("dashboard.timeline_progress", { done, total })}</p>
      <div className="w-[72px] h-1 rounded-full bg-muted mt-1 ml-auto overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Now / Next Timeline ───────────────────────────────────────────────────
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
      <Card className="rounded-2xl border-2 border-dashed border-border bg-card">
        <CardContent className="p-6 text-center space-y-3">
          <div className="text-4xl">🗓️</div>
          <p className="font-bold text-foreground">
            {selectedChildName
              ? t("dashboard.no_plan_for_child", { name: selectedChildName })
              : t("pages.dashboard.no_plan_for_today_yet")}
          </p>
          <p className="text-xs text-muted-foreground">
            {journeyHandlesGenerate
              ? t("dashboard.no_plan_journey_hint")
              : t("dashboard.no_plan_subtitle")}
          </p>
          {!journeyHandlesGenerate && onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              data-testid="dashboard-generate-routine-btn"
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm px-5 py-2.5 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t("dashboard.generate_today")}
            </button>
          ) : null}
        </CardContent>
      </Card>
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
    return <Card className="rounded-2xl border border-border bg-card">
        <CardContent className="p-5 text-center space-y-1">
          <div className="text-3xl">🌙</div>
          <p className="font-bold text-foreground">{t("pages.dashboard.day_complete")}</p>
          <p className="text-xs text-muted-foreground">{t("pages.dashboard.time_to_relax_and_recharge")}</p>
        </CardContent>
      </Card>;
  }
  const allTodayItems = todayRoutines.flatMap((r) => routineItems<RoutineItem>(r));
  const doneCount = allTodayItems.filter((i) => i.status === "completed").length;
  const nextItem = allItems.find((item) => item.status !== "completed");

  return <Card className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className="font-quicksand font-bold text-sm text-foreground">{t("dashboard.todays_timeline")}</span>
            <LiveDot />
          </div>
          {nextItem ? (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {t("dashboard.timeline_next_up", { task: nextItem.activity })}
            </p>
          ) : doneCount > 0 && doneCount >= allTodayItems.length ? (
            <p className="text-[11px] text-muted-foreground mt-1">{t("dashboard.day_complete")}</p>
          ) : null}
        </div>
        <TimelineProgressChip done={doneCount} total={allTodayItems.length} />
      </div>
      <div className="p-3 space-y-1.5">
        {displayItems.map((item, idx) => {
        const isCurrent = currentIdx >= 0 && idx === 0;
        const isNext = idx === (currentIdx >= 0 ? 1 : 0);
        const completed = item.status === "completed";
        return <Link key={`${item.routineId}-${idx}`} href={`/routines/${item.routineId}`}>
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? "bg-primary text-white" : "bg-muted/50 hover:bg-muted"}`}>
                <div className={`flex flex-col items-center w-14 shrink-0 ${isCurrent ? "text-white" : "text-muted-foreground"}`}>
                  <div className="text-xs font-bold">{item.time}</div>
                  {isCurrent && <span className="mt-1 text-[9px] font-black uppercase bg-white/25 px-1.5 py-0.5 rounded-full">{t("pages.dashboard.now")}</span>}
                  {!isCurrent && isNext && <span className="mt-1 text-[9px] font-black uppercase bg-muted dark:bg-card text-primary dark:text-muted-foreground px-1.5 py-0.5 rounded-full">{t("pages.dashboard.next")}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${isCurrent ? "text-white" : "text-foreground"} ${completed ? "line-through opacity-60" : ""}`} style={{
                wordBreak: "break-word",
                whiteSpace: "normal"
              }}>
                    {item.activity}
                  </div>
                  <div className={`text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap ${isCurrent ? "text-muted-foreground" : "text-muted-foreground"}`}>
                    <span>{item.childName} · {item.duration}m</span>
                    {item.ageBand && <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${isCurrent ? "bg-white/20 text-white border-white/30" : "text-primary bg-muted border-border"}`}>
                        <Users className="h-2.5 w-2.5" />
                        {t("pages.dashboard.ages")} {item.ageBand.replace("-", "–")}
                      </span>}
                  </div>
                </div>
                {completed && !isCurrent && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </div>
            </Link>;
      })}
      </div>
    </Card>;
}

type AmyTip = { emoji: string; text: string; actionLabel?: string; href?: string; onAction?: () => void };

// ─── Amy AI Suggestion Card ───────────────────────────────────────────────
function AmySuggestionCard({
  routines,
  streak,
  onGenerate,
  suppressGenerate,
  generatePrimarySource,
}: {
  routines: Routine[];
  streak: number;
  onGenerate: () => void;
  suppressGenerate?: boolean;
  generatePrimarySource?: "journey" | "timeline";
}) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => routineDateKey(r) === todayStr);
  const allItems = todayRoutines.flatMap((r) => routineItems<RoutineItem>(r));
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();
  const suggestions: AmyTip[] = [];

  if (total === 0 && !suppressGenerate) {
    suggestions.push({
      emoji: "📅",
      text: "No routine for today yet. Generate one to get started!",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (total === 0 && suppressGenerate && generatePrimarySource) {
    suggestions.push({
      emoji: "📅",
      text: t(
        generatePrimarySource === "journey"
          ? "dashboard.amy_no_routine_journey_hint"
          : "dashboard.amy_no_routine_timeline_hint",
      ),
    });
  } else if (pct < 30 && hour >= 14) {
    suggestions.push({
      emoji: "⚡",
      text: "Your child seems behind today — try shorter, easier tasks to build momentum.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (pct >= 80) {
    suggestions.push({
      emoji: "🌟",
      text: "Amazing progress today! Consider a small reward to celebrate.",
      actionLabel: t("dashboard.amy_view_rewards"),
      href: "/rewards",
    });
  }
  if (hour >= 15 && hour <= 17) {
    suggestions.push({
      emoji: "❤️",
      text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way.",
      actionLabel: t("dashboard.amy_open_hub"),
      href: "/parenting-hub",
    });
  }
  if (streak >= 3) {
    suggestions.push({
      emoji: "🔥",
      text: `You're on a ${streak}-day streak! Consistency builds habits.`,
      actionLabel: t("dashboard.amy_view_progress"),
      href: "/progress",
    });
  } else if (streak === 0 && hour < 10 && !suppressGenerate) {
    suggestions.push({
      emoji: "☀️",
      text: "Fresh start today! Generate a routine to set a positive tone for the day.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  }
  if (hour >= 19) {
    suggestions.push({
      emoji: "🌙",
      text: "Wind-down time! End screen time 30 min before sleep for better rest.",
      actionLabel: t("dashboard.amy_open_hub"),
      href: "/parenting-hub",
    });
  }

  const display = suggestions.slice(0, 1);

  return (
    <div className="rounded-2xl border border-border bg-muted/30 dark:bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <AmyIcon size={18} bounce />
        <span className="font-quicksand font-bold text-sm text-foreground">{t("pages.dashboard.amy_ai_suggests")}</span>
      </div>
      <div className="p-3 space-y-2">
        {display.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border text-sm">
            <span className="text-base shrink-0 mt-0.5">{s.emoji}</span>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="leading-snug text-foreground/85">{s.text}</p>
              {s.actionLabel && s.href ? (
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 hover:bg-primary/90"
                >
                  {s.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
              {s.actionLabel && s.onAction ? (
                <button
                  type="button"
                  onClick={s.onAction}
                  className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 hover:bg-primary/90"
                >
                  {s.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {display.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">{t("pages.dashboard.all_looking_good_today")}</p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Parent Score Card ────────────────────────────────────────────────────
function ParentScoreCard({
  routines,
  streak
}: {
  routines: Routine[];
  streak: number;
}) {
  const {
    t
  } = useTranslation();
  const last7 = routines.slice(0, 7);
  const totalItems = last7.flatMap(r => routineItems(r)).length;
  const completedItems = last7.flatMap(r => routineItems(r)).filter(i => (i as RoutineItem).status === "completed").length;
  const completionRate = totalItems > 0 ? Math.round(completedItems / totalItems * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const tasksNeeded = score < 60 ? Math.max(1, Math.ceil((60 - score) / 12)) : 0;
  return <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Ribbon className="h-4 w-4 text-primary" />
        <div>
          <span className="font-quicksand font-bold text-sm text-foreground block">{t("dashboard.parent_score")}</span>
          <span className="text-[11px] text-muted-foreground">{t("dashboard.parent_score_sub")}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted dark:bg-card border border-border flex items-center justify-center shrink-0">
            <span className="font-black text-2xl text-primary">{grade}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-2xl text-foreground">{score}</span>
              <span className="text-xs text-muted-foreground font-bold">/100</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("pages.dashboard.completion")} {completionRate}% · {t("pages.dashboard.days_active")} {daysActive}/7
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("pages.dashboard.completion")}</span>
            <span className="font-bold text-foreground">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{
            width: `${completionRate}%`
          }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("pages.dashboard.days_active")}</span>
            <span className="font-bold text-foreground">{daysActive}/7</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-muted h-1.5 rounded-full transition-all" style={{
            width: `${daysActive / 7 * 100}%`
          }} />
          </div>
        </div>
        {score < 60 && tasksNeeded > 0 ? (
          <p className="text-xs text-muted-foreground bg-muted rounded-xl p-2.5 border border-border">
            {t("dashboard.score_boost_hint", { count: tasksNeeded })}
          </p>
        ) : null}
      </div>
    </div>;
}

function AmyMemoryCard({ routines }: { routines: Routine[] }) {
  const latestRoutine = routines.find((routine) => (routine.adaptations?.length ?? 0) > 0);
  const surface = latestRoutine
    ? buildFamilyIntelligenceSurface(latestRoutine.adaptations, {})
    : null;

  if (!latestRoutine || !surface) return null;

  const primarySignal = surface.signals[0];
  const supportSignal = surface.signals.find((signal) => signal.id === "supports");

  return (
    <Link href={`/routines/${latestRoutine.id}`} className="block">
      <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden hover:border-primary/35 hover:shadow-sm transition-all">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Brain className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <span className="font-quicksand font-bold text-sm text-foreground block">Amy remembers</span>
            <span className="text-[11px] text-muted-foreground truncate block">
              Latest family intelligence from {latestRoutine.childName}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{primarySignal?.label}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {primarySignal?.detail}
              </p>
            </div>
          </div>

          {supportSignal ? (
            <p className="rounded-xl border border-border bg-muted/45 px-3 py-2 text-xs leading-snug text-muted-foreground">
              <Heart className="h-3.5 w-3.5 mr-1 inline align-text-bottom text-primary" />
              {supportSignal.detail}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-primary">
            <span>See why Amy planned it this way</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>
        </div>
      </div>
    </Link>
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
        <Link href="/amy-coach">
          <button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary text-white font-black text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("pages.dashboard.experience_now")}
          </button>
        </Link>
        <Link href="/parenting-hub">
          <button className="w-full h-12 rounded-2xl border-2 border-border bg-background text-foreground font-bold text-sm hover:bg-muted/50 hover:border-border active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <BookOpenIcon />
            {t("pages.dashboard.explore_parenting_hub")}
          </button>
        </Link>
        <Link href="/life-skills">
          <button className="w-full h-12 rounded-2xl border-2 border-[hsl(var(--brand-emerald-400))] dark:border-[hsl(var(--brand-emerald-700))] bg-[hsl(var(--brand-emerald-100)/0.5)] dark:bg-[hsl(var(--brand-emerald-800)/0.2)] text-[hsl(var(--brand-emerald-800))] dark:text-[hsl(var(--brand-emerald-100))] font-bold text-sm hover:bg-[hsl(var(--brand-emerald-100)/0.7)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            🧭 Life Skills Mode
          </button>
        </Link>
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
  const {
    openPaywall
  } = usePaywall();
  const profileFetchedRef = useRef(false);
  const displayName =
    profileName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "";
  const {
    data: summary,
    isLoading: loadingSummary,
    isError: isErrorSummary,
    dataUpdatedAt: summaryUpdatedAt
  } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true
    }
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
    isError: isErrorChildren
  } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true
    }
  });
  const {
    data: stats,
    isLoading: loadingStats,
    dataUpdatedAt: statsUpdatedAt
  } = useGetBehaviorStats({
    query: {
      queryKey: getGetBehaviorStatsQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true
    }
  });
  const authReady = userLoaded && authLoaded && authStatus !== "loading";
  const dataBootLoading =
    authReady && isSignedIn && (loadingSummary || subLoading);

  const childrenSafe = Array.isArray(childrenList) ? childrenList : [];
  const recentRoutinesSafe = asRoutineList<Routine>(routines);
  const statsSafe = Array.isArray(stats) ? stats : [];
  const allRoutinesSafe = asRoutineList<Routine>(allRoutines);
  const todayKey = new Date().toISOString().slice(0, 10);
  const progressByChildId = useMemo(
    () => computeChildProgressMap(childrenSafe as ChildRow[], allRoutinesSafe, todayKey),
    [childrenList, allRoutines, todayKey],
  );
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
  const streak = useMemo(() => computeStreak(allRoutinesSafe), [allRoutines]);
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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.name) setProfileName(data.name);
      })
      .catch((e) => {
        console.error("[dashboard] parent-profile fetch failed", e);
      });
  }, [authReady, isSignedIn, authFetch]);

  useEffect(() => {
    logDashboardMount({
      user,
      isLoaded: authReady,
      isSignedIn: !!isSignedIn,
      isLoading: dataBootLoading,
      loadingSummary,
      subLoading,
    });
  }, [
    user?.id,
    authReady,
    isSignedIn,
    dataBootLoading,
    loadingSummary,
    subLoading,
  ]);

  if (!authReady) {
    return <RouteLoadingShell />;
  }

  if (!isSignedIn || !user) {
    console.warn("[dashboard] user missing, redirecting to sign-in");
    return <Redirect to="/sign-in" />;
  }

  if (dataBootLoading) {
    return <RouteLoadingShell />;
  }

  // Both core queries failed — show a recoverable error instead of a blank or
  // broken dashboard. React Query will retry automatically in the background.
  if (isErrorSummary && isErrorChildren) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <span className="text-4xl">⚠️</span>
        <p className="font-semibold text-foreground text-lg">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          We couldn't load your dashboard. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold shadow hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Summary loaded but returned undefined (non-fatal error, other data may
  // still render). Show the skeleton so the page isn't blank.
  if (!summary && !loadingSummary && !isErrorSummary) {
    console.warn("[dashboard] summary resolved to undefined without error flag");
  }

  const lastUpdated = Math.max(summaryUpdatedAt ?? 0, routinesUpdatedAt ?? 0, statsUpdatedAt ?? 0);
  const generateRoutineLocked =
    !isPremium && (entitlements?.usage?.features?.routine_generate?.locked ?? false);
  function handleGenerateRoutine() {
    if (generateRoutineLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation("/routines/generate");
    }
  }
  const summaryFallback = (summary as { fallback?: boolean } | undefined)?.fallback === true;
  const noChildren =
    !loadingSummary &&
    !loadingChildren &&
    !summaryFallback &&
    !isErrorSummary &&   // don't redirect to onboarding when API just failed
    !isErrorChildren &&
    childrenSafe.length === 0 &&
    (summary?.totalChildren ?? 0) === 0;
  if (noChildren) {
    return <OnboardingScreen displayName={displayName} />;
  }
  if (loadingSummary) {
    return (
      // audit-block-ignore-start
      <div data-on-dark className="dashboard-page w-full min-w-0 max-w-full bg-[#0a1024]">
        {/* audit-block-ignore-end */}
        <div className="flex flex-col gap-5 animate-in fade-in duration-400 pb-6 md:pb-8">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    // audit-block-ignore-start
    <div data-on-dark className="dashboard-page w-full min-w-0 max-w-full bg-[#0a1024]">
      {/* audit-block-ignore-end */}
      <div className="flex flex-col gap-5 animate-in fade-in duration-400 pb-6 md:pb-8">

          {/* ── Hero Greeting ───────────────────────────────────────── */}
          <SmartHeroSection
            displayName={displayName}
            hasChildren={childrenSafe.length > 0}
            lastUpdated={lastUpdated}
            childProfiles={childrenSafe.map((c: any) => ({ id: c.id, name: c.name, age: c.age, ageMonths: c.ageMonths ?? 0 }))}
          />

          <SevenDayJourneyCard />

          {/* ── Two-column layout (desktop) / stacked (mobile) ─────── */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">

            {/* LEFT column: Children + Now/Next */}
            <div className="flex flex-col gap-5">
              <ChildrenStrip
                children={childrenSafe as ChildRow[]}
                selectedChildId={selectedChildId}
                onSelectChild={setSelectedChildId}
                onOpenChild={(id) => setLocation(`/children/${id}`)}
                progressByChildId={progressByChildId}
              />
              <div>
                <NowNextTimeline
                  routines={filteredRoutines}
                  selectedChildName={selectedChild?.name ?? null}
                  onGenerate={showTimelineGenerate ? handleGenerateRoutine : undefined}
                  journeyHandlesGenerate={journeyHandlesGenerate}
                />
              </div>
            </div>

            {/* RIGHT column: Snapshot + Amy + Score + Weekly insights */}
            <div className="flex flex-col gap-4">
              <DashboardSectionHeader label={t("dashboard.at_a_glance")} icon={Activity} />
              <div className="-mt-2">
                {loadingSummary ? (
                  <Skeleton className="h-36 rounded-2xl" />
                ) : (
                  <TodaySnapshotCard
                    streak={streak}
                    routines={allRoutinesSafe}
                    summary={summary}
                    todayDone={todayProgress.done}
                    todayTotal={todayProgress.total}
                  />
                )}
              </div>
              <DashboardSectionHeader label={t("dashboard.coaching")} icon={Sparkles} />
              <div className="flex flex-col gap-3 -mt-2">
                <AmySuggestionCard
                  routines={filteredRoutines}
                  streak={streak}
                  onGenerate={handleGenerateRoutine}
                  suppressGenerate={suppressAmyGenerate}
                  generatePrimarySource={generatePrimarySource}
                />
                <AmyMemoryCard routines={filteredRoutines} />
                <ParentScoreCard routines={allRoutinesSafe} streak={streak} />
                <DashboardWeeklyInsightsCard selectedChildId={selectedChildId} />
              </div>
            </div>
          </div>

          {/* ── Below-fold: Behavior + Recent (shorter scroll) ────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BehaviorHighlightsSection
              stats={filteredBehaviorStats}
              loading={loadingStats}
              selectedChildName={selectedChild?.name ?? null}
            />
            <RecentRoutinesCollapsible routines={filteredRecentRoutines} loading={loadingRoutines} />
          </div>

          <RewardsCompactCard />

          {/* ── Gaming Reward ─────────────────────────────────────────── */}
          <LockedBlock locked={hubUsage.isFeatureLocked("hub_gaming_rewards")}>
            <Link
              href="/games"
              onClick={() => hubUsage.markFeatureUsed("hub_gaming_rewards")}
            >
              <button type="button" className="w-full text-left rounded-2xl p-4 border border-border hover:border-border dark:hover:border-border bg-card hover:bg-muted dark:hover:bg-card hover:shadow-sm transition-all flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl bg-muted dark:bg-card border border-border dark:border-border">
                  🎮
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-quicksand font-bold text-sm leading-tight text-foreground">{t("pages.dashboard.gaming_reward")}</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                    {t("pages.dashboard.earn_points_from_routines_unlock_mini_games_and_redeem_real_")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </Link>
          </LockedBlock>

      </div>
    </div>
  );
}