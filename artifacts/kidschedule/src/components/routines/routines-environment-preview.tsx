import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Cloud, Wind } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  AQI_TONE_CLASSES,
  buildEnvContextDisplay,
  type OutdoorSuitability,
} from "@/lib/environment-display";

type EnvApiContext = {
  location?: { label?: string };
  snapshot?: { temperatureC?: number; aqiUs?: number };
  weatherCondition?: string;
  outdoorSuitability?: OutdoorSuitability;
};

function useGeo() {
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

export function RoutinesEnvironmentPreview() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { geo, geoReady } = useGeo();
  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const childId = (children as { id: number }[] | undefined)?.[0]?.id ?? null;

  const { data: reverseGeoLabel } = useQuery<string | null>({
    queryKey: ["routines-preview-reverse-geo", geo?.lat, geo?.lng],
    queryFn: async () => {
      if (!geo) return null;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${geo.lat}&lon=${geo.lng}&format=json&accept-language=en`,
          { headers: { "User-Agent": "AmyNest/1.0 (parenting-app)" } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          address?: { city?: string; town?: string; village?: string; state?: string; country_code?: string };
        };
        const city = data.address?.city ?? data.address?.town ?? data.address?.village;
        const state = data.address?.state;
        const cc = data.address?.country_code?.toUpperCase();
        if (city && state) return `${city}, ${state}`;
        if (city && cc) return `${city}, ${cc}`;
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!geo,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const { data: envData, isLoading } = useQuery({
    queryKey: ["routines-preview-env", childId, geo?.lat, geo?.lng],
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

  const display = useMemo(() => {
    const ctx = envData?.context;
    if (!ctx) return null;
    return buildEnvContextDisplay({
      snapshot: ctx.snapshot ?? {},
      weatherCondition: ctx.weatherCondition,
      outdoorSuitability: (ctx.outdoorSuitability ?? "limited") as OutdoorSuitability,
      locationLabel: ctx.location?.label,
      reverseGeoLabel,
    });
  }, [envData, reverseGeoLabel]);

  const weatherLine =
    display && display.condition !== "—"
      ? `${display.temperature}, ${display.condition}`
      : display?.temperature ?? "—";

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm bg-card">
      <CardContent className="p-4 flex flex-col gap-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("pages.routines.index.env_preview_title", { defaultValue: "Your environment" })}
        </p>
        {isLoading && geoReady ? (
          <p className="text-sm text-muted-foreground animate-pulse">
            {t("pages.routines.index.env_preview_loading", { defaultValue: "Loading…" })}
          </p>
        ) : display ? (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground">{display.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="text-foreground">{weatherLine}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-slate-600 shrink-0" />
              <span
                className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-bold ${AQI_TONE_CLASSES[display.aqiTone]}`}
              >
                {display.aqi}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("pages.routines.index.env_preview_unavailable", {
              defaultValue: "Environment data will appear when location is available.",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
