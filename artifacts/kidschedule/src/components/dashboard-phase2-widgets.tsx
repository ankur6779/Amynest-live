import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  Medal,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { getTotalPoints } from "@/lib/rewards";
import { routineDateKey, routineItems } from "@/lib/routines";
import { DashboardSectionHeader } from "@/components/dashboard-section-header";
import { DashboardGlassCard, DashboardGlassChip } from "@/components/dashboard-glass-card";
import { DASHBOARD_SECTION_BODY, DASHBOARD_SECTION_HEADER, DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import type { LucideIcon } from "lucide-react";

type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: Array<{ status?: string }>;
};

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  status?: string;
};

type DashboardSummary = {
  totalChildren?: number;
  totalRoutines?: number;
  positiveBehaviorsToday?: number;
  negativeBehaviorsToday?: number;
  routinesGeneratedThisWeek?: number;
};

type SiblingHighlight = {
  childId: number;
  childName: string;
  headline: string;
  detail: string;
  icon: string;
  accent: string;
};

type InsightsResponse = {
  fallback?: boolean;
  hasChildren: boolean;
  hasActivity: boolean;
  summary: {
    routinesThisPeriod: number;
    routinesChangePct: number;
    positiveRateThisPeriod: number;
    positiveRateChangePts: number;
  };
  siblingHighlights: SiblingHighlight[];
  perChild: Array<{ childId: number; childName: string; routineCompletionRate: number }>;
};

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  happy: Sparkles,
  heart: Heart,
  trophy: Medal,
  flame: Flame,
  sunny: Sparkles,
  moon: Sparkles,
  sparkles: Sparkles,
  "color-palette": Sparkles,
};

function isInsightsPayload(data: unknown): data is InsightsResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "hasChildren" in data &&
    "summary" in data &&
    !("fallback" in data && (data as { fallback?: boolean }).fallback === true)
  );
}

