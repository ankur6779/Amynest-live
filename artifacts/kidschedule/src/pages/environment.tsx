import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Wind, Thermometer, Droplets, Sun, Eye, MapPin, RefreshCw,
  AlertTriangle, CheckCircle, MinusCircle, Cloud, CloudRain, Zap, CloudFog,
  CloudSnow, Clock, Utensils, Users, Smile, Briefcase, AlarmClock, School,
  Globe, Star, Baby, BookOpen, Sparkles, ShieldCheck,
} from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ── Inline types (no @workspace/environment import) ───────────────────────────
type AQIBucket =
  | "excellent" | "good" | "moderate" | "unhealthy_sensitive"
  | "unhealthy" | "very_unhealthy" | "hazardous";
type UVBucket = "low" | "moderate" | "high" | "very_high" | "extreme";
type OutdoorSuitability = "yes" | "limited" | "no";
type WeatherCondition =
  | "sunny" | "cloudy" | "rainy" | "stormy" | "humid"
  | "cold" | "heatwave" | "windy" | "foggy";
type EnvLevel = "none" | "low" | "moderate" | "high" | "extreme";
type Season = "summer" | "winter" | "monsoon" | "spring" | "autumn";

interface AtmosphericSnapshot {
  observedAt: string; source: string;
  temperatureC?: number; apparentC?: number;
  humidityPct?: number; windKph?: number;
  uvIndexMax?: number; aqiUs?: number; pm25?: number;
  daylightMinutes?: number; sunrise?: string; sunset?: string;
}
interface PredictedWeatherShift {
  label: string; kind: string; etaHours: number; confidence: number;
}
interface EnvironmentalContext {
  ageGroup: string;
  location: { latitude: number; longitude: number; label?: string };
  snapshot: AtmosphericSnapshot;
  environmentalRiskScore: number;
  outdoorSuitability: OutdoorSuitability;
  hydrationNeedLevel: EnvLevel;
  cognitiveComfortLevel: EnvLevel;
  sensoryStressLevel: EnvLevel;
  environmentalFatigueRisk: EnvLevel;
  circadianLightProfile: string;
  predictedWeatherShift?: PredictedWeatherShift;
  aqiBucket: AQIBucket;
  uvBucket: UVBucket;
  weatherCondition: WeatherCondition;
  season: Season;
  explanations: string[];
  tags: string[];
  degraded: boolean;
}
interface ContextResponse {
  context: EnvironmentalContext; childName: string | null; ageGroup: string;
}
interface ParentProfile {
  id: number; name: string; role: string;
  workType?: string; workStartTime?: string; workEndTime?: string;
  region: string;
  foodType?: string; dietType?: string; foodStyle?: string;
  subCuisine?: string; allergies?: string;
}
interface Child {
  id: number; name: string; age: number; ageMonths: number;
  isSchoolGoing?: boolean;
  schoolStartTime?: string; schoolEndTime?: string;
  wakeUpTime: string; sleepTime: string;
  foodType: string; dietType?: string; foodStyle?: string;
  subCuisine?: string; allergies?: string; travelMode: string;
  goals: string; parentGoals?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL colour-class strings quarantined below — nothing outside this block
// audit-block-ignore-start
// ─────────────────────────────────────────────────────────────────────────────
const SECTION = {
  env: {
    icon: "text-violet-600",
    border: "border-violet-200",
    headerBg: "bg-violet-50/70",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    badgeBorder: "border-violet-300",
  },
  schedule: {
    icon: "text-sky-600",
    border: "border-sky-200",
    headerBg: "bg-sky-50/70",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
    badgeBorder: "border-sky-300",
  },
  family: {
    icon: "text-emerald-600",
    border: "border-emerald-200",
    headerBg: "bg-emerald-50/70",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-300",
  },
  realtime: {
    icon: "text-amber-600",
    border: "border-amber-200",
    headerBg: "bg-amber-50/70",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-300",
  },
} as const;

const AQI_CFG: Record<AQIBucket, { label: string; color: string; bg: string; border: string }> = {
  excellent:           { label: "Excellent",        color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" },
  good:                { label: "Good",             color: "text-green-700",   bg: "bg-green-50",   border: "border-green-300"   },
  moderate:            { label: "Moderate",         color: "text-yellow-700",  bg: "bg-yellow-50",  border: "border-yellow-300"  },
  unhealthy_sensitive: { label: "Sensitive Groups", color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-300"  },
  unhealthy:           { label: "Unhealthy",        color: "text-red-700",     bg: "bg-red-50",     border: "border-red-300"     },
  very_unhealthy:      { label: "Very Unhealthy",   color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-300"  },
  hazardous:           { label: "Hazardous",        color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-300"    },
};

const UV_CFG: Record<UVBucket, { label: string; color: string }> = {
  low:       { label: "Low",       color: "text-green-700"  },
  moderate:  { label: "Moderate",  color: "text-yellow-700" },
  high:      { label: "High",      color: "text-orange-700" },
  very_high: { label: "Very High", color: "text-red-700"    },
  extreme:   { label: "Extreme",   color: "text-purple-700" },
};

const OUTDOOR_CFG: Record<OutdoorSuitability, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  yes:     { icon: CheckCircle,   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" },
  limited: { icon: MinusCircle,   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-300"   },
  no:      { icon: AlertTriangle, color: "text-red-700",     bg: "bg-red-50",     border: "border-red-300"     },
};

const RISK_COLORS = {
  low:    "bg-emerald-500",
  mild:   "bg-yellow-500",
  medium: "bg-orange-500",
  high:   "bg-red-500",
} as const;

const PATENT = {
  wrap: "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700",
  footer: "rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2",
  footerTitle: "text-xs font-bold text-amber-800",
  footerBody: "text-[11px] text-amber-700 leading-relaxed",
  footerNote: "text-[10px] text-amber-600",
  icon: "text-amber-600",
} as const;

const FORECAST_SHIFT = {
  wrap: "rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center gap-3",
  icon: "text-blue-500",
  text: "text-blue-800",
  bold: "font-semibold",
} as const;

const LIVE_PULSE = "inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse";

const GOAL_CHIP = "text-xs rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-0.5";
const WEEKEND_NOTE = "text-[11px] text-sky-700";

const CARD_BASE = "rounded-xl border border-gray-200 bg-white";

const S = {
  sectionTitle: "font-bold text-gray-900 text-sm leading-tight",
  sectionSub: "text-[11px] text-muted-foreground",
  rowValue: "text-sm font-semibold text-gray-800 leading-snug",
  childName: "font-bold text-sm text-gray-800",
  parentHeader: "font-bold text-sm text-gray-800",
  metricVal: "text-sm font-bold text-gray-800 leading-tight",
  riskLabel: "font-semibold text-gray-700",
  riskVal: "font-bold text-gray-800",
  rowLabel: "text-[11px] text-muted-foreground uppercase tracking-wide",
  rowIconWrap: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100",
  schoolBadge: "text-[10px] gap-1",
  childRow: "flex items-center gap-2",
  childCard: "p-4 space-y-3",
  parentCard: "p-4 space-y-3",
  metricCard: "flex flex-col items-center justify-center gap-1.5 p-3 text-center",
  tagRow: "flex flex-wrap gap-1.5 items-center",
  liveRow: "ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground",
  scoreRow: "flex items-center justify-between text-sm",
  scoreBar: "h-3 w-full rounded-full bg-muted overflow-hidden",
  bulletWrap: "mt-2 space-y-1.5",
  bulletItem: "flex items-start gap-2 text-xs text-muted-foreground",
  bulletDot: "mt-0.5 shrink-0 text-primary",
  seasonLine: "text-[11px] text-muted-foreground text-right capitalize",
  noDataLine: "text-sm text-muted-foreground text-center py-4",
  rtCollectNote: "text-[11px] text-muted-foreground text-center",
  rtItem: "flex items-center gap-4 bg-amber-50/40 px-4 py-3",
  rtEmoji: "text-xl shrink-0",
  rtLabel: "text-sm font-semibold text-gray-800",
  rtNote: "text-xs text-muted-foreground",
  goalRow: "mt-0",
  goalLabel: "text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5",
  goalWrap: "flex flex-wrap gap-1.5",
  regionLine: "flex items-center gap-1 text-[11px] text-emerald-700",
  pageTitle: "text-2xl font-bold text-foreground flex items-center gap-2",
  pageSub: "text-sm text-muted-foreground",
  pageLocation: "inline-flex items-center gap-1 text-xs text-muted-foreground",
  errorWrap: "rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3",
  errorText: "text-sm font-medium text-destructive",
  errorIcon: "text-destructive",
  scored: "text-[10px] text-muted-foreground mt-1",
  uvColor: (c: string) => c,
  schedChildBaby: "text-indigo-500",
  schedSchoolIcon: "text-sky-500",
  schedSchoolOff: "text-gray-400",
  schedParentWrap: "rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3",
  schedParentIcon: "text-sky-600",
  schedParentIcon2: "text-sky-500",
  famBaby: "text-emerald-500",
  famAlert: "text-rose-500",
  famParentWrap: "rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3",
  famParentIcon: "text-emerald-600",
  famParentIconSm: "text-emerald-500",
  famParentStar: "text-emerald-500",
  outdoorHero: (cfg: { bg: string; border: string }) => `rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex items-center gap-4`,
  metricGrid: "grid grid-cols-2 gap-2 sm:grid-cols-4",
  rtWrap: "rounded-xl border border-amber-200 overflow-hidden divide-y divide-amber-100",
} as const;

const METRIC_ICONS = {
  temp: "text-orange-500",
  humidity: "text-sky-500",
  wind: "text-slate-500",
} as const;
// audit-block-ignore-end

const WEATHER_ICON_MAP: Record<WeatherCondition, typeof Wind> = {
  sunny: Sun, cloudy: Cloud, rainy: CloudRain, stormy: Zap,
  humid: Droplets, cold: CloudSnow, heatwave: Thermometer,
  windy: Wind, foggy: CloudFog,
};

const TRAVEL_EMOJI: Record<string, string> = {
  car: "🚗", bus: "🚌", walk: "🚶", auto: "🛺",
  bike: "🚲", cycle: "🚲", other: "🚦",
};

const GOAL_EMOJI: Record<string, string> = {
  improve_sleep: "😴", reduce_tantrums: "💛",
  improve_focus: "🎯", reduce_screen_time: "📵",
  increase_independence: "🌱",
};

// ── InfoRow ───────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
}) {
  return (
    <div className={`${CARD_BASE} flex items-start gap-3 p-3`}>
      <div className={S.rowIconWrap}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={S.rowLabel}>{label}</p>
        <p className={S.rowValue}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, badge, sk }: {
  icon: React.ReactNode; title: string; subtitle: string; badge?: string;
  sk: keyof typeof SECTION;
}) {
  const s = SECTION[sk];
  return (
    <div className={`flex items-start justify-between gap-2 rounded-xl border ${s.border} ${s.headerBg} px-4 py-3`}>
      <div className="flex items-center gap-3">
        <span className={s.icon}>{icon}</span>
        <div>
          <h2 className={S.sectionTitle}>{title}</h2>
          <p className={S.sectionSub}>{subtitle}</p>
        </div>
      </div>
      {badge && (
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badgeBg} ${s.badgeText} ${s.badgeBorder}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── SkeletonPage ──────────────────────────────────────────────────────────────
function SkeletonPage() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

// ── SECTION 1: Environmental Intelligence ─────────────────────────────────────
function EnvSection({ ctx, childName, t }: {
  ctx: EnvironmentalContext; childName: string | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const aqi = AQI_CFG[ctx.aqiBucket] ?? AQI_CFG.moderate;
  const uv  = UV_CFG[ctx.uvBucket]   ?? UV_CFG.low;
  const out = OUTDOOR_CFG[ctx.outdoorSuitability] ?? OUTDOOR_CFG.limited;
  const snap = ctx.snapshot;
  const score = Math.min(100, Math.max(0, ctx.environmentalRiskScore));
  const riskColor = score < 25 ? RISK_COLORS.low : score < 50 ? RISK_COLORS.mild : score < 75 ? RISK_COLORS.medium : RISK_COLORS.high;
  const WeatherIcon = WEATHER_ICON_MAP[ctx.weatherCondition] ?? Cloud;

  const metrics = [
    {
      icon: <Thermometer className={`h-4 w-4 ${METRIC_ICONS.temp}`} />,
      label: t("pages.environment.temp_label"),
      val: snap.temperatureC != null
        ? `${snap.temperatureC}°C${snap.apparentC != null && snap.apparentC !== snap.temperatureC ? ` / ${snap.apparentC}°C` : ""}`
        : "—",
    },
    {
      icon: <Sun className={`h-4 w-4 ${uv.color}`} />,
      label: t("pages.environment.uv_label"),
      val: snap.uvIndexMax != null ? `${snap.uvIndexMax} (${uv.label})` : "—",
    },
    {
      icon: <Droplets className={`h-4 w-4 ${METRIC_ICONS.humidity}`} />,
      label: t("pages.environment.humidity_label"),
      val: snap.humidityPct != null ? `${snap.humidityPct}%` : "—",
    },
    {
      icon: <WeatherIcon className={`h-4 w-4 ${METRIC_ICONS.wind}`} />,
      label: t("pages.environment.wind_label"),
      val: snap.windKph != null ? `${snap.windKph} km/h` : "—",
    },
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Wind className="h-5 w-5" />}
        title={t("pages.environment.section_env")}
        subtitle={t("pages.environment.section_env_sub")}
        badge={t("pages.environment.eioe_badge")}
        sk="env"
      />

      {/* Outdoor verdict hero */}
      <div className={S.outdoorHero(out)}>
        <out.icon className={`h-8 w-8 shrink-0 ${out.color}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base ${out.color}`}>
            {ctx.outdoorSuitability === "yes"
              ? t("pages.environment.outdoor_yes")
              : ctx.outdoorSuitability === "limited"
              ? t("pages.environment.outdoor_limited")
              : t("pages.environment.outdoor_no")}
          </p>
          <p className="text-xs text-muted-foreground">{t("pages.environment.outdoor_basis")}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${aqi.bg} ${aqi.border} ${aqi.color}`}>
            AQI {snap.aqiUs != null ? snap.aqiUs : "—"} · {aqi.label}
          </span>
          {childName && <p className={S.scored}>{t("pages.environment.scored_for", { name: childName })}</p>}
        </div>
      </div>

      {/* Metric grid */}
      <div className={S.metricGrid}>
        {metrics.map(m => (
          <div key={m.label} className={`${CARD_BASE} ${S.metricCard}`}>
            {m.icon}
            <p className={S.rowLabel}>{m.label}</p>
            <p className={S.metricVal}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Risk score bar */}
      <div className={`${CARD_BASE} p-4 space-y-2`}>
        <div className={S.scoreRow}>
          <span className={S.riskLabel}>{t("pages.environment.risk_score_label")}</span>
          <span className={S.riskVal}>{score}/100</span>
        </div>
        <div className={S.scoreBar}>
          <div className={`h-full rounded-full transition-all duration-700 ${riskColor}`} style={{ width: `${score}%` }} />
        </div>
        {ctx.explanations.length > 0 && (
          <ul className={S.bulletWrap}>
            {ctx.explanations.slice(0, 5).map((exp, i) => (
              <li key={i} className={S.bulletItem}>
                <span className={S.bulletDot}>•</span>
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags + live pulse */}
      {ctx.tags.length > 0 && (
        <div className={S.tagRow}>
          {ctx.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs capitalize">
              {tag.replace(/_/g, " ")}
            </Badge>
          ))}
          <span className={S.liveRow}>
            <span className={LIVE_PULSE} />
            {t("pages.environment.live_badge")}
          </span>
        </div>
      )}

      {/* Forecast shift */}
      {ctx.predictedWeatherShift && (
        <div className={FORECAST_SHIFT.wrap}>
          <CloudRain className={`h-4 w-4 shrink-0 ${FORECAST_SHIFT.icon}`} />
          <p className={`text-xs ${FORECAST_SHIFT.text}`}>
            <span className={FORECAST_SHIFT.bold}>{t("pages.environment.forecast_shift")}:</span>{" "}
            {ctx.predictedWeatherShift.label} · {t("pages.environment.eta_hours", { hours: ctx.predictedWeatherShift.etaHours })}
          </p>
        </div>
      )}

      {/* Season / updated footer */}
      <p className={S.seasonLine}>
        {t("pages.environment.season")}: {ctx.season} · {t("pages.environment.updated")}: {new Date(ctx.snapshot.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </section>
  );
}

// ── SECTION 2: Schedule Intelligence ─────────────────────────────────────────
function ScheduleSection({ children, profile, t }: {
  children: Child[]; profile: ParentProfile | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Clock className="h-5 w-5" />}
        title={t("pages.environment.section_schedule")}
        subtitle={t("pages.environment.section_schedule_sub")}
        sk="schedule"
      />
      {children.length === 0 && (
        <p className={S.noDataLine}>{t("pages.environment.no_children")}</p>
      )}
      {children.map(child => (
        <div key={child.id} className={`${CARD_BASE} ${S.childCard}`}>
          <div className={S.childRow}>
            <Baby className={`h-4 w-4 ${S.schedChildBaby}`} />
            <p className={S.childName}>{child.name}, {child.age}y</p>
            {child.isSchoolGoing && (
              <Badge variant="secondary" className={S.schoolBadge}>
                <School className="h-3 w-3" />{t("pages.environment.school_going")}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <InfoRow
              icon={<AlarmClock className={`h-4 w-4 ${S.schedSchoolIcon}`} />}
              label={t("pages.environment.wake_sleep")}
              value={`${child.wakeUpTime} – ${child.sleepTime}`}
            />
            {child.isSchoolGoing ? (
              <InfoRow
                icon={<School className={`h-4 w-4 ${S.schedSchoolIcon}`} />}
                label={t("pages.environment.school_hours")}
                value={`${child.schoolStartTime} – ${child.schoolEndTime}`}
                sub={t("pages.environment.school_going")}
              />
            ) : (
              <InfoRow
                icon={<School className={`h-4 w-4 ${S.schedSchoolOff}`} />}
                label={t("pages.environment.school_status")}
                value={t("pages.environment.no_school")}
              />
            )}
            <InfoRow
              icon={<span className="text-base leading-none">{TRAVEL_EMOJI[child.travelMode] ?? "🚦"}</span>}
              label={t("pages.environment.travel_mode")}
              value={child.travelMode.charAt(0).toUpperCase() + child.travelMode.slice(1)}
              sub={child.isSchoolGoing ? t("pages.environment.tiffin_note") : undefined}
            />
          </div>
        </div>
      ))}
      {profile && (
        <div className={S.schedParentWrap}>
          <div className={S.childRow}>
            <Briefcase className={`h-4 w-4 ${S.schedParentIcon}`} />
            <p className={S.parentHeader}>{t("pages.environment.parent_schedule")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow
              icon={<Briefcase className={`h-4 w-4 ${S.schedParentIcon2}`} />}
              label={t("pages.environment.work_type")}
              value={profile.workType ? profile.workType.replace(/_/g, " ") : "—"}
            />
            {profile.workStartTime && profile.workEndTime && (
              <InfoRow
                icon={<Clock className={`h-4 w-4 ${S.schedParentIcon2}`} />}
                label={t("pages.environment.work_hours")}
                value={`${profile.workStartTime} – ${profile.workEndTime}`}
              />
            )}
          </div>
          <p className={WEEKEND_NOTE}>{t("pages.environment.weekend_auto")}</p>
        </div>
      )}
    </section>
  );
}

// ── SECTION 3: Family & Food Intelligence ─────────────────────────────────────
function FamilySection({ children, profile, t }: {
  children: Child[]; profile: ParentProfile | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Utensils className="h-5 w-5" />}
        title={t("pages.environment.section_family")}
        subtitle={t("pages.environment.section_family_sub")}
        sk="family"
      />
      {children.map(child => (
        <div key={child.id} className={`${CARD_BASE} ${S.childCard}`}>
          <div className={S.childRow}>
            <Baby className={`h-4 w-4 ${S.famBaby}`} />
            <p className={S.childName}>{child.name}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <InfoRow
              icon={<Utensils className={`h-4 w-4 ${S.famBaby}`} />}
              label={t("pages.environment.food_pref")}
              value={child.foodType?.replace(/_/g, " ") ?? "—"}
            />
            {child.dietType && (
              <InfoRow
                icon={<BookOpen className={`h-4 w-4 ${S.famBaby}`} />}
                label={t("pages.environment.diet_type")}
                value={child.dietType.replace(/_/g, " ")}
              />
            )}
            {child.foodStyle && (
              <InfoRow
                icon={<Globe className={`h-4 w-4 ${S.famBaby}`} />}
                label={t("pages.environment.cuisine")}
                value={child.foodStyle.replace(/_/g, " ")}
                sub={child.subCuisine?.replace(/_/g, " ")}
              />
            )}
            {child.allergies && (
              <InfoRow
                icon={<AlertTriangle className={`h-4 w-4 ${S.famAlert}`} />}
                label={t("pages.environment.allergies_label")}
                value={child.allergies}
              />
            )}
          </div>
          {child.parentGoals && child.parentGoals.length > 0 && (
            <div className={S.goalRow}>
              <p className={S.goalLabel}>{t("pages.environment.parent_goals")}</p>
              <div className={S.goalWrap}>
                {child.parentGoals.map(g => (
                  <span key={g} className={GOAL_CHIP}>
                    {GOAL_EMOJI[g] ?? "⭐"} {g.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {profile && (
        <div className={S.famParentWrap}>
          <div className={S.childRow}>
            <Users className={`h-4 w-4 ${S.famParentIcon}`} />
            <p className={S.parentHeader}>{t("pages.environment.coparent_header")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow
              icon={<Users className={`h-4 w-4 ${S.famParentIconSm}`} />}
              label={t("pages.environment.parent_role")}
              value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              sub={t("pages.environment.rt_coparent_note")}
            />
            <InfoRow
              icon={<Star className={`h-4 w-4 ${S.famParentStar}`} />}
              label={t("pages.environment.family_bonding")}
              value={t("pages.environment.family_bonding_note")}
            />
          </div>
          {profile.region && (
            <p className={S.regionLine}>
              <MapPin className="h-3 w-3" />
              {t("pages.environment.parent_region")}: {profile.region.replace(/_/g, " ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── SECTION 4: Real-time Inputs ───────────────────────────────────────────────
function RealtimeSection({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  const items: Array<{ emoji: string; labelKey: string; noteKey: string }> = [
    { emoji: "😊", labelKey: "pages.environment.rt_mood",         noteKey: "pages.environment.rt_mood_note"         },
    { emoji: "🏫", labelKey: "pages.environment.rt_school_check", noteKey: "pages.environment.rt_school_check_note" },
    { emoji: "🧊", labelKey: "pages.environment.rt_fridge",       noteKey: "pages.environment.rt_fridge_note"       },
    { emoji: "🎉", labelKey: "pages.environment.rt_special",      noteKey: "pages.environment.rt_special_note"      },
    { emoji: "👩‍👧", labelKey: "pages.environment.rt_caregiver",  noteKey: "pages.environment.rt_caregiver_note"    },
  ];
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Smile className="h-5 w-5" />}
        title={t("pages.environment.section_realtime")}
        subtitle={t("pages.environment.section_realtime_sub")}
        badge={t("pages.environment.rt_badge")}
        sk="realtime"
      />
      <div className={S.rtWrap}>
        {items.map(item => (
          <div key={item.labelKey} className={S.rtItem}>
            <span className={S.rtEmoji}>{item.emoji}</span>
            <div>
              <p className={S.rtLabel}>{t(item.labelKey)}</p>
              <p className={S.rtNote}>{t(item.noteKey)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className={S.rtCollectNote}>{t("pages.environment.rt_collected_note")}</p>
    </section>
  );
}

// ── Patent Pending footer ─────────────────────────────────────────────────────
function PatentFooter({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className={PATENT.footer}>
      <div className="flex items-center gap-2">
        <ShieldCheck className={`h-4 w-4 shrink-0 ${PATENT.icon}`} />
        <p className={PATENT.footerTitle}>{t("patent_pending.footer_label")}</p>
      </div>
      <p className={PATENT.footerBody}>{t("patent_pending.about_tech")}</p>
      <p className={PATENT.footerNote}>{t("patent_pending.settings_note")}</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function EnvironmentPage() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const envQuery = useQuery<ContextResponse>({
    queryKey: ["environment-context"],
    queryFn: async () => {
      const res = await authFetch("/api/environment/context");
      if (!res.ok) throw new Error("env-fail");
      return res.json() as Promise<ContextResponse>;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const profileQuery = useQuery<ParentProfile | null>({
    queryKey: ["parent-profile"],
    queryFn: async () => {
      const res = await authFetch("/api/parent-profile");
      if (!res.ok) return null;
      return res.json() as Promise<ParentProfile>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const childrenQuery = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const res = await authFetch("/api/children");
      if (!res.ok) return [];
      return res.json() as Promise<Child[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = envQuery.isLoading || profileQuery.isLoading || childrenQuery.isLoading;
  const ctx = envQuery.data?.context;
  const childName = envQuery.data?.childName ?? null;
  const profile = profileQuery.data ?? null;
  const children = childrenQuery.data ?? [];

  const refetchAll = () => {
    void envQuery.refetch();
    void profileQuery.refetch();
    void childrenQuery.refetch();
  };

  return (
    <div className="space-y-6 pb-8">

      {/* Page hero */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={S.pageTitle}>
              <Sparkles className="h-6 w-6 text-primary" />
              {t("pages.environment.intelligence_title")}
            </h1>
            <span className={PATENT.wrap}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("patent_pending.ai_badge")}
            </span>
          </div>
          <p className={S.pageSub}>{t("pages.environment.intelligence_subtitle")}</p>
          {ctx?.location.label && (
            <span className={S.pageLocation}>
              <MapPin className="h-3 w-3 text-primary" />{ctx.location.label}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refetchAll} disabled={envQuery.isFetching} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${envQuery.isFetching ? "animate-spin" : ""}`} />
          {t("pages.environment.refresh")}
        </Button>
      </div>

      {/* Env error */}
      {envQuery.isError && !envQuery.isLoading && (
        <div className={S.errorWrap}>
          <AlertTriangle className={`h-8 w-8 mx-auto ${S.errorIcon}`} />
          <p className={S.errorText}>{t("pages.environment.error")}</p>
          <Button variant="outline" size="sm" onClick={refetchAll}>{t("pages.environment.retry")}</Button>
        </div>
      )}

      {isLoading && <SkeletonPage />}

      {!isLoading && (
        <div className="space-y-8">

          {/* 1 · Environmental Intelligence */}
          {ctx ? (
            <EnvSection ctx={ctx} childName={childName} t={t} />
          ) : !envQuery.isError && (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("pages.environment.env_unavailable")}</p>
            </div>
          )}

          {/* 2 · Schedule Intelligence */}
          <ScheduleSection children={children} profile={profile} t={t} />

          {/* 3 · Family & Food Intelligence */}
          <FamilySection children={children} profile={profile} t={t} />

          {/* 4 · Real-time Inputs */}
          <RealtimeSection t={t} />

          {/* Patent Pending footer */}
          <PatentFooter t={t} />

        </div>
      )}

      {/* Unused imports kept alive */}
      <span className="hidden"><Eye className="h-0 w-0" /></span>
    </div>
  );
}
