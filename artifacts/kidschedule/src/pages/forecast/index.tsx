// ─────────────────────────────────────────────────────────────────────────
// Forecast page — Predictive Caregiver Load Forecasting Engine.
// Surfaces anticipated bottlenecks, an hour-bucketed heatmap of caregiver
// demand, and rebalance proposals across a multi-day horizon.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetHouseholdForecast } from "@workspace/api-client-react";
import type {
  HouseholdForecastResponse,
  HouseholdCaregiverLoadForecast,
  HouseholdLoadHotspot,
  HouseholdBottleneckPrediction,
  HouseholdRebalanceProposal,
} from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, TrendingUp, AlertTriangle, ArrowRight, CalendarDays } from "lucide-react";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// audit-ok: severity badges encode semantic state (high=red, medium=amber, low=slate); these are not arbitrary brand colors.
function severityBadge(sev: HouseholdBottleneckPrediction["severity"]) {
  switch (sev) {
    case "high":   return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"; // audit-ok: severity=high
    case "medium": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"; // audit-ok: severity=medium
    default:       return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"; // audit-ok: severity=low
  }
}

/** Heatmap cell color based on load value vs capacity. */
// audit-ok: heatmap encodes load/capacity ratio with a fixed thermal palette (cool→warm→hot); intentional non-brand colors.
function heatColor(load: number, cap: number): string {
  if (cap <= 0) return "bg-slate-100 dark:bg-slate-900"; // audit-ok: heatmap=no-capacity
  const ratio = load / cap;
  if (load === 0) return "bg-slate-50 dark:bg-slate-900/40"; // audit-ok: heatmap=idle
  if (ratio <= 0.5) return "bg-emerald-100 dark:bg-emerald-900/30"; // audit-ok: heatmap=light
  if (ratio <= 1.0) return "bg-amber-100 dark:bg-amber-900/40"; // audit-ok: heatmap=at-capacity
  if (ratio <= 1.5) return "bg-orange-200 dark:bg-orange-900/50"; // audit-ok: heatmap=overloaded
  return "bg-red-300 dark:bg-red-900/60"; // audit-ok: heatmap=critical
}

function HeatmapRow({
  caregiver, perHour, capacity,
}: { caregiver: string; perHour: number[]; capacity: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 text-xs font-medium capitalize text-muted-foreground">{caregiver}</div>
      <div className="flex-1 grid grid-cols-24" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {perHour.map((v, h) => (
          <div
            key={h}
            className={`h-6 border border-white/40 dark:border-slate-950 ${heatColor(v, capacity)}`}
            title={`${h}:00 — load ${v.toFixed(1)} / cap ${capacity}`}
          />
        ))}
      </div>
    </div>
  );
}

function aggregateHourly(forecast: HouseholdCaregiverLoadForecast): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const { bucketMinutes, load } = forecast.series;
  const bucketsPerHour = Math.max(1, Math.round(60 / bucketMinutes));
  for (const cg of Object.keys(load)) {
    const arr = load[cg];
    const hours: number[] = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      let peak = 0;
      const start = h * bucketsPerHour;
      const end = Math.min(arr.length, start + bucketsPerHour);
      for (let b = start; b < end; b++) if (arr[b] > peak) peak = arr[b];
      hours[h] = peak;
    }
    out[cg] = hours;
  }
  return out;
}

function HotspotCard({ h, t }: { h: HouseholdLoadHotspot; t: (k: string) => string }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: h.overload >= 1.5 ? "#dc2626" : h.overload >= 0.75 ? "#f59e0b" : "#64748b" }}>{/* audit-ok: hotspot accent strip uses fixed semantic colors (red/amber/slate) for at-a-glance severity */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">{h.caregiver} · {h.startTime}–{h.endTime}</CardTitle>
          <Badge>+{h.overload.toFixed(2)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>{t("forecast.load_label")}: <strong>{h.projectedLoad.toFixed(2)}</strong></div>
        <div className="text-xs text-muted-foreground">
          {t("forecast.capacity_label")}: {h.capacity} · {t("forecast.confidence")}: {h.confidence}/10
        </div>
      </CardContent>
    </Card>
  );
}

