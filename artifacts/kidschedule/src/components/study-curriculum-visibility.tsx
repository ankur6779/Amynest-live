import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Lock,
  Map,
} from "lucide-react";
import {
  JOURNEY_STAGES,
  CURRICULUM_STATS,
  CURRICULUM_EXPLORER,
  WHY_STAY_WITH_AMYNEST,
  FUTURE_WORLDS,
  computeCurriculumUnlockSnapshot,
  buildLearningTimeline,
  futureStagePreviewsForChild,
  journeyStageMessage,
  stageStatus,
  computeNextMilestone,
  personalizedFutureWorlds,
  buildAchievementCollection,
  buildStreakCalendar,
  buildGrowthDashboard,
  buildFutureRewards,
  buildSuccessProjection,
  buildReEngagementCard,
  buildUniverseMap,
  type JourneyStageId,
  type FutureWorld,
} from "@workspace/study-zone";
import type { StudyMode } from "@workspace/study-zone";
import type { DailyUnlockItem } from "@workspace/learning-progress-engine";
import type { StudyProgress } from "@/lib/study-progress";
import {
  UniverseHeroWithMilestone,
  PersonalizedFutureWorlds,
  AchievementShelf,
  LearningStreakPanel,
  GrowthDashboardCard,
  FutureRewardsPanel,
  SuccessProjectionPanel,
  ReEngagementBanner,
  UniverseMapPanel,
} from "@/components/study-retention-phase3";
import {
  trackStudyZoneEvent,
  trackStudyZoneSessionStart,
  trackStudyZoneSessionEnd,
  trackStudyZoneScrollDepth,
  resetStudyZoneScrollTracking,
} from "@/lib/study-zone-analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const GLASS_PANEL = cn(
  "rounded-2xl border border-white/10",
  "bg-gradient-to-br from-indigo-500/[0.12] via-violet-600/[0.08] to-blue-600/[0.10]",
  "backdrop-blur-md shadow-[inset_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(99,102,241,0.12)]",
);

const STAT_CARD = cn(
  "rounded-xl border border-white/10 p-3",
  "bg-white/[0.04] backdrop-blur-sm",
  "shadow-[0_0_20px_rgba(129,140,248,0.08)]",
);

interface StudyCurriculumVisibilityProps {
  childId: number;
  childAge: number;
  childClass?: string | null;
  mode: StudyMode;
  childName?: string;
  progress: StudyProgress | null;
  todayUnlockTitles?: string[];
  nextSessionUnlocks?: DailyUnlockItem[];
  onNextSessionVisible?: () => void;
  onContinuePlay?: (categoryId: string) => void;
  className?: string;
}

