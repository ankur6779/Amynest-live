import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Flame, CheckCircle2, Clock, SkipForward, TrendingUp, Sparkles, AlertTriangle, Lightbulb, Star, ArrowRight, BarChart2, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getCachedInsights, saveCachedInsights, clearInsightsCache } from "@/lib/ai-limits";
type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
};
type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
};
type Insight = {
  type: string;
  message: string;
  icon: string;
};
function computeStreak(routines: Routine[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(routines.map(r => r.date.slice(0, 10)));
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
function getInsightStyle(type: string) {
  if (type === "positive") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
  if (type === "warning") return "bg-amber-500/10 border-amber-500/30 text-amber-300";
  return "bg-sky-500/10 border-sky-500/30 text-sky-300";
}
function getInsightIcon(type: string, icon: string) {
  return icon || (type === "positive" ? "✅" : type === "warning" ? "⚠️" : "💡");
}

/** Orange accent border — matches Progress page streak / chart highlights. */
const PROGRESS_BLOCK = cn(
  "rounded-3xl border-[1.5px] border-orange-400/50",
  "shadow-[0_0_0_1px_rgba(251,146,60,0.10),0_4px_18px_rgba(251,146,60,0.10)]",
  "bg-card",
);

export default function ProgressPage() {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const [insights, setInsights] = useState<{
    summary: string;
    insights: Insight[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState(false);
  const [insightsCached, setInsightsCached] = useState(false);
  const [insightsCachedAt, setInsightsCachedAt] = useState<string | null>(null);
  useEffect(() => {
    const cached = getCachedInsights();
    if (cached) {
      setInsights(cached.data);
      setInsightsCached(true);
      setInsightsCachedAt(cached.generatedAt);
    }
  }, []);
  const {
    data: routines,
    isLoading
  } = useListRoutines(undefined, {
    query: {
      queryKey: getListRoutinesQueryKey()
    }
  });
  const allRoutines = (routines ?? []) as Routine[];

  // Compute aggregate stats
  const allItems = allRoutines.flatMap(r => r.items);
  const totalItems = allItems.length;
  const completedItems = allItems.filter(i => i.status === "completed").length;
  const skippedItems = allItems.filter(i => i.status === "skipped").length;
  const delayedItems = allItems.filter(i => i.status === "delayed").length;
  const pendingItems = allItems.filter(i => !i.status || i.status === "pending").length;
  const completionPct = totalItems > 0 ? Math.round(completedItems / totalItems * 100) : 0;

  // Per-child breakdown
  const childMap = new Map<string, {
    completed: number;
    skipped: number;
    delayed: number;
    total: number;
    routineCount: number;
  }>();
  allRoutines.forEach(r => {
    const key = r.childName;
    if (!childMap.has(key)) childMap.set(key, {
      completed: 0,
      skipped: 0,
      delayed: 0,
      total: 0,
      routineCount: 0
    });
    const stat = childMap.get(key)!;
    stat.routineCount++;
    r.items.forEach(item => {
      stat.total++;
      if (item.status === "completed") stat.completed++;else if (item.status === "skipped") stat.skipped++;else if (item.status === "delayed") stat.delayed++;
    });
  });

  // Streak
  const streak = computeStreak(allRoutines);

  // Last 7 days progress
  const weekDays: {
    date: string;
    label: string;
    routineCount: number;
    completionPct: number;
  }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, {
      weekday: "short"
    });
    const dayRoutines = allRoutines.filter(r => r.date.slice(0, 10) === dateStr);
    const dayItems = dayRoutines.flatMap(r => r.items);
    const dayTotal = dayItems.length;
    const dayCompleted = dayItems.filter(i => i.status === "completed").length;
    weekDays.push({
      date: dateStr,
      label,
      routineCount: dayRoutines.length,
      completionPct: dayTotal > 0 ? Math.round(dayCompleted / dayTotal * 100) : 0
    });
  }
  const handleGenerateInsights = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedInsights();
      if (cached) {
        setInsights(cached.data);
        setInsightsCached(true);
        setInsightsCachedAt(cached.generatedAt);
        return;
      }
    }
    setLoadingInsights(true);
    setInsightsError(false);
    try {
      const res = await authFetch("/api/insights", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
        saveCachedInsights(data);
        setInsightsCached(false);
        setInsightsCachedAt(new Date().toISOString());
      } else {
        setInsightsError(true);
      }
    } catch {
      setInsightsError(true);
    } finally {
      setLoadingInsights(false);
    }
  };
  const handleRefreshInsights = () => {
    clearInsightsCache();
    setInsightsCached(false);
    handleGenerateInsights(true);
  };
  const streakMessage =
    streak === 0
      ? t("pages.progress.streak_start")
      : streak === 1
        ? t("pages.progress.streak_day_one")
        : streak < 5
          ? t("pages.progress.streak_building", { count: streak })
          : t("pages.progress.streak_legend", { count: streak });

  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>;
  }
  return <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <header>
        <h1 className="font-quicksand text-3xl font-bold text-foreground">{t("progress.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("pages.progress.track_your_family_s_routine_consistency_and_get_amy_ai_coach")}</p>
      </header>

      {/* Streak Card */}
      <Card className={cn(
        "overflow-hidden",
        streak >= 3
          ? "rounded-3xl border-[1.5px] border-orange-300/60 bg-gradient-to-br from-primary to-primary shadow-[0_4px_24px_rgba(251,146,60,0.25)]"
          : cn(PROGRESS_BLOCK, "bg-gradient-to-br from-muted to-muted"),
      )}>
        <CardContent className="p-6 flex items-center gap-5">
          <div className={`text-5xl ${streak === 0 ? "grayscale opacity-40" : "animate-[bounce_2s_ease-in-out_infinite]"}`}>
            🔥
          </div>
          <div className="flex-1">
            <div className={`font-quicksand text-4xl font-black ${streak >= 3 ? "text-white" : "text-primary"}`}>
              {streak} {t("pages.progress.day")}{streak !== 1 ? "s" : ""}
            </div>
            <p className={`font-bold text-sm mt-0.5 ${streak >= 3 ? "text-white/80" : "text-primary"}`}>
              {streakMessage}
            </p>
          </div>
          <div className={`text-right ${streak >= 3 ? "text-white/70" : "text-primary"}`}>
            <Flame className="h-8 w-8 ml-auto" />
            <p className="text-xs font-bold mt-1">{t("pages.progress.streak")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {totalItems === 0 ? <Card className={PROGRESS_BLOCK}>
          <CardContent className="p-8 text-center">
            <BarChart2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-quicksand text-lg font-bold text-foreground mb-2">{t("pages.progress.no_data_yet")}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t("pages.progress.generate_and_track_routines_to_see_progress_here")}</p>
            <Button asChild className="rounded-full" size="sm">
              <Link href="/routines/generate"><Sparkles className="h-4 w-4 mr-2" />{t("pages.progress.generate_first_routine")}</Link>
            </Button>
          </CardContent>
        </Card> : <>
          {/* Overall Completion */}
          <Card className={PROGRESS_BLOCK}>
            <CardContent className="p-6">
              <h3 className="font-quicksand font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("pages.progress.overall_completion")}
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${completionPct} ${100 - completionPct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-bold text-base text-foreground">{completionPct}%</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/25 rounded-2xl p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-300">{completedItems}</div>
                      <div className="text-xs text-emerald-400/80">{t("pages.progress.completed")}</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 rounded-2xl p-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">{delayedItems}</div>
                      <div className="text-xs text-amber-400/80">{t("pages.progress.delayed")}</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-500/15 to-slate-500/5 border border-slate-500/25 rounded-2xl p-3 flex items-center gap-2">
                    <SkipForward className="h-4 w-4 text-slate-300 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-200">{skippedItems}</div>
                      <div className="text-xs text-slate-400">{t("pages.progress.skipped")}</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/25 rounded-2xl p-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sky-300">{pendingItems}</div>
                      <div className="text-xs text-sky-400/80">{t("pages.progress.pending")}</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("pages.progress.across")} {allRoutines.length} {t("pages.progress.routine")}{allRoutines.length !== 1 ? "s" : ""} · {totalItems} {t("pages.progress.total_tasks")}</p>
            </CardContent>
          </Card>

          {/* Last 7 Days Bar Chart */}
          <Card className={PROGRESS_BLOCK}>
            <CardContent className="p-6">
              <h3 className="font-quicksand font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                {t("pages.progress.last_7_days")}
              </h3>
              <div className="flex items-end gap-2 h-28">
                {weekDays.map(day => {
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              const height = day.routineCount === 0 ? 4 : Math.max(12, day.completionPct * 0.9);
              return <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs font-bold text-foreground/60">{day.completionPct > 0 ? `${day.completionPct}%` : ""}</div>
                      <div className="w-full flex flex-col justify-end" style={{
                  height: "80px"
                }}>
                        <div className={`w-full rounded-t-lg transition-all ${day.routineCount === 0 ? "bg-muted" : isToday ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-[0_0_12px_rgba(251,146,60,0.5)]" : day.completionPct >= 70 ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : day.completionPct >= 40 ? "bg-gradient-to-t from-amber-500 to-amber-400" : "bg-gradient-to-t from-rose-500 to-rose-400"}`} style={{
                    height: `${height}%`
                  }} />
                      </div>
                      <div className={`text-[10px] font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.label}</div>
                      {day.routineCount > 0 && <div className="text-[9px] text-muted-foreground">{day.routineCount}r</div>}
                    </div>;
            })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" />{t("pages.progress.70_done")}</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" />40–69%</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-400" />&lt;40%</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" />{t("pages.progress.no_routine")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Per-Child Breakdown */}
          {childMap.size > 0 && <Card className={PROGRESS_BLOCK}>
              <CardContent className="p-6">
                <h3 className="font-quicksand font-bold text-foreground text-lg mb-4">{t("pages.progress.per_child_breakdown")}</h3>
                <div className="space-y-4">
                  {[...childMap.entries()].map(([childName, stat]) => {
              const pct = stat.total > 0 ? Math.round(stat.completed / stat.total * 100) : 0;
              return <div key={childName}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-foreground text-sm">{childName}</span>
                          <span className="text-xs text-muted-foreground">{stat.routineCount} {t("pages.progress.routine_2")}{stat.routineCount !== 1 ? "s" : ""} · {pct}{t("pages.progress.done")}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : pct >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-rose-500 to-rose-400"}`} style={{
                    width: `${pct}%`
                  }} />
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="text-emerald-400">✓ {stat.completed} {t("pages.progress.done_2")}</span>
                          <span className="text-amber-400">⏱ {stat.delayed} {t("pages.progress.delayed_2")}</span>
                          <span>⏭ {stat.skipped} {t("pages.progress.skipped_2")}</span>
                        </div>
                      </div>;
            })}
                </div>
              </CardContent>
            </Card>}
        </>}

      {/* AI Insights */}
      <Card className={cn(PROGRESS_BLOCK, "overflow-hidden")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-quicksand font-bold text-foreground text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("pages.progress.amy_ai_parenting_insights")}
              <Badge className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold border-0 shadow-[0_2px_10px_rgba(168,85,247,0.4)]">
                <Zap className="h-3 w-3 mr-1" />
                {t("pages.progress.amy_ai")}
              </Badge>
            </h3>
            <div className="flex items-center gap-2">
              {insights && !loadingInsights && <Button onClick={handleRefreshInsights} disabled={loadingInsights} size="sm" variant="ghost" className="rounded-full text-muted-foreground h-8 px-3">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {t("pages.progress.refresh")}
                </Button>}
              <Button onClick={() => handleGenerateInsights(false)} disabled={loadingInsights} size="sm" className="rounded-full">
                {loadingInsights ? <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 animate-spin" />{t("pages.progress.analyzing")}</span> : <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />{insights ? t("pages.progress.insights_view") : t("pages.progress.insights_generate")}</span>}
              </Button>
            </div>
          </div>

          {insightsCached && insightsCachedAt && <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              {t("pages.progress.cached_this_week_generated")} {new Date(insightsCachedAt).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric"
          })}
            </p>}

          {!insights && !loadingInsights && !insightsError && <div className="text-center py-6">
              <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">{t("pages.progress.click_generate_to_get_amy_ai_insights_based_on_your_family_s")}</p>
              <p className="text-xs text-muted-foreground mt-2 opacity-70">{t("pages.progress.insights_are_cached_for_the_week_generated_once_shown_all_we")}</p>
            </div>}

          {insightsError && !loadingInsights && <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("pages.progress.insights_load_error")}</p>
              <Button onClick={() => handleGenerateInsights(true)} size="sm" variant="outline" className="rounded-full mt-3">
                {t("screens.insights.retry")}
              </Button>
            </div>}

          {loadingInsights && <div className="space-y-3">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>}

          {insights && !loadingInsights && <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground/80 italic">"{insights.summary}"</p>
              </div>
              {insights.insights.map((insight, i) => <div key={i} className={`border rounded-2xl p-4 flex items-start gap-3 ${getInsightStyle(insight.type)}`}>
                  <span className="text-xl shrink-0">{getInsightIcon(insight.type, insight.icon)}</span>
                  <p className="text-sm font-medium">{insight.message}</p>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
}