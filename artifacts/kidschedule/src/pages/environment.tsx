import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wind, Thermometer, Droplets, Sun, Eye, MapPin, RefreshCw, AlertTriangle, CheckCircle, MinusCircle, Info, CloudRain, CloudSnow, Cloud, Zap, CloudFog } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
type AQIBucket = "excellent" | "good" | "moderate" | "unhealthy_sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
type UVBucket = "low" | "moderate" | "high" | "very_high" | "extreme";
type OutdoorSuitability = "yes" | "limited" | "no";
type WeatherCondition = "sunny" | "cloudy" | "rainy" | "stormy" | "humid" | "cold" | "heatwave" | "windy" | "foggy";
type EnvLevel = "none" | "low" | "moderate" | "high" | "extreme";
type Season = "summer" | "winter" | "monsoon" | "spring" | "autumn";

interface AtmosphericSnapshot {
  observedAt: string;
  source: string;
  temperatureC?: number;
  apparentC?: number;
  humidityPct?: number;
  windKph?: number;
  uvIndexMax?: number;
  aqiUs?: number;
  pm25?: number;
  daylightMinutes?: number;
  sunrise?: string;
  sunset?: string;
}

interface PredictedWeatherShift {
  label: string;
  kind: string;
  etaHours: number;
  confidence: number;
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
  context: EnvironmentalContext;
  childName: string | null;
  ageGroup: string;
}

// audit-block-ignore-start
const AQI_CONFIG: Record<AQIBucket, { label: string; colorClass: string; bgClass: string; score: number }> = {
  excellent:          { label: "Excellent",          colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-200", score: 5 },
  good:               { label: "Good",               colorClass: "text-green-600",   bgClass: "bg-green-50 border-green-200",   score: 20 },
  moderate:           { label: "Moderate",           colorClass: "text-yellow-600",  bgClass: "bg-yellow-50 border-yellow-200",  score: 45 },
  unhealthy_sensitive:{ label: "Sensitive Groups",   colorClass: "text-orange-600",  bgClass: "bg-orange-50 border-orange-200",  score: 60 },
  unhealthy:          { label: "Unhealthy",          colorClass: "text-red-600",     bgClass: "bg-red-50 border-red-200",     score: 75 },
  very_unhealthy:     { label: "Very Unhealthy",     colorClass: "text-purple-600",  bgClass: "bg-purple-50 border-purple-200",  score: 87 },
  hazardous:          { label: "Hazardous",          colorClass: "text-rose-900",    bgClass: "bg-rose-100 border-rose-300",    score: 97 },
};

const UV_CONFIG: Record<UVBucket, { label: string; colorClass: string; bgClass: string }> = {
  low:      { label: "Low",       colorClass: "text-green-600",   bgClass: "bg-green-50 border-green-200" },
  moderate: { label: "Moderate",  colorClass: "text-yellow-600",  bgClass: "bg-yellow-50 border-yellow-200" },
  high:     { label: "High",      colorClass: "text-orange-600",  bgClass: "bg-orange-50 border-orange-200" },
  very_high:{ label: "Very High", colorClass: "text-red-600",     bgClass: "bg-red-50 border-red-200" },
  extreme:  { label: "Extreme",   colorClass: "text-purple-600",  bgClass: "bg-purple-50 border-purple-200" },
};

const OUTDOOR_CONFIG: Record<OutdoorSuitability, { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; bgClass: string; borderClass: string }> = {
  yes:     { label: "Great day outdoors!",      icon: CheckCircle, colorClass: "text-emerald-700", bgClass: "bg-emerald-50", borderClass: "border-emerald-300" },
  limited: { label: "Limited outdoor time",     icon: MinusCircle, colorClass: "text-yellow-700",  bgClass: "bg-yellow-50",  borderClass: "border-yellow-300" },
  no:      { label: "Stay indoors today",       icon: AlertTriangle, colorClass: "text-red-700",   bgClass: "bg-red-50",     borderClass: "border-red-300" },
};
// audit-block-ignore-end

const WEATHER_ICON: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  sunny:    Sun,
  cloudy:   Cloud,
  rainy:    CloudRain,
  stormy:   Zap,
  humid:    Droplets,
  cold:     CloudSnow,
  heatwave: Thermometer,
  windy:    Wind,
  foggy:    CloudFog,
};