export function StudyCurriculumVisibility({
  childId,
  childAge,
  childClass,
  mode,
  childName,
  progress,
  todayUnlockTitles = [],
  nextSessionUnlocks = [],
  onNextSessionVisible,
  onContinuePlay,
  className,
}: StudyCurriculumVisibilityProps) {
  const { t } = useTranslation();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [previewWorld, setPreviewWorld] = useState<FutureWorld | null>(null);
  const nextSessionSeen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackStudyZoneSessionStart(childId, mode);
    resetStudyZoneScrollTracking(childId);
    return () => trackStudyZoneSessionEnd(childId, mode);
  }, [childId, mode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const visible = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
      const depth = Math.max(0, Math.min(100, Math.round((visible / rect.height) * 100)));
      trackStudyZoneScrollDepth(childId, depth);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [childId]);

  useEffect(() => {
    if (nextSessionUnlocks.length === 0 || nextSessionSeen.current) return;
    nextSessionSeen.current = true;
    onNextSessionVisible?.();
  }, [nextSessionUnlocks.length, onNextSessionVisible]);

  const retentionInput = useMemo(
    () => progress ?? { play: {}, basic: {}, advanced: {}, engagement: { xp: 0, streak: 0, bestStreak: 0, lastActiveDate: null, goalDate: null, goalProgress: 0, badges: [] } },
    [progress],
  );

  const snapshot = useMemo(
    () => computeCurriculumUnlockSnapshot(childAge, childClass),
    [childAge, childClass],
  );
  const milestone = useMemo(
    () => computeNextMilestone(retentionInput, childAge, childClass),
    [retentionInput, childAge, childClass],
  );
  const worlds = useMemo(
    () => personalizedFutureWorlds(retentionInput, childAge, childClass),
    [retentionInput, childAge, childClass],
  );
  const achievements = useMemo(
    () => buildAchievementCollection(retentionInput, mode),
    [retentionInput, mode],
  );
  const streakData = useMemo(
    () => buildStreakCalendar(retentionInput.engagement),
    [retentionInput.engagement],
  );
  const growth = useMemo(
    () => buildGrowthDashboard(retentionInput, mode),
    [retentionInput, mode],
  );
  const rewards = useMemo(
    () => buildFutureRewards(snapshot, milestone),
    [snapshot, milestone],
  );
  const projections = useMemo(
    () => buildSuccessProjection(childAge, mode),
    [childAge, mode],
  );
  const reEngagement = useMemo(
    () => buildReEngagementCard(retentionInput),
    [retentionInput],
  );
  const universeMap = useMemo(
    () => buildUniverseMap(mode, childAge, childClass),
    [mode, childAge, childClass],
  );
  const timeline = useMemo(
    () => buildLearningTimeline(
      childAge,
      childClass,
      todayUnlockTitles.length > 0
        ? todayUnlockTitles
        : nextSessionUnlocks.map((u) => u.title),
    ),
    [childAge, childClass, todayUnlockTitles, nextSessionUnlocks],
  );
  const stagePreviews = useMemo(
    () => futureStagePreviewsForChild(childAge, childClass),
    [childAge, childClass],
  );

  const openWorldPreview = (worldOrId: FutureWorld | string) => {
    const world = typeof worldOrId === "string"
      ? FUTURE_WORLDS.find((w) => w.id === worldOrId)
      : worldOrId;
    if (!world) return;
    trackStudyZoneEvent("study_zone_world_preview_open", childId, { worldId: world.id });
    setPreviewWorld(world);
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col gap-4 mt-2 pt-4 border-t border-white/5", className)}
      data-testid="study-curriculum-visibility"
    >
      {reEngagement && onContinuePlay && (
        <ReEngagementBanner
          childId={childId}
          card={reEngagement}
          onContinue={onContinuePlay}
        />
      )}
      <UniverseHeroWithMilestone childId={childId} snapshot={snapshot} milestone={milestone} />
      <LearningJourneyRoadmap mode={mode} snapshot={snapshot} />
      <PersonalizedFutureWorlds childId={childId} worlds={worlds} onPreview={openWorldPreview} />
      <ChildLearningTimeline milestones={timeline} childName={childName} />
      <AchievementShelf childId={childId} achievements={achievements} />
      <LearningStreakPanel
        childId={childId}
        streak={streakData.streak}
        days={streakData.days}
        nextRewardDay={streakData.nextRewardDay}
      />
      <GrowthDashboardCard childId={childId} dashboard={growth} />
      <FutureRewardsPanel childId={childId} rewards={rewards} />
      <SuccessProjectionPanel childId={childId} projections={projections} />
      <UniverseMapPanel childId={childId} nodes={universeMap} onNodePreview={openWorldPreview} />
      {stagePreviews.length > 0 && <FutureStagePreviews previews={stagePreviews} />}
      <LessonBreakdown snapshot={snapshot} />
      <CurriculumScaleStats />
      <WhyStayCard />
      <Button
        variant="outline"
        className={cn(
          "w-full rounded-2xl h-12 border-indigo-400/30",
          "bg-gradient-to-r from-indigo-500/10 to-violet-500/10",
          "hover:from-indigo-500/20 hover:to-violet-500/20",
          "shadow-[0_0_24px_rgba(99,102,241,0.15)]",
        )}
        onClick={() => {
          trackStudyZoneEvent("study_zone_curriculum_explorer_open", childId);
          setExplorerOpen(true);
        }}
        data-testid="explore-full-curriculum"
      >
        <BookOpen className="h-4 w-4 mr-2 text-indigo-400" />
        {t("screens.study.curriculum.explore_cta")}
        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
      </Button>
      <CurriculumExplorerSheet open={explorerOpen} onOpenChange={setExplorerOpen} />
      <WorldPreviewSheet world={previewWorld} onClose={() => setPreviewWorld(null)} />
    </div>
  );
}