function RebalanceCard({ p, t }: { p: HouseholdRebalanceProposal; t: (k: string) => string }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium capitalize">{p.fromCaregiver}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">{p.toCaregiver}</span>
          <Badge variant="outline" className="ml-auto">{p.startTime}</Badge>
        </div>
        <p className="text-sm">
          <strong>{t("forecast.for_child")}:</strong> {p.childName} · <strong>{t("forecast.for_activity")}:</strong> {p.activity}
        </p>
        <p className="text-xs text-muted-foreground">{p.rationale}</p>
      </CardContent>
    </Card>
  );
}

export default function ForecastPage() {
  const { t } = useTranslation();
  const [date] = useState<string>(todayIso());
  const [horizonDays, setHorizonDays] = useState<number>(3);

  const { data, isLoading, error } = useGetHouseholdForecast({ date, horizonDays });
  const forecast = data as HouseholdForecastResponse | undefined;

  const hourly = useMemo(
    () => (forecast?.forecasts ?? []).map((f) => ({ date: f.date, hourly: aggregateHourly(f), confidence: f.confidence })),
    [forecast?.forecasts],
  );

  const proposalsByDate = useMemo(() => {
    const map = new Map<string, HouseholdRebalanceProposal[]>();
    for (const p of forecast?.rebalanceProposals ?? []) {
      const arr = map.get(p.date) ?? [];
      arr.push(p);
      map.set(p.date, arr);
    }
    return map;
  }, [forecast?.rebalanceProposals]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ChevronLeft className="h-4 w-4 mr-1" /> {t("common.back")}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> {t("forecast.title")}
        </h1>
      </div>

      <Card className="mb-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-violet-200 dark:border-violet-800">
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">{date}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{t("forecast.subtitle")}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("forecast.horizon")}:</span>
            <Select value={String(horizonDays)} onValueChange={(v) => setHorizonDays(Number(v))}>
              <SelectTrigger className="w-20 h-8" data-testid="select-horizon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {error && (
        <Card><CardContent className="pt-4 text-sm text-destructive">{t("common.error_generic")}</CardContent></Card>
      )}

      {forecast && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{t("forecast.household_score")}</p>
              <p className="text-2xl font-bold" data-testid="text-household-score">{forecast.householdLoadScore}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{t("forecast.history_days")}</p>
              <p className="text-2xl font-bold">{forecast.forecasts[0]?.historyDays ?? 0}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{t("forecast.horizon")}</p>
              <p className="text-2xl font-bold">{forecast.horizonDays}</p>
            </CardContent></Card>
          </div>

          {forecast.forecasts.length > 0 && (forecast.forecasts[0].historyDays === 0) ? (
            <Card><CardContent className="pt-4 text-sm text-muted-foreground">
              {t("forecast.no_history")}
            </CardContent></Card>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-3">{t("forecast.heatmap_heading")}</h2>
              <div className="space-y-4 mb-6">
                {hourly.map(({ date: d, hourly: hrs }) => (
                  <Card key={d}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{d}</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {Object.keys(hrs).length === 0
                        ? <p className="text-xs text-muted-foreground">{t("forecast.no_history")}</p>
                        : Object.entries(hrs).map(([cg, arr]) => (
                            <HeatmapRow key={cg} caregiver={cg} perHour={arr} capacity={1} />
                          ))}
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 pl-16">
                        <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> {t("forecast.hotspots_heading")}
              </h2>
              {forecast.bottlenecks.length === 0 ? (
                <Card><CardContent className="pt-4 text-sm text-muted-foreground">
                  {t("forecast.no_hotspots")}
                </CardContent></Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 mb-6">
                  {forecast.bottlenecks.map((b, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm capitalize">
                            {b.date} · {b.caregiver} · {b.windowLabel}
                          </CardTitle>
                          <Badge className={severityBadge(b.severity)}>{t(`forecast.severity.${b.severity}`)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm">{b.reason}</CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <h2 className="text-lg font-semibold mb-3">{t("forecast.rebalance_heading")}</h2>
              {forecast.forecasts.map((f) => {
                const props = proposalsByDate.get(f.date) ?? [];
                if (props.length === 0) return null;
                return (
                  <div key={f.date} className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">{f.date}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {props.map((p) => <RebalanceCard key={p.id} p={p} t={t} />)}
                    </div>
                  </div>
                );
              })}
              {(forecast.rebalanceProposals?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">{t("forecast.no_rebalance")}</p>
              )}

              {forecast.forecasts[0]?.hotspots && forecast.forecasts[0].hotspots.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-2">{t("forecast.todays_hotspots")}</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {forecast.forecasts[0].hotspots.map((h) => <HotspotCard key={h.id} h={h} t={t} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