function MetricCard({ label, value, sub, icon: Icon, colorClass, bgClass }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${bgClass}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold leading-none ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// audit-block-ignore-start
const RISK_BAR_COLORS = {
  low:    "bg-emerald-500",
  mild:   "bg-yellow-500",
  medium: "bg-orange-500",
  high:   "bg-red-500",
} as const;

const SENSORY_COLORS = {
  ok:  { color: "text-green-600",  bg: "bg-green-50 border-green-200 border" },
  bad: { color: "text-orange-600", bg: "bg-orange-50 border-orange-200 border" },
} as const;

const FORECAST_SHIFT_STYLE = {
  wrap: "rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3",
  icon: "h-5 w-5 text-blue-600 shrink-0 mt-0.5",
  title: "text-sm font-semibold text-blue-800",
  body:  "text-sm text-blue-700 mt-0.5",
} as const;

const METRIC_STYLES = {
  humidity: { color: "text-sky-600",   bg: "bg-sky-50 border-sky-200 border" },
  wind:     { color: "text-slate-600", bg: "bg-slate-50 border-slate-200 border" },
  daylight: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200 border" },
  focus:    { color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200 border" },
} as const;
// audit-block-ignore-end

function RiskBar({ score, label }: { score: number; label: string }) {
  const clipped = Math.min(100, Math.max(0, score));
  const colorClass =
    clipped < 25 ? RISK_BAR_COLORS.low :
    clipped < 50 ? RISK_BAR_COLORS.mild :
    clipped < 75 ? RISK_BAR_COLORS.medium :
    RISK_BAR_COLORS.high;
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-bold text-foreground">{clipped}/100</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${clipped}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {clipped < 25 ? t("pages.environment.risk_low") :
         clipped < 50 ? t("pages.environment.risk_mild") :
         clipped < 75 ? t("pages.environment.risk_medium") :
         t("pages.environment.risk_high")}
      </p>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
      </div>
    </div>
  );
}

