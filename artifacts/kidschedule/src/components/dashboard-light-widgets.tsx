import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Gamepad2,
  Medal,
  Ribbon,
  Star,
} from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { AmyFamilyMemoryCard } from "@/components/intelligence/amy-family-memory-card";
import {
  BehaviorHighlightsSection,
  DashboardWeeklyInsightsCard,
  RecentRoutinesCollapsible,
} from "@/components/dashboard-phase2-widgets";
import { routineDateKey, routineItems } from "@/lib/routines";
import { getRewards, getTotalPoints } from "@/lib/rewards";

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
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

type AmyTip = {
  emoji: string;
  text: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
};

function buildAmyTips(
  routines: Routine[],
  streak: number,
  onGenerate: () => void,
  suppressGenerate: boolean,
  generatePrimarySource: "journey" | "timeline" | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): AmyTip[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => routineDateKey(r) === todayStr);
  const allItems = todayRoutines.flatMap((r) => routineItems<RoutineItem>(r));
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();
  const suggestions: AmyTip[] = [];

  if (total === 0 && !suppressGenerate) {
    suggestions.push({
      emoji: "📅",
      text: "No routine for today yet. Generate one to get started!",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (total === 0 && suppressGenerate && generatePrimarySource) {
    suggestions.push({
      emoji: "📅",
      text: t(
        generatePrimarySource === "journey"
          ? "dashboard.amy_no_routine_journey_hint"
          : "dashboard.amy_no_routine_timeline_hint",
      ),
    });
  } else if (pct < 30 && hour >= 14) {
    suggestions.push({
      emoji: "⚡",
      text: "Your child seems behind today — try shorter, easier tasks to build momentum.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (pct >= 80) {
    suggestions.push({
      emoji: "🌟",
      text: "Amazing progress today! Consider a small reward to celebrate.",
      actionLabel: t("dashboard.amy_view_rewards"),
      href: "/rewards",
    });
  }
  if (hour >= 15 && hour <= 17) {
    suggestions.push({
      emoji: "❤️",
      text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way.",
      actionLabel: t("dashboard.amy_open_hub"),
      href: "/parenting-hub",
    });
  }
  if (streak >= 3) {
    suggestions.push({
      emoji: "🔥",
      text: `You're on a ${streak}-day streak! Consistency builds habits.`,
      actionLabel: t("dashboard.amy_view_progress"),
      href: "/progress",
    });
  } else if (streak === 0 && hour < 10 && !suppressGenerate) {
    suggestions.push({
      emoji: "☀️",
      text: "Fresh start today! Generate a routine to set a positive tone for the day.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  }
  if (hour >= 19) {
    suggestions.push({
      emoji: "🌙",
      text: "Wind-down time! End screen time 30 min before sleep for better rest.",
      actionLabel: t("dashboard.amy_open_hub"),
      href: "/parenting-hub",
    });
  }
  return suggestions.slice(0, 1);
}

/** Amy suggestion + family memory in one lightweight card. */
export function DashboardCoachingCard({
  routines,
  streak,
  onGenerate,
  suppressGenerate,
  generatePrimarySource,
}: {
  routines: Routine[];
  streak: number;
  onGenerate: () => void;
  suppressGenerate?: boolean;
  generatePrimarySource?: "journey" | "timeline";
}) {
  const { t } = useTranslation();
  const tips = buildAmyTips(
    routines,
    streak,
    onGenerate,
    !!suppressGenerate,
    generatePrimarySource,
    t,
  );
  const tip = tips[0];

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/20">
          <AmyIcon size={16} bounce />
          <span className="font-quicksand font-bold text-sm text-foreground">
            {t("pages.dashboard.amy_ai_suggests")}
          </span>
        </div>
        <div className="p-3">
          {tip ? (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-base shrink-0">{tip.emoji}</span>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="leading-snug text-foreground/90">{tip.text}</p>
                {tip.actionLabel && tip.href ? (
                  <Link
                    href={tip.href}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    {tip.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
                {tip.actionLabel && tip.onAction ? (
                  <button
                    type="button"
                    onClick={tip.onAction}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    {tip.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("pages.dashboard.all_looking_good_today")}</p>
          )}
        </div>
      </div>
      <AmyFamilyMemoryCard routines={routines} variant="dashboard" />
    </div>
  );
}

/** Inline streak + today progress — replaces heavy snapshot card header area. */
export function DashboardCompactStatsRow({
  streak,
  routines,
  summary,
  todayDone,
  todayTotal,
}: {
  streak: number;
  routines: Routine[];
  summary: {
    positiveBehaviorsToday?: number;
    routinesGeneratedThisWeek?: number;
  } | null | undefined;
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
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : null;

  return (
    <Link
      href="/progress"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <Flame className={`h-4 w-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
        <span className="font-black text-lg text-foreground leading-none">{streak}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t("dashboard.day_streak")}</span>
      </div>
      <div className="flex gap-0.5 shrink-0">
        {last7Keys.map((key) => (
          <span
            key={key}
            className={`h-1.5 w-1.5 rounded-full ${dateSet.has(key) ? "bg-orange-500" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      {todayPct != null ? (
        <div className="text-xs shrink-0">
          <span className="text-muted-foreground">{t("dashboard.snapshot_today")} </span>
          <span className="font-bold text-primary">{todayPct}%</span>
        </div>
      ) : null}
      {(summary?.positiveBehaviorsToday ?? 0) > 0 ? (
        <>
          <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
          <div className="text-xs shrink-0 hidden sm:block">
            <span className="text-muted-foreground">{t("dashboard.stat_great_today")} </span>
            <span className="font-bold text-foreground">{summary?.positiveBehaviorsToday}</span>
          </div>
        </>
      ) : null}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
    </Link>
  );
}

function ParentScoreCompact({ routines, streak }: { routines: Routine[]; streak: number }) {
  const { t } = useTranslation();
  const last7 = routines.slice(0, 7);
  const totalItems = last7.flatMap((r) => routineItems(r)).length;
  const completedItems = last7.flatMap((r) => routineItems(r)).filter((i) => (i as RoutineItem).status === "completed").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

  return (
    <Link
      href="/progress"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <Ribbon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{t("dashboard.parent_score")}</p>
        <p className="text-xs text-muted-foreground">
          {grade} · {score}/100 · {completionRate}% {t("pages.dashboard.completion").toLowerCase()}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function RewardsGamingRow({
  gamingLocked,
  onGamingOpen,
  gamingLabel,
  gamingSub,
}: {
  gamingLocked: boolean;
  onGamingOpen: () => void;
  gamingLabel: string;
  gamingSub: string;
}) {
  const { t } = useTranslation();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<ReturnType<typeof getRewards>>([]);

  useEffect(() => {
    setPoints(getTotalPoints());
    setRewards(getRewards());
  }, []);

  const nextReward = useMemo(() => {
    const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
    return sorted.find((r) => r.cost > points) ?? sorted[sorted.length - 1];
  }, [rewards, points]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Link
        href="/rewards"
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <Medal className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{t("dashboard.rewards_points")}</p>
          <p className="text-xs text-muted-foreground truncate">
            {points} {t("pages.dashboard.pts")}
            {nextReward ? ` · ${nextReward.emoji} ${nextReward.label}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-black text-sm">{points}</span>
        </div>
      </Link>
      {gamingLocked ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 opacity-70">
          <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{gamingLabel}</p>
        </div>
      ) : (
        <Link
          href="/games"
          onClick={onGamingOpen}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <span className="text-lg shrink-0">🎮</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{gamingLabel}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{gamingSub}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Link>
      )}
    </div>
  );
}

/** Collapsed-by-default: score, weekly insights, behavior, recent, rewards. */
export function DashboardMoreInsightsSection({
  allRoutines,
  streak,
  selectedChildId,
  filteredBehaviorStats,
  loadingStats,
  filteredRecentRoutines,
  loadingRoutines,
  selectedChildName,
  gamingLocked,
  onGamingOpen,
  gamingLabel,
  gamingSub,
}: {
  allRoutines: Routine[];
  streak: number;
  selectedChildId: number | null;
  filteredBehaviorStats: Array<{ childId: number; childName: string; positive: number; negative: number; neutral: number }>;
  loadingStats: boolean;
  filteredRecentRoutines: Routine[];
  loadingRoutines: boolean;
  selectedChildName?: string | null;
  gamingLocked: boolean;
  onGamingOpen: () => void;
  gamingLabel: string;
  gamingSub: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-quicksand font-bold text-sm text-foreground">
            {t("dashboard.more_insights")}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open ? (
        <div className="px-3 pb-4 pt-1 space-y-3 border-t border-border animate-in fade-in duration-200">
          <ParentScoreCompact routines={allRoutines} streak={streak} />
          <DashboardWeeklyInsightsCard selectedChildId={selectedChildId} />
          <BehaviorHighlightsSection
            stats={filteredBehaviorStats}
            loading={loadingStats}
            selectedChildName={selectedChildName}
          />
          <RecentRoutinesCollapsible routines={filteredRecentRoutines} loading={loadingRoutines} />
          <RewardsGamingRow
            gamingLocked={gamingLocked}
            onGamingOpen={onGamingOpen}
            gamingLabel={gamingLabel}
            gamingSub={gamingSub}
          />
        </div>
      ) : null}
    </div>
  );
}
