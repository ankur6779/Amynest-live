/**
 * WeeklyReportCard — Phase 2 of the Adaptive Family Intelligence Engine.
 *
 * 7-day rollup of behavioural signals + goal progress with a small "vs last
 * week" delta strip. When no signal data is available the card shows an
 * empty-state nudge.
 */

import { useTranslation } from "react-i18next";
import {
  useGetChildWeeklyReport,
  getGetChildWeeklyReportQueryKey,
  useListChildren,
  getListChildrenQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

type Direction = "up" | "down" | "flat" | "unknown";

function DirIcon({ direction }: { direction: Direction }) {
  if (direction === "up") return <ArrowUpRight className="h-3.5 w-3.5 text-primary" aria-hidden />;
  if (direction === "down") return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" aria-hidden />;
  if (direction === "flat") return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  return null;
}

function MetricRow({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number | null;
  unit?: string;
  delta: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-foreground font-medium">
        {value === null ? t("intelligence.weekly.no_data") : `${value}${unit ?? ""}`}
        {delta !== null && delta !== 0 && (
          <span
            className={
              "text-xs font-medium " +
              (delta > 0 ? "text-primary" : "text-destructive")
            }
          >
            {delta > 0 ? "+" : ""}
            {delta}
            {unit ?? ""}
          </span>
        )}
      </span>
    </div>
  );
}

export function WeeklyReportCard({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), enabled: childId === undefined },
  });
  const list = (children ?? []) as Array<{ id: number; name: string }>;
  const activeId = childId ?? list[0]?.id ?? 0;
  const { data, isLoading } = useGetChildWeeklyReport(activeId, {
    query: { enabled: activeId > 0, queryKey: getGetChildWeeklyReportQueryKey(activeId) },
  });

  if (activeId <= 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.weekly.title")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("intelligence.weekly.subtitle")}</p>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("intelligence.weekly.loading")}</p>
        )}

        {data && data.signalDays < 5 && (
          <p className="text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2 border border-border">
            {data.signalDays === 0
              ? t("intelligence.weekly.empty")
              : t("intelligence.weekly.unlocking_soon", {
                  defaultValue:
                    "You've logged {{count}} days — insights unlocking soon",
                  count: data.signalDays,
                })}
          </p>
        )}

        {data && data.signalDays >= 5 && (
          <>
            <div className="flex flex-col gap-1.5">
              <MetricRow
                label={t("intelligence.weekly.metrics.mood")}
                value={data.averages.mood}
                delta={data.deltas.mood}
              />
              <MetricRow
                label={t("intelligence.weekly.metrics.focus")}
                value={data.averages.focusScore}
                delta={data.deltas.focusScore}
              />
              <MetricRow
                label={t("intelligence.weekly.metrics.sleep")}
                value={data.averages.sleepQuality}
                delta={data.deltas.sleepQuality}
              />
              <MetricRow
                label={t("intelligence.weekly.metrics.completion")}
                value={data.averages.completionPct}
                unit="%"
                delta={data.deltas.completionPct}
              />
              <MetricRow
                label={t("intelligence.weekly.metrics.tantrums")}
                value={data.averages.tantrumsPerDay}
                delta={data.deltas.tantrumsPerDay}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                {t("intelligence.weekly.signal_days", { count: data.signalDays })}
              </span>
              <span>{t("intelligence.weekly.streak", { count: data.streakDays })}</span>
            </div>

            {data.goalProgress && data.goalProgress.length > 0 && (
              <ul className="flex flex-col gap-1.5 pt-1">
                {data.goalProgress.map((g) => (
                  <li
                    key={g.goal}
                    className="flex items-center justify-between text-sm bg-muted rounded-xl px-3 py-2 border border-border"
                  >
                    <span className="text-foreground">
                      {t(`intelligence.goals.options.${g.goal}`)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DirIcon direction={g.direction as Direction} />
                      {t(`intelligence.weekly.direction.${g.direction}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
