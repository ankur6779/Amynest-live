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
import { getRewards, getTotalPoints, type Reward } from "@/lib/rewards";
import { routineDateKey, routineItems } from "@/lib/routines";
import { DashboardSectionHeader } from "@/components/dashboard-section-header";
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
      const json: unknown = await res.json();
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
      <div className="rounded-2xl border border-border bg-card/50 h-24 animate-pulse" />
    );
  }
  if (!data || highlights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 overflow-hidden">
      <DashboardSectionHeader
        label={t("dashboard.weekly_insights")}
        subtitle={t("dashboard.weekly_insights_sub")}
        icon={Sparkles}
        accentClassName="bg-indigo-500"
        action={
          <Link href="/insights" className="text-[11px] font-bold text-primary hover:underline">
            {t("dashboard.view_insights")} →
          </Link>
        }
      />
      <div className="px-3 pb-3 space-y-2 -mt-1">
        {highlights.map((h, i) => {
          const IconComp = INSIGHT_ICONS[h.icon] ?? Sparkles;
          return (
            <div
              key={`${h.childId}-${i}`}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${h.accent}22` }}
              >
                <IconComp className="h-4 w-4" style={{ color: h.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{h.childName}</p>
                <p className="font-bold text-sm text-foreground leading-snug">{h.headline}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{h.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RewardsCompactCard() {
  const { t } = useTranslation();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    setPoints(getTotalPoints());
    setRewards(getRewards());
  }, []);

  const sorted = useMemo(() => [...rewards].sort((a, b) => a.cost - b.cost), [rewards]);
  const nextReward = sorted.find((r) => r.cost > points) ?? sorted[sorted.length - 1];
  const progressToNext =
    nextReward && nextReward.cost > points
      ? Math.min(100, Math.round((points / nextReward.cost) * 100))
      : 100;

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            <span className="font-quicksand font-bold text-sm">{t("dashboard.rewards_points")}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 border border-border">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-black text-sm">{points}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{t("pages.dashboard.pts")}</span>
          </div>
        </div>
        {nextReward ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3 mb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
              {t("dashboard.next_reward")}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl">{nextReward.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{nextReward.label}</p>
                <p className="text-xs text-muted-foreground">
                  {points} / {nextReward.cost} {t("pages.dashboard.pts")}
                </p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground mb-3">{t("dashboard.earn_more_points")}</p>
        <Link
          href="/rewards"
          className="flex items-center justify-center gap-2 w-full rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-bold py-2.5 hover:bg-primary/15 transition-colors"
        >
          {t("dashboard.view_all_rewards")}
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
    <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden flex flex-col">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-quicksand text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("dashboard.recent_routines")}
            </CardTitle>
            <CardDescription>{t("pages.dashboard.latest_generated_schedules")}</CardDescription>
          </div>
          <Link href="/routines" className="text-sm font-medium text-primary hover:underline flex items-center">
            {t("dashboard.view_all")} <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />
            <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        ) : routines.length > 0 ? (
          <>
            <div className="divide-y divide-border/50">
              {visible.map((routine) => {
                const items = routineItems(routine) as RoutineItem[];
                const done = items.filter((i) => i.status === "completed").length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                return (
                  <Link
                    key={routine.id}
                    href={`/routines/${routine.id}`}
                    className="block hover:bg-muted/30 transition-colors p-4 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {routine.title}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium border border-border">
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
                            <div className="text-xs font-bold text-foreground">{pct}%</div>
                            <div className="w-[52px] h-1 rounded-full bg-muted ml-auto mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {done}/{items.length}
                            </div>
                          </div>
                        ) : null}
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
                className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-primary hover:bg-muted/30 border-t border-border/50"
              >
                {expanded
                  ? t("dashboard.show_fewer_routines")
                  : t("dashboard.show_more_routines", { count: hiddenCount })}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : null}
          </>
        ) : (
          <div className="p-8 text-center flex flex-col items-center text-muted-foreground min-h-[200px]">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p>{t("pages.dashboard.no_routines_created_yet")}</p>
            <Link href="/routines/generate" className="mt-4 text-primary font-medium hover:underline">
              {t("pages.dashboard.create_your_first_routine")}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
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
    <Card
      className={`rounded-2xl shadow-sm overflow-hidden flex flex-col ${
        showProminentEmpty ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50"
      }`}
    >
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-quicksand text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("dashboard.behavior_highlights")}
            </CardTitle>
            <CardDescription>{t("dashboard.behavior_today_subtitle")}</CardDescription>
          </div>
          <Link href="/behavior" className="text-sm font-medium text-primary hover:underline flex items-center">
            {t("dashboard.log_behavior")} <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        ) : showProminentEmpty ? (
          <div className="p-8 text-center flex flex-col items-center gap-4 min-h-[200px] justify-center">
            <div className="text-4xl">💛</div>
            <div>
              <p className="font-bold text-foreground text-base">{t("dashboard.behavior_empty_title")}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {selectedChildName
                  ? t("dashboard.behavior_empty_sub_child", { name: selectedChildName })
                  : t("dashboard.behavior_empty_sub")}
              </p>
            </div>
            <Link href="/behavior">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 hover:bg-primary/90"
              >
                <Heart className="h-4 w-4" />
                {t("dashboard.behavior_empty_cta")}
              </button>
            </Link>
          </div>
        ) : stats.length > 0 ? (
          <div className="divide-y divide-border/50">
            {stats.map((stat) => (
              <div key={stat.childId} className="p-4">
                <h4 className="font-bold text-foreground mb-3">{stat.childName}</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-2 border border-border">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">{t("dashboard.positive_label")}</span>
                    <span className="font-bold text-primary">{stat.positive}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-destructive/10 rounded-lg px-2.5 py-2 border border-destructive/20">
                    <Heart className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-[10px] text-muted-foreground">{t("dashboard.negative_label")}</span>
                    <span className="font-bold text-destructive">{stat.negative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground min-h-[160px] flex flex-col items-center justify-center">
            <p>{t("pages.dashboard.no_behavior_logged_yet")}</p>
            <Link href="/behavior" className="mt-3 text-primary font-medium hover:underline">
              {t("pages.dashboard.track_a_behavior")}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
