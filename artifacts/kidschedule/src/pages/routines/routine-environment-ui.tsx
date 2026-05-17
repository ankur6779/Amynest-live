import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { MapPin, Cloud, Wind, AlertTriangle } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  AQI_TONE_CLASSES,
  buildEnvContextDisplay,
  type EnvContextDisplay,
  type OutdoorSuitability,
} from "@/lib/environment-display";
import {
  type SchoolMealPreference,
  schoolMealPreferenceToApiMode,
} from "@/lib/school-meal-preference";
import { AutoDetectedBadge } from "./routine-generate-inputs.js";

type WeatherOutdoorChoice = "yes" | "no" | "limited";

type EnvApiContext = {
  location?: { label?: string };
  snapshot?: { temperatureC?: number; aqiUs?: number };
  weatherCondition?: string;
  outdoorSuitability?: OutdoorSuitability;
};

export function EnvironmentContextCard({
  display,
  loading,
  error,
}: {
  display: EnvContextDisplay | null;
  loading?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-4/5 bg-muted rounded" />
        <div className="h-3 w-3/5 bg-muted rounded" />
      </div>
    );
  }

  if (error || !display) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {error ??
          t("pages.routines.generate.env_card_unavailable", {
            defaultValue:
              "Live environment data unavailable — pick outdoor allowance below.",
          })}
      </div>
    );
  }

  const aqiClass = AQI_TONE_CLASSES[display.aqiTone];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("pages.routines.generate.env_live_title", { defaultValue: "Live environment" })}
        </p>
        <AutoDetectedBadge />
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
              {t("pages.routines.generate.env_location", { defaultValue: "Location" })}
            </p>
            <p className="font-semibold text-foreground">{display.location}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Cloud className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
              {t("pages.routines.generate.env_weather", { defaultValue: "Weather" })}
            </p>
            <p className="font-semibold text-foreground">
              {display.temperature}
              {display.condition !== "—" ? ` · ${display.condition}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Wind className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
              {t("pages.routines.generate.env_aqi", { defaultValue: "AQI" })}
            </p>
            <span
              className={`inline-flex mt-0.5 items-center rounded-lg border px-2 py-0.5 text-xs font-bold ${aqiClass}`}
            >
              {display.aqi}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 px-2.5 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-amber-800/80 font-bold">
              {t("pages.routines.generate.env_outdoor", { defaultValue: "Outdoor suggestion" })}
            </p>
            <p className="font-semibold text-amber-950 dark:text-amber-100 text-xs leading-snug">
              {display.outdoorRecommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function useRoutineGeo() {
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    let done = false;
    const fallback = setTimeout(() => {
      if (!done) {
        done = true;
        setGeoReady(true);
      }
    }, 3000);
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!done) {
            done = true;
            clearTimeout(fallback);
            setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGeoReady(true);
          }
        },
        () => {
          if (!done) {
            done = true;
            clearTimeout(fallback);
            setGeoReady(true);
          }
        },
        { timeout: 2500, maximumAge: 600_000 },
      );
    } else {
      clearTimeout(fallback);
      setGeoReady(true);
    }
    return () => {
      done = true;
      clearTimeout(fallback);
    };
  }, []);

  return { geo, geoReady };
}

export function EnvironmentSection({
  childId,
  autoDetectEnabled,
  weatherOutdoor,
  onWeatherChange,
  onWeatherTouched,
  allowEnvSync = true,
}: {
  childId: number | null;
  autoDetectEnabled: boolean;
  weatherOutdoor: WeatherOutdoorChoice;
  onWeatherChange: (v: WeatherOutdoorChoice) => void;
  onWeatherTouched?: () => void;
  /** When false, env API won't overwrite the user's outdoor choice. */
  allowEnvSync?: boolean;
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { geo, geoReady } = useRoutineGeo();

  const { data: envData, isLoading, isError, error } = useQuery({
    queryKey: ["routine-env-ctx", childId, geo?.lat, geo?.lng],
    queryFn: async () => {
      const parts = [
        childId != null ? `childId=${childId}` : "",
        geo ? `lat=${geo.lat}&lng=${geo.lng}` : "",
      ].filter(Boolean);
      const qs = parts.length ? `?${parts.join("&")}` : "";
      const res = await authFetch(`/api/environment/context${qs}`);
      if (!res.ok) throw new Error("env_failed");
      return res.json() as Promise<{ context: EnvApiContext }>;
    },
    enabled: geoReady,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: reverseGeoLabel } = useQuery<string | null>({
    queryKey: ["routine-reverse-geo", geo?.lat, geo?.lng],
    queryFn: async () => {
      if (!geo) return null;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${geo.lat}&lon=${geo.lng}&format=json&accept-language=en`,
          { headers: { "User-Agent": "AmyNest/1.0 (parenting-app)" } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          address?: {
            city?: string;
            town?: string;
            village?: string;
            state?: string;
            country_code?: string;
          };
        };
        const city =
          data.address?.city ?? data.address?.town ?? data.address?.village;
        const state = data.address?.state;
        const cc = data.address?.country_code?.toUpperCase();
        if (city && state) return `${city}, ${state}`;
        if (city && cc) return `${city}, ${cc}`;
        if (state && cc) return `${state}, ${cc}`;
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!geo,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const ctx = envData?.context;
  const display = useMemo(() => {
    if (!ctx) return null;
    const suitability = (ctx.outdoorSuitability ?? "limited") as OutdoorSuitability;
    return buildEnvContextDisplay({
      snapshot: ctx.snapshot ?? {},
      weatherCondition: ctx.weatherCondition,
      outdoorSuitability: suitability,
      locationLabel: ctx.location?.label,
      reverseGeoLabel,
    });
  }, [ctx, reverseGeoLabel]);

  useEffect(() => {
    if (!autoDetectEnabled || !allowEnvSync || !ctx?.outdoorSuitability) return;
    onWeatherChange(ctx.outdoorSuitability as WeatherOutdoorChoice);
  }, [autoDetectEnabled, allowEnvSync, ctx?.outdoorSuitability, onWeatherChange]);

  const options: {
    val: WeatherOutdoorChoice;
    label: string;
    emoji: string;
    hint: string;
  }[] = [
    {
      val: "yes",
      label: t("pages.routines.generate.weather_yes", { defaultValue: "Yes" }),
      emoji: "☀️",
      hint: t("pages.routines.generate.weather_yes_hint", {
        defaultValue: "Full outdoor allowed",
      }),
    },
    {
      val: "limited",
      label: t("pages.routines.generate.weather_limited", { defaultValue: "Limited" }),
      emoji: "🌤️",
      hint: t("pages.routines.generate.weather_limited_hint", {
        defaultValue: "Short outdoor + indoor backup",
      }),
    },
    {
      val: "no",
      label: t("pages.routines.generate.weather_no", { defaultValue: "No" }),
      emoji: "🌧️",
      hint: t("pages.routines.generate.weather_no_hint", { defaultValue: "Indoor only" }),
    },
  ];

  const envError =
    isError && error instanceof Error
      ? t("pages.routines.generate.env_fetch_failed", {
          defaultValue: "Couldn't load environment data.",
        })
      : null;

  return (
    <div className="space-y-4">
      {autoDetectEnabled && (
        <EnvironmentContextCard
          display={display}
          loading={isLoading && geoReady}
          error={envError}
        />
      )}

      <div className="space-y-3">
        <Label className="text-base sm:text-lg font-bold flex items-center gap-2">
          <span className="text-xl">🌤️</span>
          {t("pages.routines.generate.weather_outdoor_label", {
            defaultValue: "Outdoor allowance",
          })}
        </Label>
        {display && autoDetectEnabled && (
          <p className="text-xs text-muted-foreground -mt-1">
            {t("pages.routines.generate.env_outdoor_override_hint", {
              defaultValue: "Override if your plans differ from the suggestion above.",
            })}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {options.map((o) => {
            const active = weatherOutdoor === o.val;
            return (
              <button
                key={o.val}
                type="button"
                onClick={() => {
                  onWeatherChange(o.val);
                  onWeatherTouched?.();
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                }`}
              >
                <span className="text-2xl leading-none">{o.emoji}</span>
                <span className="text-sm font-bold leading-tight">{o.label}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    active ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {o.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SCHOOL_MEAL_OPTIONS: {
  value: SchoolMealPreference;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
}[] = [
  {
    value: "meals_from_home",
    titleKey: "pages.routines.generate.school_meals_needed",
    titleDefault: "🍱 School meals needed",
    descKey: "pages.routines.generate.school_meals_needed_hint",
    descDefault: "Suggest snack, lunch, or tiffin from home",
  },
  {
    value: "school_provides_meals",
    titleKey: "pages.routines.generate.school_meals_not_needed",
    titleDefault: "🏫 No school meals needed",
    descKey: "pages.routines.generate.school_meals_not_needed_hint",
    descDefault: "School provides meals (common in US/UK)",
  },
];

export function SchoolMealSelector({
  value,
  onChange,
}: {
  value: SchoolMealPreference;
  onChange: (v: SchoolMealPreference) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">
        {t("pages.routines.generate.school_meal_mode_label", {
          defaultValue: "School meals",
        })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("pages.routines.generate.school_meal_helper", {
          defaultValue:
            "This helps Amy suggest the right meals for your child's school routine",
        })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SCHOOL_MEAL_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}
              >
                {t(opt.titleKey, { defaultValue: opt.titleDefault })}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                {t(opt.descKey, { defaultValue: opt.descDefault })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { schoolMealPreferenceToApiMode };
