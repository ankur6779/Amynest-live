import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type {
  NextMilestone,
  PersonalizedWorld,
  StudyAchievement,
  GrowthDashboard,
  FutureReward,
  SuccessProjection,
  ReEngagementCard,
  UniverseMapNode,
  CurriculumUnlockSnapshot,
  FutureWorld,
  StreakCalendarDay,
} from "@workspace/study-zone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackStudyZoneEvent } from "@/lib/study-zone-analytics";

const GLASS = cn(
  "rounded-2xl border border-white/10",
  "bg-gradient-to-br from-indigo-500/[0.12] via-violet-600/[0.08] to-blue-600/[0.10]",
  "backdrop-blur-md shadow-[inset_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(99,102,241,0.12)]",
);

export function useSectionAnalytics(
  childId: number,
  event: Parameters<typeof trackStudyZoneEvent>[0],
  meta?: Record<string, string | number | boolean>,
) {
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !seen.current) {
          seen.current = true;
          trackStudyZoneEvent(event, childId, meta);
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [childId, event, meta]);
  return ref;
}

export function UniverseHeroWithMilestone({
  childId,
  snapshot,
  milestone,
}: {
  childId: number;
  snapshot: CurriculumUnlockSnapshot;
  milestone: NextMilestone;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_milestone_view");

  return (
    <section ref={ref} className={cn(GLASS, "relative overflow-hidden p-5 border-indigo-400/25")} data-testid="learning-universe-hero">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
      <h2 className="font-quicksand font-bold text-lg mb-4 flex items-center gap-2">
        🌍 {t("screens.study.retention.universe_title")}
      </h2>

      <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("screens.study.curriculum.current_stage_label")}</div>
          <div className="font-quicksand font-bold text-lg">{snapshot.currentStageTitle}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("screens.study.retention.progress_unlocked")}</div>
          <div className="font-quicksand font-bold text-lg text-indigo-300">{snapshot.unlockedPercent}%</div>
        </div>
      </div>

      <div className={cn("rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 mb-4")}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-amber-400" />
          <span className="font-quicksand font-bold text-sm">🎯 {t("screens.study.retention.next_milestone")}</span>
        </div>
        <p className="text-sm text-foreground mb-1">{milestone.action}</p>
        <p className="text-xs text-muted-foreground mb-3">
          → {t("screens.study.retention.unlock_preview", { name: milestone.rewardTitle })}
        </p>
        <div className="flex items-center justify-between text-xs mb-1">
          <span>{t("screens.study.retention.milestone_progress", { done: milestone.completed, target: milestone.target })}</span>
          <span className="text-amber-300">{Math.round((milestone.completed / milestone.target) * 100)}%</span>
        </div>
        <Progress value={(milestone.completed / milestone.target) * 100} className="h-2 mb-2" />
        <p className="text-[11px] text-muted-foreground">
          {t("screens.study.retention.milestone_reward")}: {milestone.rewardDescription} · +{milestone.bonusStars} {t("screens.study.retention.bonus_stars")}
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t("screens.study.curriculum.future_waiting_label")}</div>
        <ul className="space-y-0.5 text-foreground/90">
          <li>• {t("screens.study.curriculum.future_lessons_line", { count: snapshot.totalFutureLessons })}</li>
          <li>• {t("screens.study.curriculum.future_topics_line", { count: snapshot.futureTopics })}</li>
          <li>• {t("screens.study.curriculum.future_worlds_line", { count: snapshot.futureWorldsCount })}</li>
        </ul>
      </div>
    </section>
  );
}

