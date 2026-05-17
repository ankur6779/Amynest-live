// Forecast tab — actionable day-ahead summary for parents

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetHouseholdForecast } from "@workspace/api-client-react";
import type {
  HouseholdForecastResponse,
  HouseholdCaregiverLoadForecast,
  HouseholdBottleneckPrediction,
  HouseholdRebalanceProposal,
} from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Sun,
  Cloud,
  Moon,
} from "lucide-react";
import {
  aggregateHourly,
  buildDayPartLoads,
  buildForecastSummary,
  combinedHourlyLoad,
  firstForecastDayHourly,
  loadLevelLabel,
  type DayPart,
  type LoadLevel,
} from "@/lib/schedule-insights";
import { ViewDetailsCollapsible } from "@/components/schedule/view-details-collapsible";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function severityBadge(sev: HouseholdBottleneckPrediction["severity"]) {
  switch (sev) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

function heatColor(load: number, cap: number): string {
  if (cap <= 0) return "bg-slate-100 dark:bg-slate-900";
  const ratio = load / cap;
  if (load === 0) return "bg-slate-50 dark:bg-slate-900/40";
  if (ratio <= 0.5) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (ratio <= 1.0) return "bg-amber-100 dark:bg-amber-900/40";
  if (ratio <= 1.5) return "bg-orange-200 dark:bg-orange-900/50";
  return "bg-red-300 dark:bg-red-900/60";
}

function HeatmapRow({
  caregiver,
  perHour,
  capacity,
}: {
  caregiver: string;
  perHour: number[];
  capacity: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 text-xs font-medium capitalize text-muted-foreground">
        {caregiver}
      </div>
      <div
        className="flex-1 grid grid-cols-24"
        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
      >
        {perHour.map((v, h) => (
          <div
            key={h}
            className={`h-6 border border-white/40 dark:border-border ${heatColor(v, capacity)}`}
            title={`${h}:00 — load ${v.toFixed(1)}`}
          />
        ))}
      </div>
    </div>
  );
}

function DayPartRow({
  part,
  level,
  icon,
  t,
}: {
  part: DayPart;
  level: LoadLevel;
  icon: React.ReactNode;
  t: (k: string, o?: { defaultValue?: string }) => string;
}) {
  const labels: Record<DayPart, string> = {
    morning: t("schedule.day_part.morning", { defaultValue: "Morning" }),
    afternoon: t("schedule.day_part.afternoon", { defaultValue: "Afternoon" }),
    evening: t("schedule.day_part.evening", { defaultValue: "Evening" }),
  };
  const levelText = t(`schedule.load.${loadLevelLabel(level)}`, {
    defaultValue: loadLevelLabel(level),
  });
  const tone =
    level === "heavy"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : level === "moderate"
        ? "text-sky-800 bg-sky-50 border-sky-200"
        : "text-emerald-800 bg-emerald-50 border-emerald-200";

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0 border-border/50">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {labels[part]}
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${tone}`}>
        {levelText}
      </span>
    </div>
  );
}

function RebalanceCard({ p, t }: { p: HouseholdRebalanceProposal; t: (k: string) => string }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{p.fromCaregiver}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">{p.toCaregiver}</span>
        </div>
        <p className="text-muted-foreground">{p.rationale}</p>
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

  const firstDay = useMemo(() => firstForecastDayHourly(forecast), [forecast]);

  const dayParts = useMemo(() => {
    if (!firstDay) return null;
    const combined = combinedHourlyLoad(firstDay.hourly);
    return buildDayPartLoads(combined);
  }, [firstDay]);

  const summary = useMemo(() => {
    if (!dayParts) return null;
    return buildForecastSummary(forecast?.bottlenecks ?? [], dayParts);
  }, [dayParts, forecast?.bottlenecks]);

  const hourlyAllDays = useMemo(
    () =>
      (forecast?.forecasts ?? []).map((f) => ({
        date: f.date,
        hourly: aggregateHourly(f),
      })),
    [forecast?.forecasts],
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("forecast.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("schedule.forecast_subtitle", {
              defaultValue: "What to expect tomorrow — and what to do about it.",
            })}
          </p>
        </div>
        <Select value={String(horizonDays)} onValueChange={(v) => setHorizonDays(Number(v))}>
          <SelectTrigger className="w-24 h-9" data-testid="select-horizon">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5, 7].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {t("forecast.days", { defaultValue: "days" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border/60">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{date}</span>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{t("common.error_generic")}</CardContent>
        </Card>
      )}

      {forecast && summary && dayParts && (
        <>
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <p className="text-xl font-bold text-foreground">{summary.headline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary.suggestion}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("schedule.forecast_by_time", { defaultValue: "By time of day" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DayPartRow
                part="morning"
                level={dayParts.morning}
                icon={<Sun className="h-4 w-4 text-amber-500" />}
                t={t}
              />
              <DayPartRow
                part="afternoon"
                level={dayParts.afternoon}
                icon={<Cloud className="h-4 w-4 text-sky-600" />}
                t={t}
              />
              <DayPartRow
                part="evening"
                level={dayParts.evening}
                icon={<Moon className="h-4 w-4 text-indigo-500" />}
                t={t}
              />
            </CardContent>
          </Card>

          {forecast.bottlenecks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t("schedule.watch_for", { defaultValue: "Watch for" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forecast.bottlenecks.slice(0, 3).map((b, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold capitalize text-foreground">
                        {b.windowLabel}
                      </span>
                      <Badge className={severityBadge(b.severity)}>
                        {t(`forecast.severity.${b.severity}`)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{b.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <ViewDetailsCollapsible>
            <h3 className="text-sm font-bold text-muted-foreground">
              {t("forecast.heatmap_heading")}
            </h3>
            <div className="space-y-4">
              {hourlyAllDays.map(({ date: d, hourly: hrs }) => (
                <Card key={d}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{d}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {Object.entries(hrs).map(([cg, arr]) => (
                      <HeatmapRow key={cg} caregiver={cg} perHour={arr} capacity={1} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {(forecast.rebalanceProposals?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">{t("forecast.rebalance_heading")}</p>
                {forecast.rebalanceProposals.map((p) => (
                  <RebalanceCard key={p.id} p={p} t={t} />
                ))}
              </div>
            )}
          </ViewDetailsCollapsible>
        </>
      )}

      {forecast && forecast.forecasts.length > 0 && forecast.forecasts[0].historyDays === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("forecast.no_history")}</CardContent>
        </Card>
      )}
    </div>
  );
}