/** Streak + key stats in one card (less scroll than separate streak + 2×2 grid). */
export function TodaySnapshotCard({
  streak,
  routines,
  summary,
  todayDone,
  todayTotal,
}: {
  streak: number;
  routines: Routine[];
  summary: DashboardSummary | null | undefined;
  todayDone: number;
  todayTotal: number;
}) {
  const { t } = useTranslation();
  const dateSet = new Set(routines.map((r) => routineDateKey(r)).filter(Boolean));
  const last7Keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const miniStats = [
    { label: t("dashboard.stat_plans_week"), value: summary?.routinesGeneratedThisWeek ?? 0, href: "/routines" },
    { label: t("dashboard.stat_great_today"), value: summary?.positiveBehaviorsToday ?? 0, href: "/behavior" },
    {
      label: t("dashboard.snapshot_today_done"),
      value: todayTotal > 0 ? `${todayDone}/${todayTotal}` : "—",
      href: "/routines",
    },
    { label: t("dashboard.stat_total_routines"), value: summary?.totalRoutines ?? 0, href: "/children" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Link href="/progress" className="block p-3.5 border-b border-border hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <Flame className={`h-7 w-7 shrink-0 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-2xl text-foreground leading-none">{streak}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase">{t("dashboard.day_streak")}</span>
            </div>
            <div className="flex gap-1 mt-2">
              {last7Keys.map((key) => (
                <span
                  key={key}
                  className={`h-2 w-2 rounded-full ${dateSet.has(key) ? "bg-orange-500" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
          {todayTotal > 0 ? (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("dashboard.snapshot_today")}</p>
              <p className="text-lg font-black text-primary">{todayPct}%</p>
            </div>
          ) : null}
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-px bg-border">
        {miniStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-card p-3 hover:bg-muted/40 transition-colors flex flex-col gap-0.5"
          >
            <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</span>
            <span className="text-lg font-black text-foreground leading-none">{s.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardWeeklyInsightsCard({
  selectedChildId,
}: {
  selectedChildId: number | null;
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-insights", "week", selectedChildId],
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/dashboard/insights?range=week"));
      if (!res.ok) return null;
      const json: unknown = await parseApiJson(res);
      return isInsightsPayload(json) ? json : null;
    },
    staleTime: 5 * 60_000,
  });

  const highlights = useMemo(() => {
    if (!data?.hasActivity) return [];
    const list = data.siblingHighlights ?? [];
    const filtered =
      selectedChildId == null ? list : list.filter((h) => h.childId === selectedChildId);
    if (filtered.length > 0) return filtered.slice(0, 2);
    if (selectedChildId != null) {
      const child = data.perChild.find((c) => c.childId === selectedChildId);
      if (child && child.routineCompletionRate > 0) {
        return [
          {
            childId: child.childId,
            childName: child.childName,
            headline: t("dashboard.insight_completion_headline", {
              pct: Math.round(child.routineCompletionRate),
            }),
            detail: t("dashboard.insight_completion_detail"),
            icon: "calendar",
            accent: "#8b5cf6",
          },
        ];
      }
    }
    if (data.summary.routinesThisPeriod > 0) {
      return [
        {
          childId: 0,
          childName: t("dashboard.all_children"),
          headline: t("dashboard.insight_routines_headline", {
            count: data.summary.routinesThisPeriod,
          }),
          detail:
            data.summary.routinesChangePct !== 0
              ? t("dashboard.insight_routines_change", { pct: data.summary.routinesChangePct })
              : t("dashboard.insight_routines_steady"),
          icon: "sparkles",
          accent: "#6366f1",
        },
      ];
    }
    return [];
  }, [data, selectedChildId, t]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] h-24 animate-pulse" />
    );
  }
  if (!data || highlights.length === 0) return null;

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.weekly}>
      <div className="px-3 pt-3">
        <DashboardSectionHeader
          label={t("dashboard.weekly_insights")}
          subtitle={t("dashboard.weekly_insights_sub")}
          icon={Sparkles}
          accentClassName="bg-indigo-400"
          onDark
          action={
            <Link href="/insights" className="text-[11px] font-bold text-violet-300 hover:underline">
              {t("dashboard.view_insights")} →
            </Link>
          }
        />
      </div>
      <div className={`${DASHBOARD_SECTION_BODY} space-y-2 -mt-1`}>
        {highlights.map((h, i) => {
          const IconComp = INSIGHT_ICONS[h.icon] ?? Sparkles;
          const tint = h.accent.replace("#", "").match(/.{2}/g)?.map((x) => parseInt(x, 16)).join(",") ?? DASHBOARD_TINTS.weekly;
          return (
            <DashboardGlassChip key={`${h.childId}-${i}`} tintRgb={tint}>
              <div className="flex items-start gap-2.5 p-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.08]"
                  style={{ boxShadow: `inset 0 0 0 1px ${h.accent}44` }}
                >
                  <IconComp className="h-4 w-4" style={{ color: h.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white/55 uppercase">{h.childName}</p>
                  <p className="font-bold text-sm text-white leading-snug">{h.headline}</p>
                  <p className="text-xs text-white/60 mt-0.5">{h.detail}</p>
                </div>
              </div>
            </DashboardGlassChip>
          );
        })}
      </div>
    </DashboardGlassCard>
  );
}

export function RewardsCompactCard() {
  const { t } = useTranslation();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    setPoints(getTotalPoints());
  }, []);

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            <span className="font-quicksand font-bold text-sm">{t("nav.games")}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 border border-border">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-black text-sm">{points}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{t("pages.dashboard.pts")}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {points} {t("pages.dashboard.pts")} can unlock more mini-games in Gaming Hub.
        </p>
        <Link
          href="/games"
          className="flex items-center justify-center gap-2 w-full rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-bold py-2.5 hover:bg-primary/15 transition-colors"
        >
          {t("nav.games")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

const RECENT_INITIAL = 3;

export function RecentRoutinesCollapsible({
  routines,
  loading,
}: {
  routines: Routine[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? routines : routines.slice(0, RECENT_INITIAL);
  const hiddenCount = Math.max(0, routines.length - RECENT_INITIAL);

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.routines}>
      <div className={`${DASHBOARD_SECTION_HEADER} justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-300" />
            <span className="font-quicksand font-bold text-sm text-white">{t("dashboard.recent_routines")}</span>
          </div>
          <p className="text-[11px] text-white/55 mt-0.5 ml-7">{t("pages.dashboard.latest_generated_schedules")}</p>
        </div>
        <Link href="/routines" className="text-sm font-medium text-amber-300 hover:underline flex items-center shrink-0">
          {t("dashboard.view_all")} <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="h-16 w-full rounded-xl bg-white/[0.06] animate-pulse" />
            <div className="h-16 w-full rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
        ) : routines.length > 0 ? (
          <>
            <div className="divide-y divide-white/[0.08]">
              {visible.map((routine) => {
                const items = routineItems(routine) as RoutineItem[];
                const done = items.filter((i) => i.status === "completed").length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                return (
                  <Link
                    key={routine.id}
                    href={`/routines/${routine.id}`}
                    className="block hover:bg-white/[0.05] transition-colors p-4 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                          {routine.title}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-white/55 mt-1">
                          <span className="inline-flex rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium border border-white/10">
                            {routine.childName}
                          </span>
                          <span>
                            {new Date(routine.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2 min-w-[56px]">
                        {items.length > 0 ? (
                          <div className="text-right w-full">
                            <div className="text-xs font-bold text-white">{pct}%</div>
                            <div className="w-[52px] h-1 rounded-full bg-white/15 ml-auto mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-white/50 mt-0.5">
                              {done}/{items.length}
                            </div>
                          </div>
                        ) : null}
                        <ArrowRight className="h-4 w-4 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-amber-300 hover:bg-white/[0.04] border-t border-white/[0.08]"
              >
                {expanded
                  ? t("dashboard.show_fewer_routines")
                  : t("dashboard.show_more_routines", { count: hiddenCount })}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : null}
          </>
        ) : (
          <div className="p-8 text-center flex flex-col items-center text-white/55 min-h-[200px]">
            <Calendar className="h-10 w-10 text-white/25 mb-3" />
            <p>{t("pages.dashboard.no_routines_created_yet")}</p>
            <Link href="/routines/generate" className="mt-4 text-amber-300 font-medium hover:underline">
              {t("pages.dashboard.create_your_first_routine")}
            </Link>
          </div>
        )}
      </div>
    </DashboardGlassCard>
  );
}

export function BehaviorHighlightsSection({
  stats,
  loading,
  selectedChildName,
}: {
  stats: Array<{ childId: number; childName: string; positive: number; negative: number; neutral: number }>;
  loading: boolean;
  selectedChildName?: string | null;
}) {
  const { t } = useTranslation();
  const totalToday = stats.reduce((n, s) => n + s.positive + s.negative + s.neutral, 0);
  const showProminentEmpty = !loading && totalToday === 0;

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.behavior}>
      <div className={`${DASHBOARD_SECTION_HEADER} justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-300" />
            <span className="font-quicksand font-bold text-sm text-white">{t("dashboard.behavior_highlights")}</span>
          </div>
          <p className="text-[11px] text-white/55 mt-0.5 ml-7">{t("dashboard.behavior_today_subtitle")}</p>
        </div>
        <Link href="/behavior" className="text-sm font-medium text-rose-300 hover:underline flex items-center shrink-0">
          {t("dashboard.log_behavior")} <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="h-16 w-full rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
        ) : showProminentEmpty ? (
          <div className="p-8 text-center flex flex-col items-center gap-4 min-h-[200px] justify-center">
            <div className="text-4xl">💛</div>
            <div>
              <p className="font-bold text-white text-base">{t("dashboard.behavior_empty_title")}</p>
              <p className="text-sm text-white/60 mt-1 max-w-xs mx-auto">
                {selectedChildName
                  ? t("dashboard.behavior_empty_sub_child", { name: selectedChildName })
                  : t("dashboard.behavior_empty_sub")}
              </p>
            </div>
            <Link href="/behavior">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold text-sm px-6 py-2.5 shadow-[0_4px_18px_rgba(251,113,133,0.35)] hover:from-rose-300 hover:to-pink-400"
              >
                <Heart className="h-4 w-4" />
                {t("dashboard.behavior_empty_cta")}
              </button>
            </Link>
          </div>
        ) : stats.length > 0 ? (
          <div className="divide-y divide-white/[0.08]">
            {stats.map((stat) => (
              <div key={stat.childId} className="p-4">
                <h4 className="font-bold text-white mb-3">{stat.childName}</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-emerald-500/15 rounded-lg px-2.5 py-2 border border-emerald-400/25">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                    <span className="text-[10px] text-white/60">{t("dashboard.positive_label")}</span>
                    <span className="font-bold text-emerald-300">{stat.positive}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-500/15 rounded-lg px-2.5 py-2 border border-rose-400/25">
                    <Heart className="h-3.5 w-3.5 text-rose-300" />
                    <span className="text-[10px] text-white/60">{t("dashboard.negative_label")}</span>
                    <span className="font-bold text-rose-300">{stat.negative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-white/55 min-h-[160px] flex flex-col items-center justify-center">
            <p>{t("pages.dashboard.no_behavior_logged_yet")}</p>
            <Link href="/behavior" className="mt-3 text-rose-300 font-medium hover:underline">
              {t("pages.dashboard.track_a_behavior")}
            </Link>
          </div>
        )}
      </div>
    </DashboardGlassCard>
  );
}