export function PersonalizedFutureWorlds({
  childId,
  worlds,
  onPreview,
}: {
  childId: number;
  worlds: PersonalizedWorld[];
  onPreview: (world: FutureWorld) => void;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_personalized_world_view", { count: worlds.length });
  if (worlds.length === 0) return null;

  return (
    <section ref={ref} data-testid="personalized-future-worlds">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="font-quicksand font-semibold text-sm">{t("screens.study.curriculum.worlds_title")}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {worlds.map((world) => (
          <div
            key={world.id}
            className={cn(
              "snap-start shrink-0 w-[230px] rounded-2xl border p-4 flex flex-col",
              "bg-gradient-to-br backdrop-blur-md border-white/10",
              world.gradient,
              world.recommended && "ring-1 ring-violet-400/30",
            )}
          >
            {world.recommended && (
              <span className="text-[9px] uppercase tracking-wider font-bold text-violet-200 mb-2 px-2 py-0.5 rounded-full bg-violet-500/30 self-start">
                {t("screens.study.retention.recommended")}
              </span>
            )}
            <p className="text-[10px] text-muted-foreground mb-1 italic">
              {t("screens.study.retention.because", { reason: world.because })}
            </p>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-2xl">{world.emoji}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
            </div>
            <div className="font-quicksand font-bold text-sm mb-1">{world.shortTitle}</div>
            <p className="text-[10px] text-muted-foreground mb-2">{t("screens.study.curriculum.unlocks_at_age", { age: world.unlockAge })}</p>
            <ul className="space-y-0.5 mb-2 flex-1">
              {world.skillHighlights.slice(0, 3).map((s) => (
                <li key={s.label} className="text-[11px] flex gap-1.5"><span>{s.emoji}</span>{s.label}</li>
              ))}
            </ul>
            <p className="text-[10px] text-indigo-200/90 mb-2">{t("screens.study.curriculum.topics_waiting", { count: world.topicCount })}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg text-xs border border-white/10 bg-white/[0.04]"
              onClick={() => {
                trackStudyZoneEvent("study_zone_future_world_preview", childId, { worldId: world.id, recommended: world.recommended });
                onPreview(world);
              }}
            >
              {t("screens.study.curriculum.preview_curriculum")}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AchievementShelf({
  childId,
  achievements,
}: {
  childId: number;
  achievements: StudyAchievement[];
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_achievement_view");
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="achievement-shelf">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-400" />
        <h3 className="font-quicksand font-bold text-sm">{t("screens.study.retention.achievements_title")}</h3>
      </div>
      {unlocked.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">{t("screens.study.retention.unlocked")}</div>
          <div className="flex flex-wrap gap-2">
            {unlocked.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium">
                <span>{a.emoji}</span> ✓ {a.title}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("screens.study.retention.locked")}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {locked.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 opacity-90">
            <div className="flex items-center gap-2 mb-1">
              <span>{a.emoji}</span>
              <span className="text-sm font-medium">🔒 {a.title}</span>
            </div>
            <Progress value={a.progressPct} className="h-1.5 mb-1" />
            <p className="text-[10px] text-muted-foreground">{a.unlockHint} · {a.progressPct}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LearningStreakPanel({
  childId,
  streak,
  days,
  nextRewardDay,
}: {
  childId: number;
  streak: number;
  days: StreakCalendarDay[];
  nextRewardDay: number | null;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_streak_view", { streak });

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="learning-streak-panel">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-orange-400" />
        <h3 className="font-quicksand font-bold text-sm">{t("screens.study.retention.streak_title")}</h3>
        <span className="ml-auto text-sm font-bold text-orange-300">{t("screens.study.retention.streak_day", { count: streak })}</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {days.map((d) => (
          <div
            key={d.iso}
            className={cn(
              "flex-1 h-10 rounded-lg border flex items-center justify-center text-[10px] font-semibold",
              d.active ? "bg-orange-500/20 border-orange-400/30 text-orange-200" : "bg-white/[0.02] border-white/5 text-muted-foreground",
              d.isToday && "ring-1 ring-orange-400/50",
            )}
            title={d.iso}
          >
            {d.active ? "🔥" : "·"}
          </div>
        ))}
      </div>
      <ul className="text-xs space-y-1 text-muted-foreground">
        <li>Day 7 → {t("screens.study.retention.streak_reward_7")}</li>
        <li>Day 14 → {t("screens.study.retention.streak_reward_14")}</li>
        <li>Day 30 → {t("screens.study.retention.streak_reward_30")}</li>
      </ul>
      {nextRewardDay != null && nextRewardDay > streak && (
        <p className="text-[11px] text-orange-300/90 mt-2">
          {t("screens.study.retention.next_streak_reward", { days: nextRewardDay - streak })}
        </p>
      )}
    </section>
  );
}

export function GrowthDashboardCard({
  childId,
  dashboard,
}: {
  childId: number;
  dashboard: GrowthDashboard;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_growth_dashboard_view");

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="growth-dashboard">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <h3 className="font-quicksand font-bold text-sm">{t("screens.study.retention.growth_title")}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SkillColumn title={t("screens.study.retention.strengths")} items={dashboard.strengths} />
        <SkillColumn title={t("screens.study.retention.growing")} items={dashboard.growing} />
        <SkillColumn title={t("screens.study.retention.future_skills")} items={dashboard.future} />
      </div>
    </section>
  );
}

function SkillColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; emoji: string }[];
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="text-sm flex items-center gap-1.5">
            <span>{item.emoji}</span> {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FutureRewardsPanel({
  childId,
  rewards,
}: {
  childId: number;
  rewards: FutureReward[];
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_future_reward_view");

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="future-rewards">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-4 w-4 text-pink-400" />
        <h3 className="font-quicksand font-bold text-sm">{t("screens.study.retention.rewards_title")}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{t("screens.study.retention.rewards_sub")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rewards.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-xl border border-pink-400/10 bg-pink-500/[0.06] px-3 py-2 text-sm">
            <span className="text-lg">{r.emoji}</span> {r.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SuccessProjectionPanel({
  childId,
  projections,
}: {
  childId: number;
  projections: SuccessProjection[];
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_success_projection_view");

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="success-projection">
      <h3 className="font-quicksand font-bold text-sm mb-1">{t("screens.study.retention.projection_title")}</h3>
      <p className="text-xs text-muted-foreground mb-3">{t("screens.study.retention.projection_sub")}</p>
      <ul className="space-y-2">
        {projections.map((p) => (
          <li key={p.months} className="flex items-start gap-2 text-sm">
            <span className="text-emerald-400 shrink-0">✓</span>
            <span>
              <span className="font-semibold">{t("screens.study.retention.in_months", { count: p.months })}</span>
              {" — "}{p.outcome}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReEngagementBanner({
  childId,
  card,
  onContinue,
}: {
  childId: number;
  card: ReEngagementCard;
  onContinue: (categoryId: string) => void;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_reengagement_view", { daysInactive: card.daysInactive });

  return (
    <section ref={ref} className={cn(GLASS, "p-4 border-rose-400/20")} data-testid="re-engagement-banner">
      <h3 className="font-quicksand font-bold text-base mb-1">{t("screens.study.retention.we_miss_you")}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {t("screens.study.retention.last_activity", { days: card.daysInactive })}
      </p>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{t("screens.study.retention.continue_where")}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {card.lastCategories.map((cat) => (
          <Button
            key={cat.id}
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              trackStudyZoneEvent("study_zone_reengagement_continue", childId, { categoryId: cat.id });
              onContinue(cat.id);
            }}
          >
            <Play className="h-3 w-3 mr-1" /> {cat.emoji} {cat.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-amber-300">{t("screens.study.retention.reward_waiting", { stars: card.starsWaiting })}</p>
    </section>
  );
}

export function UniverseMapPanel({
  childId,
  nodes,
  onNodePreview,
}: {
  childId: number;
  nodes: UniverseMapNode[];
  onNodePreview?: (worldId: string) => void;
}) {
  const { t } = useTranslation();
  const ref = useSectionAnalytics(childId, "study_zone_universe_map_view");

  return (
    <section ref={ref} className={cn(GLASS, "p-4")} data-testid="universe-map">
      <h3 className="font-quicksand font-bold text-sm mb-4">{t("screens.study.retention.universe_map_title")}</h3>
      <div className="relative pl-2 space-y-1">
        {nodes.map((node, i) => (
          <div key={node.id}>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 w-full text-left rounded-xl border px-3 py-2.5 transition mb-1",
                node.status === "current" && "border-indigo-400/40 bg-indigo-500/15 shadow-[0_0_16px_rgba(99,102,241,0.2)]",
                node.status === "completed" && "border-emerald-400/20 bg-emerald-500/10",
                node.status === "locked" && "border-white/5 bg-white/[0.02] opacity-80",
              )}
              onClick={() => {
                if (node.worldId && onNodePreview) {
                  trackStudyZoneEvent("study_zone_universe_map_node", childId, { nodeId: node.id, status: node.status });
                  onNodePreview(node.worldId);
                }
              }}
              disabled={!node.worldId}
            >
              <span className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0",
                node.status === "current" && "border-indigo-400 bg-indigo-500/30",
                node.status === "completed" && "border-emerald-400 bg-emerald-500/20",
                node.status === "locked" && "border-white/20",
              )}>
                {node.status === "completed" ? "✓" : node.status === "locked" ? "🔒" : "●"}
              </span>
              <span className="text-lg">{node.emoji}</span>
              <span className="font-quicksand font-semibold text-sm flex-1">{node.label}</span>
              {node.status === "current" && (
                <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold">{t("screens.study.retention.you_are_here")}</span>
              )}
            </button>
            {i < nodes.length - 1 && (
              <div className="flex justify-center py-0.5 text-muted-foreground/40 text-sm" aria-hidden>↓</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