function LearningJourneyRoadmap({
  mode,
  snapshot,
}: {
  mode: StudyMode;
  snapshot: ReturnType<typeof computeCurriculumUnlockSnapshot>;
}) {
  const { t } = useTranslation();

  return (
    <section className={cn(GLASS_PANEL, "p-4 overflow-hidden relative")} data-testid="learning-journey-roadmap">
      <div className="flex items-center gap-2 mb-1">
        <Map className="h-4 w-4 text-indigo-400" />
        <h2 className="font-quicksand font-bold text-base text-foreground">
          {t("screens.study.curriculum.journey_title")}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {journeyStageMessage(snapshot.currentStageIndex, snapshot.stagesAhead)}
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {JOURNEY_STAGES.map((stage, i) => {
          const status = stageStatus(stage.id, mode);
          const isCurrent = status === "current";
          const isLocked = status === "locked";
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "snap-start shrink-0 w-[140px] rounded-xl border p-3 flex flex-col gap-1.5",
                isCurrent
                  ? "border-indigo-400/50 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                  : isLocked
                    ? "border-white/5 bg-white/[0.02] opacity-80"
                    : "border-emerald-400/20 bg-emerald-500/10",
              )}
            >
              <div className="text-[10px] font-semibold text-muted-foreground">
                {t("screens.study.curriculum.age_band", { range: stage.ageLabel })}
              </div>
              <div className="text-xl">{stage.emoji}</div>
              <div className="font-quicksand font-bold text-sm text-foreground leading-tight">
                {stage.title}
              </div>
              <div className="text-[10px] text-muted-foreground leading-snug">
                {isCurrent && "✓ "}
                {isLocked && "🔒 "}
                {status === "past" && "✓ "}
                {stage.subtitle}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-700"
          style={{
            width: `${Math.max(12, ((snapshot.currentStageIndex + 1) / JOURNEY_STAGES.length) * 100)}%`,
          }}
        />
      </div>
    </section>
  );
}

function ChildLearningTimeline({
  milestones,
  childName,
}: {
  milestones: ReturnType<typeof buildLearningTimeline>;
  childName?: string;
}) {
  const { t } = useTranslation();

  return (
    <section className={cn(GLASS_PANEL, "p-4")} data-testid="child-learning-timeline">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="h-4 w-4 text-amber-400" />
        <h3 className="font-quicksand font-bold text-sm text-foreground">
          {childName
            ? t("screens.study.curriculum.timeline_title_named", { name: childName })
            : t("screens.study.curriculum.timeline_title")}
        </h3>
      </div>
      <div className="relative pl-4 mt-4 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-indigo-500/50 before:via-violet-400/30 before:to-transparent">
        {milestones.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative"
          >
            <div className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-indigo-400 bg-background" />
            <div className="text-[10px] uppercase tracking-wider font-semibold text-indigo-300 mb-1.5">
              {m.horizon}
            </div>
            <ul className="space-y-1">
              {m.items.map((item) => (
                <li
                  key={item.label}
                  className={cn(
                    "text-sm flex items-center gap-1.5",
                    item.locked ? "text-muted-foreground" : "text-foreground font-medium",
                  )}
                >
                  <span className="text-xs">{item.emoji ?? (item.locked ? "🔒" : "✓")}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FutureStagePreviews({
  previews,
}: {
  previews: ReturnType<typeof futureStagePreviewsForChild>;
}) {
  const { t } = useTranslation();

  return (
    <section data-testid="future-stage-previews">
      <h3 className="font-quicksand font-semibold text-sm text-foreground mb-3 px-0.5">
        {t("screens.study.curriculum.stage_preview_title")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {previews.map((band) => (
          <div key={band.ageLabel} className={cn(GLASS_PANEL, "p-4")}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-quicksand font-bold text-sm">{t("screens.study.curriculum.age_band", { range: band.ageLabel })}</span>
              <StageChip stageId={band.stageId} />
              <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {band.groups.map((group) => (
              <div key={group.subject} className="mb-2 last:mb-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300 mb-1">
                  {group.subject}
                </div>
                <ul className="space-y-0.5">
                  {group.topics.map((topic) => (
                    <li key={topic} className="text-xs text-foreground/80 flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function LessonBreakdown({
  snapshot,
}: {
  snapshot: ReturnType<typeof computeCurriculumUnlockSnapshot>;
}) {
  const { t } = useTranslation();

  return (
    <section className={cn(GLASS_PANEL, "p-4")} data-testid="lesson-breakdown">
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 mb-1">
          {t("screens.study.curriculum.current_stage_lessons")}
        </div>
        <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <span>✓</span>
          {t("screens.study.curriculum.lessons_unlocked", { count: snapshot.availableNow })}
        </div>
      </div>

      {snapshot.futureLessonBreakdown.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            {t("screens.study.curriculum.future_stages_lessons")}
          </div>
          <ul className="space-y-1.5 mb-3">
            {snapshot.futureLessonBreakdown.map((row) => (
              <li key={row.id} className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span>🔒</span>
                <span>{row.count}</span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-indigo-400/15 bg-indigo-500/[0.06] px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("screens.study.curriculum.total_future_label")}: </span>
            <span className="font-semibold text-foreground">
              {t("screens.study.curriculum.total_future_lessons", { count: snapshot.totalFutureLessons })}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function CurriculumScaleStats() {
  const { t } = useTranslation();

  return (
    <section data-testid="curriculum-scale-stats">
      <h3 className="font-quicksand font-semibold text-sm text-foreground mb-2 px-0.5">
        {t("screens.study.curriculum.scale_title")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CURRICULUM_STATS.map((stat) => (
          <div key={stat.id} className={STAT_CARD}>
            <div className="text-lg mb-0.5">{stat.emoji}</div>
            <div className="font-quicksand font-bold text-lg text-foreground leading-none">
              {stat.value}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t(`screens.study.curriculum.stat_${stat.id}`, { defaultValue: stat.label })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyStayCard() {
  const { t } = useTranslation();

  return (
    <section className={cn(GLASS_PANEL, "p-4")} data-testid="why-stay-card">
      <h3 className="font-quicksand font-bold text-sm text-foreground mb-3">
        {t("screens.study.curriculum.why_stay_title")}
      </h3>
      <ul className="space-y-2">
        {WHY_STAY_WITH_AMYNEST.map((item) => (
          <li key={item.id} className="text-sm text-foreground/90 flex items-center gap-2">
            <span className="text-emerald-400">{item.emoji}</span>
            {t(`screens.study.curriculum.why_stay_${item.id}`, { defaultValue: item.label })}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WorldPreviewSheet({
  world,
  onClose,
}: {
  world: FutureWorld | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={world != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-3xl border-t border-indigo-400/20 bg-gradient-to-b from-background via-indigo-950/15 to-background"
      >
        {world && (
          <>
            <SheetHeader className="text-left pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{world.emoji}</span>
                <div>
                  <SheetTitle className="font-quicksand text-lg">{world.title}</SheetTitle>
                  <SheetDescription>
                    {t("screens.study.curriculum.unlocks_at_age", { age: world.unlockAge })}
                    {" · "}
                    {t("screens.study.curriculum.topics_waiting", { count: world.topicCount })}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[calc(70vh-140px)] pt-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-2">
                  {t("screens.study.curriculum.future_skills_label")}
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {world.skillHighlights.map((s) => (
                    <li key={s.label} className="text-sm rounded-lg px-3 py-2 bg-white/[0.04] border border-white/5 flex items-center gap-2">
                      <span>{s.emoji}</span>
                      {s.label}
                    </li>
                  ))}
                </ul>
              </div>
              {world.previewTopics.map((group) => (
                <div key={group.subject}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-1.5">
                    {group.subject}
                  </h4>
                  <ul className="space-y-1">
                    {group.topics.map((topic) => (
                      <li key={topic} className="text-sm text-foreground/90 flex items-center gap-2 rounded-lg px-2 py-1 bg-white/[0.03]">
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CurriculumExplorerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[85vh] rounded-t-3xl border-t border-indigo-400/20",
          "bg-gradient-to-b from-background via-indigo-950/20 to-background",
        )}
      >
        <SheetHeader className="text-left pb-4 border-b border-white/5">
          <SheetTitle className="font-quicksand text-xl">
            {t("screens.study.curriculum.explorer_title")}
          </SheetTitle>
          <SheetDescription>
            {t("screens.study.curriculum.explorer_desc")}
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] pt-4 space-y-6">
          {CURRICULUM_EXPLORER.map((band) => (
            <div key={band.ageLabel}>
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                <span className="font-quicksand font-bold text-base text-foreground">
                  {t("screens.study.curriculum.age_band", { range: band.ageLabel })}
                </span>
                <StageChip stageId={band.stageId} />
              </div>
              <div className="space-y-4 pl-1">
                {band.groups.map((group) => (
                  <div key={`${band.ageLabel}-${group.subject}`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-1.5">
                      {group.subject}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group.topics.map((topic) => (
                        <li
                          key={topic}
                          className="text-sm text-foreground/90 flex items-center gap-2 rounded-lg px-2 py-1 bg-white/[0.03]"
                        >
                          <span className="text-indigo-400 text-xs">•</span>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StageChip({ stageId }: { stageId: JourneyStageId }) {
  const { t } = useTranslation();
  const labels: Record<JourneyStageId, string> = {
    play: t("screens.study.curriculum.stage_play"),
    basic: t("screens.study.curriculum.stage_basic"),
    advanced: t("screens.study.curriculum.stage_advanced"),
  };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
      {labels[stageId]}
    </span>
  );
}
