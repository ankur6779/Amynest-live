import { useTranslation } from "react-i18next";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentRoutines, getGetRecentRoutinesQueryKey, useGetBehaviorStats, getGetBehaviorStatsQueryKey, useListRoutines, getListRoutinesQueryKey, useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Calendar, Users, Star, ArrowRight, Activity, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, Sparkles, Trophy, Bot, Brain, Heart, Target, ChevronRight } from "lucide-react";
import { getAgeGroup, getAgeGroupInfo, formatAge } from "@/lib/age-groups";
import { AmyIcon } from "@/components/amy-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";

import { getTotalPoints, getBadges, getRewards, redeemReward, type Reward } from "@/lib/rewards";

const POLL_INTERVAL_MS = 30_000;

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
  ageBand?: string;
};

type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
};

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "dashboard.good_morning";
  if (hour >= 12 && hour < 17) return "dashboard.good_afternoon";
  return "dashboard.good_evening";
}

function parseTimeToMinutes(t: string): number {
  const [timePart, period] = (t ?? "").split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let h = hours;
  if (period === "PM" && hours !== 12) h += 12;
  if (period === "AM" && hours === 12) h = 0;
  return h * 60 + (minutes || 0);
}

function computeStreak(routines: Routine[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(routines.map((r) => r.date.slice(0, 10)));
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

// ─── Hero Greeting — premium, calm, clear ────────────────────────────────
function HeroGreeting({ displayName, hasChildren, lastUpdated }: { displayName: string; hasChildren: boolean; lastUpdated: number }) {
  const { t } = useTranslation();
  const greeting = t(getGreetingKey());
  const heading = displayName
    ? t("dashboard.greeting_with_name", { name: displayName })
    : t("dashboard.greeting_no_name");

  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const syncedTime = lastUpdated > 0
    ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-100/70 dark:border-violet-400/15 bg-gradient-to-br from-violet-50/70 via-white to-white dark:from-violet-500/10 dark:via-slate-900/40 dark:to-slate-900/40 px-5 sm:px-6 py-5 sm:py-6 animate-in fade-in duration-400">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-violet-200/40 dark:bg-violet-500/15 blur-3xl pointer-events-none" />
      <div className="relative flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">{greeting}</p>
          <h1 className="font-quicksand text-2xl sm:text-[28px] font-black text-foreground mt-1 leading-[1.15] tracking-tight">
            👋 {heading}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
            {hasChildren ? t("dashboard.planned_for_you") : t("dashboard.setup_first")}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline font-medium">{dateStr}</span>
          {syncedTime && (
            <span className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/60 backdrop-blur rounded-full px-2.5 py-1 border border-border/70">
              <LiveDot />
              <span className="font-semibold">Live · {syncedTime}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Tiny section label used to chunk the dashboard into clear groups
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-1 mb-0.5 px-0.5">
      <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

// ─── Children Profile Strip (horizontal scroll) ────────────────────────────
function ChildrenStrip({ children }: { children: any[] }) {
  const { t } = useTranslation();
  if (children.length === 0) return null;
  return (
    <div>
      <SectionLabel
        action={
          <Link href="/children" className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700">
            {t("common.manage")} →
          </Link>
        }
      >
        {t("dashboard.your_little_ones")}
      </SectionLabel>
      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory -mx-0.5 px-0.5 mt-2">
        {children.map((c: any, i: number) => {
          const ageMonths = c.ageMonths ?? 0;
          const group = getAgeGroup(c.age, ageMonths);
          const info = getAgeGroupInfo(group);
          return (
            <Link key={c.id} href={`/children/${c.id}`}>
              <div
                className="relative shrink-0 snap-start min-w-[160px] sm:min-w-[175px] rounded-2xl border border-border bg-card p-3.5 overflow-hidden transition-all hover:scale-[1.02] hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm cursor-pointer"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-400/20">
                    {info.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm leading-tight truncate text-foreground">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatAge(c.age, ageMonths)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                  Personalised for {c.name}
                </p>
              </div>
            </Link>
          );
        })}
        <Link href="/children/new">
          <div className="shrink-0 snap-start min-w-[110px] rounded-2xl border border-dashed border-border p-3.5 flex items-center justify-center text-center hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition-all cursor-pointer">
            <div>
              <div className="text-xl mb-1">➕</div>
              <p className="text-xs font-bold text-muted-foreground">Add child</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Live indicator dot ────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span className="relative inline-flex items-center h-2 w-2" aria-label="Live data">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

// ─── Now / Next Timeline ───────────────────────────────────────────────────
function NowNextTimeline({ routines }: { routines: Routine[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => r.date.slice(0, 10) === todayStr);

  if (todayRoutines.length === 0) {
    return (
      <Card className="rounded-2xl border-2 border-dashed border-border bg-card">
        <CardContent className="p-6 text-center space-y-3">
          <div className="text-4xl">🗓️</div>
          <p className="font-bold text-foreground">No plan for today yet</p>
          <p className="text-xs text-muted-foreground">Create today's routine in one tap.</p>
          <Link href="/routines/generate">
            <button className="mt-1 inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-5 py-2.5 transition-colors">
              <Sparkles className="h-4 w-4" />
              Plan My Child's Day
            </button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const allItems = todayRoutines.flatMap((r) =>
    r.items.map((item) => ({ ...item, childName: r.childName, routineId: r.id }))
  ).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  let currentIdx = -1;
  for (let i = 0; i < allItems.length; i++) {
    const itemMinutes = parseTimeToMinutes(allItems[i].time);
    const nextMinutes = i + 1 < allItems.length ? parseTimeToMinutes(allItems[i + 1].time) : 24 * 60;
    if (itemMinutes <= nowMinutes && nowMinutes < nextMinutes) { currentIdx = i; break; }
  }

  const displayItems = currentIdx >= 0
    ? allItems.slice(currentIdx, currentIdx + 3)
    : allItems.filter((item) => parseTimeToMinutes(item.time) > nowMinutes).slice(0, 3);

  if (displayItems.length === 0) {
    return (
      <Card className="rounded-2xl border border-border bg-card">
        <CardContent className="p-5 text-center space-y-1">
          <div className="text-3xl">🌙</div>
          <p className="font-bold text-foreground">Day complete!</p>
          <p className="text-xs text-muted-foreground">Time to relax and recharge</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-500" />
          <span className="font-quicksand font-bold text-sm text-foreground">Today's Timeline</span>
          <LiveDot />
        </div>
        <Link href="/routines" className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-0.5">
          View all <ArrowRight className="h-3 w-3 ml-0.5" />
        </Link>
      </div>
      <div className="p-3 space-y-1.5">
        {displayItems.map((item, idx) => {
          const isCurrent = currentIdx >= 0 && idx === 0;
          const isNext = idx === (currentIdx >= 0 ? 1 : 0);
          const completed = item.status === "completed";
          return (
            <Link key={`${item.routineId}-${idx}`} href={`/routines/${item.routineId}`}>
              <div
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-violet-600 text-white"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className={`flex flex-col items-center w-14 shrink-0 ${isCurrent ? "text-white" : "text-muted-foreground"}`}>
                  <div className="text-xs font-bold">{item.time}</div>
                  {isCurrent && <span className="mt-1 text-[9px] font-black uppercase bg-white/25 px-1.5 py-0.5 rounded-full">Now</span>}
                  {!isCurrent && isNext && <span className="mt-1 text-[9px] font-black uppercase bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full">Next</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${isCurrent ? "text-white" : "text-foreground"} ${completed ? "line-through opacity-60" : ""}`} style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                    {item.activity}
                  </div>
                  <div className={`text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap ${isCurrent ? "text-violet-100" : "text-muted-foreground"}`}>
                    <span>{item.childName} · {item.duration}m</span>
                    {item.ageBand && (
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${isCurrent ? "bg-white/20 text-white border-white/30" : "text-sky-700 bg-sky-50 border-sky-200"}`}>
                        <Users className="h-2.5 w-2.5" />
                        Ages {item.ageBand.replace("-", "–")}
                      </span>
                    )}
                  </div>
                </div>
                {completed && !isCurrent && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Streak Card (compact row) ────────────────────────────────────────────
function StreakCard({ streak }: { streak: number }) {
  return (
    <Link href="/progress">
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-sm transition-all cursor-pointer group">
        <div className={`text-2xl ${streak === 0 ? "grayscale opacity-40" : ""}`}>🔥</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-2xl text-foreground leading-none">{streak}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Day Streak</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {streak === 0 ? "Start today!" : streak >= 3 ? "You're on a roll!" : "Keep going!"}
          </p>
        </div>
        <div className="shrink-0">
          {streak > 0 && (
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-400/20 px-2 py-0.5 rounded-full">
              {streak >= 7 ? "🏆 Epic" : streak >= 3 ? "🔥 Hot" : "✨ Active"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Flat Stat Tile ───────────────────────────────────────────────────────
function StatTile({ label, value, sublabel, icon }: {
  label: string; value: number | string; sublabel: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-violet-500 dark:text-violet-400">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black text-foreground leading-none">{value}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{sublabel}</div>
      </div>
    </div>
  );
}

// ─── Stats 2×2 Grid ───────────────────────────────────────────────────────
function StatsGrid({ summary, loading }: { summary: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile
        label="Routines" value={summary?.routinesGeneratedThisWeek || 0} sublabel="this week"
        icon={<Calendar className="h-3.5 w-3.5" />}
      />
      <StatTile
        label="Great Job" value={summary?.positiveBehaviorsToday || 0} sublabel="today"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      />
      <StatTile
        label="Challenging" value={summary?.negativeBehaviorsToday || 0} sublabel="today"
        icon={<TrendingDown className="h-3.5 w-3.5" />}
      />
      <StatTile
        label="Children" value={summary?.totalChildren || 0} sublabel="total"
        icon={<Users className="h-3.5 w-3.5" />}
      />
    </div>
  );
}

// ─── Amy AI Suggestion Card ───────────────────────────────────────────────
function AmySuggestionCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => r.date.slice(0, 10) === todayStr);
  const allItems = todayRoutines.flatMap((r) => r.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();

  const suggestions: { emoji: string; text: string }[] = [];

  if (total === 0) {
    suggestions.push({ emoji: "📅", text: "No routine for today yet. Generate one to get started!" });
  } else if (pct < 30 && hour >= 14) {
    suggestions.push({ emoji: "⚡", text: "Your child seems behind today — try shorter, easier tasks to build momentum." });
  } else if (pct >= 80) {
    suggestions.push({ emoji: "🌟", text: "Amazing progress today! Consider a small reward to celebrate." });
  }

  if (hour >= 15 && hour <= 17) {
    suggestions.push({ emoji: "❤️", text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way." });
  }

  if (streak >= 3) {
    suggestions.push({ emoji: "🔥", text: `You're on a ${streak}-day streak! Consistency builds habits.` });
  } else if (streak === 0 && hour < 10) {
    suggestions.push({ emoji: "☀️", text: "Fresh start today! Generate a routine to set a positive tone for the day." });
  }

  if (hour >= 19) {
    suggestions.push({ emoji: "🌙", text: "Wind-down time! End screen time 30 min before sleep for better rest." });
  }

  const display = suggestions.slice(0, 2);

  return (
    <div className="rounded-2xl border border-violet-100 dark:border-violet-400/20 bg-violet-50/50 dark:bg-violet-500/8 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-100 dark:border-violet-400/15">
        <AmyIcon size={18} bounce />
        <span className="font-quicksand font-bold text-sm text-foreground">Amy AI Suggests</span>
      </div>
      <div className="p-3 space-y-2">
        {display.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-border text-sm">
            <span className="text-base shrink-0 mt-0.5">{s.emoji}</span>
            <p className="leading-snug text-foreground/85">{s.text}</p>
          </div>
        ))}
        {display.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">All looking good today!</p>
        )}
      </div>
    </div>
  );
}

// ─── Parent Score Card ────────────────────────────────────────────────────
function ParentScoreCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const last7 = routines.slice(0, 7);
  const totalItems = last7.flatMap((r) => r.items).length;
  const completedItems = last7.flatMap((r) => r.items).filter((i) => i.status === "completed").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const percentile = score >= 80 ? 90 : score >= 60 ? 70 : score >= 40 ? 50 : score >= 20 ? 30 : 15;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Trophy className="h-4 w-4 text-violet-500" />
        <span className="font-quicksand font-bold text-sm text-foreground">Parent Score</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-400/20 flex items-center justify-center shrink-0">
            <span className="font-black text-2xl text-violet-600 dark:text-violet-400">{grade}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-2xl text-foreground">{score}</span>
              <span className="text-xs text-muted-foreground font-bold">/100</span>
            </div>
            <p className="text-xs text-muted-foreground">Top {100 - percentile}% of parents</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-bold text-foreground">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Days active</span>
            <span className="font-bold text-foreground">{daysActive}/7</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-violet-400 h-1.5 rounded-full transition-all" style={{ width: `${(daysActive / 7) * 100}%` }} />
          </div>
        </div>
        {score < 60 && (
          <p className="text-xs text-muted-foreground bg-muted rounded-xl p-2.5 border border-border">
            💡 Complete 5+ tasks per day to boost your score!
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Rewards Card ─────────────────────────────────────────────────────────
function RewardsCard({ streak }: { streak: number }) {
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState<ReturnType<typeof getBadges>>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);

  useEffect(() => {
    setPoints(getTotalPoints());
    setBadges(getBadges());
    setRewards(getRewards());
  }, []);

  const handleRedeem = (reward: Reward) => {
    const ok = redeemReward(reward, "Child");
    if (ok) {
      setPoints(getTotalPoints());
      setRedeemMsg(`🎉 Redeemed: ${reward.emoji} ${reward.label}!`);
      setTimeout(() => setRedeemMsg(null), 3000);
    } else {
      setRedeemMsg(`❌ Not enough points (need ${reward.cost})`);
      setTimeout(() => setRedeemMsg(null), 2000);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="font-quicksand text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-600" />
            Rewards & Points
          </CardTitle>
          <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 rounded-full px-3 py-1 border border-violet-100 dark:border-violet-400/20">
            <Star className="h-3.5 w-3.5 fill-violet-500" />
            <span className="font-black text-sm">{points}</span>
            <span className="text-xs font-medium">pts</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {redeemMsg && (
          <div className="text-sm font-medium text-center py-1.5 px-3 bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-green-400/30 rounded-xl text-green-800 dark:text-green-200">
            {redeemMsg}
          </div>
        )}
        {badges.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Badges Earned</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-400/20 rounded-full px-2.5 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                  {b.emoji} {b.label}
                </div>
              ))}
            </div>
          </div>
        )}
        {badges.length === 0 && (
          <p className="text-xs text-muted-foreground">Complete tasks to earn badges! Complete a task to unlock <strong>🌟 First Day Completed</strong>.</p>
        )}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Reward Store</p>
          <div className="space-y-2">
            {rewards.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{r.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.cost} pts</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRedeem(r)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                    points >= r.cost
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Redeem
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────
function OnboardingScreen({ displayName }: { displayName: string }) {
  const features = [
    { icon: <Brain className="h-5 w-5" />, emoji: "🧠", label: "Amy AI Routine Generator", desc: "Smart daily schedules tailored to your child's age and needs.", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-400/20" },
    { icon: <TrendingUp className="h-5 w-5" />, emoji: "📊", label: "Progress Tracking", desc: "Monitor growth, streaks, and milestones in one beautiful view.", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-400/20" },
    { icon: <Target className="h-5 w-5" />, emoji: "🎯", label: "Daily Activities", desc: "Age-based activities that build skills while keeping kids engaged.", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-400/20" },
    { icon: <Star className="h-5 w-5" />, emoji: "🧩", label: "Learning & Puzzles", desc: "Adaptive daily puzzles that grow harder as your child levels up.", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-400/20" },
    { icon: <Heart className="h-5 w-5" />, emoji: "❤️", label: "Parenting Tips", desc: "Expert-curated tips, sleep guides, and milestone insights.", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-400/20" },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start animate-in fade-in duration-500">
      <div className="w-full rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-8 mb-8 text-white text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-12 translate-x-12 blur-sm" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-white/10 translate-y-10 -translate-x-10 blur-sm" />
        <div className="relative z-10 flex justify-center mb-5">
          <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="80" cy="128" rx="55" ry="8" fill="white" fillOpacity="0.15" />
            <rect x="42" y="68" width="26" height="48" rx="13" fill="white" fillOpacity="0.9" />
            <circle cx="55" cy="55" r="18" fill="white" fillOpacity="0.95" />
            <circle cx="49" cy="53" r="2.5" fill="#6366F1" />
            <circle cx="61" cy="53" r="2.5" fill="#6366F1" />
            <path d="M49 60 Q55 65 61 60" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M68 82 Q88 72 96 78" stroke="white" strokeOpacity="0.9" strokeWidth="10" strokeLinecap="round" />
            <rect x="90" y="88" width="22" height="36" rx="11" fill="white" fillOpacity="0.85" />
            <circle cx="101" cy="76" r="14" fill="white" fillOpacity="0.95" />
            <circle cx="96.5" cy="74" r="2" fill="#EC4899" />
            <circle cx="105.5" cy="74" r="2" fill="#EC4899" />
            <path d="M97 80 Q101 84 105 80" stroke="#EC4899" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <text x="22" y="42" fontSize="16" fill="white" fillOpacity="0.7">✨</text>
            <text x="120" y="50" fontSize="12" fill="white" fillOpacity="0.6">⭐</text>
            <text x="118" y="100" fontSize="10" fill="white" fillOpacity="0.5">🌟</text>
          </svg>
        </div>
        <div className="relative z-10 space-y-2">
          <p className="text-violet-200 text-sm font-semibold uppercase tracking-widest">Meet Amy AI</p>
          <h1 className="text-3xl font-black leading-tight">
            👋 Hi{displayName ? `, ${displayName}` : ""} 😊
          </h1>
          <p className="text-violet-100 text-lg font-medium">I'm Amy — your smart parenting partner ❤️</p>
          <p className="text-violet-200/90 text-sm max-w-xs mx-auto leading-relaxed mt-1">
            Create personalised routines, track progress, and make parenting easier — one day at a time.
          </p>
        </div>
      </div>
      <div className="w-full flex items-center justify-center gap-2 mb-7">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
        <p className="text-sm font-bold text-muted-foreground px-3 text-center">
          Start your child's smart routine today 🚀
        </p>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
      </div>
      <div className="w-full grid grid-cols-1 gap-3 mb-8">
        {features.map((f, i) => (
          <div
            key={f.label}
            className={`flex items-center gap-4 rounded-2xl border p-4 ${f.bg} animate-in fade-in duration-400`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
              {f.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{f.emoji} {f.label}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="w-full space-y-3">
        <Link href="/amy-coach">
          <button className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            ✨ Experience Now
          </button>
        </Link>
        <Link href="/parenting-hub">
          <button className="w-full h-12 rounded-2xl border-2 border-border bg-background text-foreground font-bold text-sm hover:bg-muted/50 hover:border-violet-400/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
            <BookOpenIcon />
            Explore Parenting Hub
          </button>
        </Link>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-6 pb-4">
        Works for ages 0–15 years · Science-backed parenting plans
      </p>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { isPremium, entitlements } = useSubscription();
  const { openPaywall } = usePaywall();

  useEffect(() => {
    authFetch("/api/parent-profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.name) setProfileName(data.name);
      })
      .catch(() => {});
  }, []);

  const displayName = profileName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "";

  const { data: summary, isLoading: loadingSummary, dataUpdatedAt: summaryUpdatedAt } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }
  });

  const { data: routines, isLoading: loadingRoutines } = useGetRecentRoutines({
    query: {
      queryKey: getGetRecentRoutinesQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }
  });

  const { data: allRoutines, dataUpdatedAt: routinesUpdatedAt } = useListRoutines(undefined, {
    query: {
      queryKey: getListRoutinesQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }
  });

  const { data: childrenList } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }
  });

  const { data: stats, isLoading: loadingStats, dataUpdatedAt: statsUpdatedAt } = useGetBehaviorStats({
    query: {
      queryKey: getGetBehaviorStatsQueryKey(),
      refetchInterval: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }
  });

  const lastUpdated = Math.max(summaryUpdatedAt ?? 0, routinesUpdatedAt ?? 0, statsUpdatedAt ?? 0);

  const streak = computeStreak((allRoutines ?? []) as Routine[]);

  const routinesCount = (allRoutines ?? []).length;
  const routinesMax = entitlements?.limits.routinesMax ?? 1;
  const generateRoutineLocked = !isPremium && routinesCount >= routinesMax;

  function handleGenerateRoutine() {
    if (generateRoutineLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation("/routines/generate");
    }
  }

  const noChildren = !loadingSummary && (summary?.totalChildren ?? 0) === 0;
  if (noChildren) {
    return <OnboardingScreen displayName={displayName} />;
  }

  if (loadingSummary) {
    return (
      <div className="flex flex-col gap-5 animate-in fade-in duration-400">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-400 pb-8">

      {/* ── Hero Greeting ───────────────────────────────────────── */}
      <HeroGreeting
        displayName={displayName}
        hasChildren={(childrenList?.length ?? 0) > 0}
        lastUpdated={lastUpdated}
      />

      {/* ── Two-column layout (desktop) / stacked (mobile) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">

        {/* LEFT column: Children + Now/Next */}
        <div className="flex flex-col gap-5">
          <ChildrenStrip children={childrenList ?? []} />
          <div>
            <SectionLabel>Today</SectionLabel>
            <div className="mt-2">
              <NowNextTimeline routines={(allRoutines ?? []) as Routine[]} />
            </div>
          </div>
        </div>

        {/* RIGHT column: Streak + Stats + Amy + Parent Score */}
        <div className="flex flex-col gap-4">
          <SectionLabel>At a glance</SectionLabel>
          <div className="flex flex-col gap-3 -mt-2">
            <StreakCard streak={streak} />
            <StatsGrid summary={summary} loading={loadingSummary} />
          </div>
          <SectionLabel>Coaching</SectionLabel>
          <div className="flex flex-col gap-3 -mt-2">
            <AmySuggestionCard routines={(allRoutines ?? []) as Routine[]} streak={streak} />
            <ParentScoreCard routines={(allRoutines ?? []) as Routine[]} streak={streak} />
          </div>
        </div>
      </div>

      {/* ── Below-fold: Recent Routines + Behavior Highlights ────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Routines */}
        <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-quicksand text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  Recent Routines
                </CardTitle>
                <CardDescription>Latest generated schedules</CardDescription>
              </div>
              <Link href="/routines" className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingRoutines ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : routines && routines.length > 0 ? (
              <div className="divide-y divide-border/50">
                {routines.map((routine) => {
                  const items = routine.items as RoutineItem[];
                  const done = items.filter((i) => i.status === "completed").length;
                  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                  return (
                    <Link key={routine.id} href={`/routines/${routine.id}`} className="block hover:bg-muted/30 transition-colors p-4 group">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">{routine.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="inline-flex items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-400/20">
                              {routine.childName}
                            </span>
                            <span>{new Date(routine.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {items.length > 0 && (
                            <div className="text-right">
                              <div className="text-xs font-bold text-foreground">{pct}%</div>
                              <div className="text-[10px] text-muted-foreground">{done}/{items.length}</div>
                            </div>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground h-full min-h-[200px]">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p>No routines created yet.</p>
                <Link href="/routines/generate" className="mt-4 text-violet-600 dark:text-violet-400 font-medium hover:underline">
                  Create your first routine
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Behavior Highlights */}
        <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-quicksand text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-violet-500" />
                  Behavior Highlights
                </CardTitle>
                <CardDescription>Overall stats by child</CardDescription>
              </div>
              <Link href="/behavior" className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center">
                Log behavior <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingStats ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : stats && stats.length > 0 ? (
              <div className="divide-y divide-border/50">
                {stats.map((stat) => (
                  <div key={stat.childId} className="p-4">
                    <h4 className="font-bold text-foreground mb-3">{stat.childName}</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 flex-1 bg-violet-50 dark:bg-violet-500/10 rounded-lg p-2 border border-violet-100 dark:border-violet-400/15">
                        <div className="bg-violet-100 dark:bg-violet-500/20 p-1 rounded-md text-violet-600 dark:text-violet-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-violet-700 dark:text-violet-300">{stat.positive}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 bg-destructive/10 rounded-lg p-2">
                        <div className="bg-destructive/20 p-1 rounded-md text-destructive">
                          <TrendingDown className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-destructive">{stat.negative}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 bg-muted rounded-lg p-2">
                        <div className="bg-foreground/10 p-1 rounded-md text-foreground/70">
                          <Minus className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-foreground/70">{stat.neutral}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground h-full min-h-[200px]">
                <Star className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p>No behavior logged yet.</p>
                <Link href="/behavior" className="mt-4 text-violet-600 dark:text-violet-400 font-medium hover:underline">
                  Track a behavior
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rewards Card */}
      <RewardsCard streak={streak} />

      {/* ── Gaming Reward ─────────────────────────────────────────── */}
      <Link href="/games">
        <button
          type="button"
          className="w-full text-left rounded-2xl p-4 border border-border hover:border-violet-300 dark:hover:border-violet-400/40 bg-card hover:bg-violet-50/40 dark:hover:bg-violet-500/8 hover:shadow-sm transition-all flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl bg-violet-50 dark:bg-violet-500/15 border border-violet-100 dark:border-violet-400/20">
            🎮
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-quicksand font-bold text-sm leading-tight text-foreground">Gaming Reward</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
              Earn points from routines, unlock mini-games, and redeem real rewards.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </Link>

      {/* ── Primary CTA ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGenerateRoutine}
        data-testid="dashboard-generate-routine-btn"
        className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-base shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Sparkles className="h-5 w-5" />
        Generate Today's Routine
      </button>
    </div>
  );
}