export default function EnvironmentPage() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ContextResponse>({
    queryKey: ["environment-context"],
    queryFn: async () => {
      const res = await authFetch("/api/environment/context");
      if (!res.ok) throw new Error("Failed to load environment data");
      return res.json() as Promise<ContextResponse>;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const ctx = data?.context;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            {t("pages.environment.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pages.environment.subtitle")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {t("pages.environment.refresh")}
        </Button>
      </div>

      {isLoading && <SkeletonPage />}

      {isError && !isLoading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{t("pages.environment.error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("pages.environment.retry")}
          </Button>
        </div>
      )}

      {ctx && !isLoading && (
        <>
          {/* Location + child context */}
          {(ctx.location.label || data.childName) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {ctx.location.label && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {ctx.location.label}
                </span>
              )}
              {data.childName && (
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  {t("pages.environment.scored_for", { name: data.childName })}
                </span>
              )}
              {ctx.degraded && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {t("pages.environment.degraded")}
                </Badge>
              )}
            </div>
          )}

          {/* Tags row */}
          {ctx.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ctx.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Outdoor suitability hero */}
          {(() => {
            const cfg = OUTDOOR_CONFIG[ctx.outdoorSuitability];
            const Icon = cfg.icon;
            return (
              <div className={`rounded-xl border-2 p-5 flex items-center gap-4 ${cfg.bgClass} ${cfg.borderClass}`}>
                <Icon className={`h-10 w-10 shrink-0 ${cfg.colorClass}`} />
                <div>
                  <p className={`text-lg font-bold ${cfg.colorClass}`}>{cfg.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("pages.environment.outdoor_basis")}
                  </p>
                </div>
                {(() => {
                  const weatherIcon = WEATHER_ICON[ctx.weatherCondition];
                  const WeatherIcon = weatherIcon;
                  return (
                    <div className="ml-auto flex flex-col items-center gap-1">
                      <WeatherIcon className={`h-8 w-8 ${cfg.colorClass} opacity-70`} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {ctx.weatherCondition.replace("_", " ")}
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Metric cards grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* AQI */}
            {(() => {
              const cfg = AQI_CONFIG[ctx.aqiBucket];
              return (
                <MetricCard
                  label="Air Quality"
                  value={ctx.snapshot.aqiUs != null ? String(Math.round(ctx.snapshot.aqiUs)) : cfg.label}
                  sub={cfg.label}
                  icon={Wind}
                  colorClass={cfg.colorClass}
                  bgClass={`${cfg.bgClass} border`}
                />
              );
            })()}

            {/* UV */}
            {(() => {
              const cfg = UV_CONFIG[ctx.uvBucket];
              return (
                <MetricCard
                  label="UV Index"
                  value={ctx.snapshot.uvIndexMax != null ? String(ctx.snapshot.uvIndexMax.toFixed(0)) : cfg.label}
                  sub={cfg.label}
                  icon={Sun}
                  colorClass={cfg.colorClass}
                  bgClass={`${cfg.bgClass} border`}
                />
              );
            })()}

            {/* Temperature */}
            <MetricCard
              label="Temperature"
              value={ctx.snapshot.temperatureC != null ? `${ctx.snapshot.temperatureC.toFixed(0)}°C` : "—"}
              sub={ctx.snapshot.apparentC != null ? `Feels ${ctx.snapshot.apparentC.toFixed(0)}°C` : undefined}
              icon={Thermometer}
              colorClass="text-primary"
              bgClass="bg-card border"
            />

            {/* Humidity */}
            <MetricCard
              label="Humidity"
              value={ctx.snapshot.humidityPct != null ? `${ctx.snapshot.humidityPct}%` : "—"}
              sub={ctx.hydrationNeedLevel !== "none" ? `Hydration: ${ctx.hydrationNeedLevel}` : undefined}
              icon={Droplets}
              colorClass={METRIC_STYLES.humidity.color}
              bgClass={METRIC_STYLES.humidity.bg}
            />
          </div>

          {/* Second row: wind + sunrise/sunset + cognitive + sensory */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Wind"
              value={ctx.snapshot.windKph != null ? `${ctx.snapshot.windKph.toFixed(0)} km/h` : "—"}
              icon={Wind}
              colorClass={METRIC_STYLES.wind.color}
              bgClass={METRIC_STYLES.wind.bg}
            />
            <MetricCard
              label="Daylight"
              value={ctx.snapshot.daylightMinutes != null ? `${Math.floor(ctx.snapshot.daylightMinutes / 60)}h ${ctx.snapshot.daylightMinutes % 60}m` : "—"}
              sub={ctx.circadianLightProfile.replace(/_/g, " ")}
              icon={Sun}
              colorClass={METRIC_STYLES.daylight.color}
              bgClass={METRIC_STYLES.daylight.bg}
            />
            <MetricCard
              label="Focus Weather"
              value={ctx.cognitiveComfortLevel.charAt(0).toUpperCase() + ctx.cognitiveComfortLevel.slice(1)}
              sub="Cognitive comfort"
              icon={Info}
              colorClass={METRIC_STYLES.focus.color}
              bgClass={METRIC_STYLES.focus.bg}
            />
            {(() => {
              const isSafe = ctx.sensoryStressLevel === "none" || ctx.sensoryStressLevel === "low";
              const sc = isSafe ? SENSORY_COLORS.ok : SENSORY_COLORS.bad;
              return (
                <MetricCard
                  label="Sensory Stress"
                  value={ctx.sensoryStressLevel.charAt(0).toUpperCase() + ctx.sensoryStressLevel.slice(1)}
                  sub="Environmental load"
                  icon={AlertTriangle}
                  colorClass={sc.color}
                  bgClass={sc.bg}
                />
              );
            })()}
          </div>

          {/* Risk score bar */}
          <div className="rounded-xl border bg-card p-5">
            <RiskBar score={ctx.environmentalRiskScore} label={t("pages.environment.risk_score_label")} />
          </div>

          {/* Predictive shift */}
          {ctx.predictedWeatherShift && ctx.predictedWeatherShift.kind !== "stable" && (
            <div className={FORECAST_SHIFT_STYLE.wrap}>
              <Zap className={FORECAST_SHIFT_STYLE.icon} />
              <div>
                <p className={FORECAST_SHIFT_STYLE.title}>{t("pages.environment.forecast_shift")}</p>
                <p className={FORECAST_SHIFT_STYLE.body}>{ctx.predictedWeatherShift.label}</p>
              </div>
            </div>
          )}

          {/* Amy's explanations */}
          {ctx.explanations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t("pages.environment.amy_says")}
              </h2>
              <div className="space-y-2">
                {ctx.explanations.map((exp: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">{exp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Season + snapshot timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
            <span>
              {t("pages.environment.season")}: <span className="capitalize font-medium">{ctx.season}</span>
            </span>
            <span>
              {t("pages.environment.updated")}: {new Date(ctx.snapshot.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {ctx.snapshot.source}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
