import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Lock,
  Map,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  JOURNEY_STAGES,
  CURRICULUM_STATS,
  CURRICULUM_EXPLORER,
  FUTURE_WORLDS,
  computeCurriculumUnlockSnapshot,
  futureWorldsForChild,
  buildWhatComesNextItems,
  journeyStageMessage,
  stageStatus,
  type JourneyStageId,
} from "@workspace/study-zone";
import type { StudyMode } from "@workspace/study-zone";
import type { DailyUnlockItem } from "@workspace/learning-progress-engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  childAge: number;
  childClass?: string | null;
  mode: StudyMode;
  childName?: string;
  nextSessionUnlocks?: DailyUnlockItem[];
  onNextSessionVisible?: () => void;
  className?: string;
}

export function StudyCurriculumVisibility({
  childAge,
  childClass,
  mode,
  childName,
  nextSessionUnlocks = [],
  onNextSessionVisible,
  className,
}: StudyCurriculumVisibilityProps) {
  const { t } = useTranslation();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const nextSessionSeen = useRef(false);

  useEffect(() => {
    if (nextSessionUnlocks.length === 0 || nextSessionSeen.current) return;
    nextSessionSeen.current = true;
    onNextSessionVisible?.();
  }, [nextSessionUnlocks.length, onNextSessionVisible]);

  const snapshot = useMemo(
    () => computeCurriculumUnlockSnapshot(childAge, childClass),
    [childAge, childClass],
  );
  const worlds = useMemo(
    () => futureWorldsForChild(childAge, childClass),
    [childAge, childClass],
  );
  const nextItems = useMemo(
    () => buildWhatComesNextItems(
      childAge,
      childClass,
      nextSessionUnlocks.map((u) => u.title),
    ),
    [childAge, childClass, nextSessionUnlocks],
  );

  return (
    <div className={cn("flex flex-col gap-4 mb-4", className)} data-testid="study-curriculum-visibility">
      <LearningJourneyRoadmap mode={mode} snapshot={snapshot} />
      <ContentUnlockBanner snapshot={snapshot} />
      <CurriculumScaleStats />
      <FutureLearningWorlds worlds={worlds} />
      <WhatComesNextSection items={nextItems} childName={childName} />
      <Button
        variant="outline"
        className={cn(
          "w-full rounded-2xl h-12 border-indigo-400/30",
          "bg-gradient-to-r from-indigo-500/10 to-violet-500/10",
          "hover:from-indigo-500/20 hover:to-violet-500/20",
          "shadow-[0_0_24px_rgba(99,102,241,0.15)]",
        )}
        onClick={() => setExplorerOpen(true)}
        data-testid="explore-full-curriculum"
      >
        <BookOpen className="h-4 w-4 mr-2 text-indigo-400" />
        {t("screens.study.curriculum.explore_cta")}
        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
      </Button>
      <CurriculumExplorerSheet open={explorerOpen} onOpenChange={setExplorerOpen} />
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
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 mb-1">
        <Map className="h-4 w-4 text-indigo-400" />
        <h2 className="font-quicksand font-bold text-base text-foreground">
          {t("screens.study.curriculum.journey_title")}
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
          {t("screens.study.curriculum.journey_badge")}
        </span>
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

      {/* Connector line */}
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

function ContentUnlockBanner({
  snapshot,
}: {
  snapshot: ReturnType<typeof computeCurriculumUnlockSnapshot>;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        GLASS_PANEL,
        "px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3",
      )}
      data-testid="content-unlock-banner"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            {t("screens.study.curriculum.available_now", { count: snapshot.availableNow })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("screens.study.curriculum.future_waiting", { count: snapshot.futureWaiting })}
        </p>
      </div>
      <div className="sm:w-40 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>{t("screens.study.curriculum.universe_label")}</span>
          <span className="font-semibold text-indigo-300">{snapshot.unlockedPercent}%</span>
        </div>
        <Progress value={snapshot.unlockedPercent} className="h-2" />
      </div>
    </div>
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

function FutureLearningWorlds({
  worlds,
}: {
  worlds: typeof FUTURE_WORLDS;
}) {
  const { t } = useTranslation();
  if (worlds.length === 0) return null;

  return (
    <section data-testid="future-learning-worlds">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="font-quicksand font-semibold text-sm text-foreground">
          {t("screens.study.curriculum.worlds_title")}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {worlds.map((world) => (
          <div
            key={world.id}
            className={cn(
              "snap-start shrink-0 w-[200px] rounded-2xl border border-white/10 p-4",
              "bg-gradient-to-br backdrop-blur-md",
              world.gradient,
              "shadow-[inset_0_1px_rgba(255,255,255,0.06)]",
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-2xl">{world.emoji}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
            </div>
            <div className="font-quicksand font-bold text-sm text-foreground leading-tight mb-1">
              {world.title}
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              {t("screens.study.curriculum.unlocks_around", { age: world.unlockAge })}
            </p>
            <ul className="space-y-0.5">
              {world.previewSkills.slice(0, 3).map((skill) => (
                <li key={skill} className="text-[10px] text-foreground/80 flex items-center gap-1">
                  <span className="text-indigo-400">·</span>
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatComesNextSection({
  items,
  childName,
}: {
  items: ReturnType<typeof buildWhatComesNextItems>;
  childName?: string;
}) {
  const { t } = useTranslation();
  const horizonLabel: Record<string, string> = {
    next_week: t("screens.study.curriculum.horizon_next_week"),
    next_month: t("screens.study.curriculum.horizon_next_month"),
    future_stage: t("screens.study.curriculum.horizon_future"),
  };

  return (
    <section className={cn(GLASS_PANEL, "p-4")} data-testid="what-comes-next">
      <h3 className="font-quicksand font-bold text-sm text-foreground mb-1">
        {t("screens.study.curriculum.what_next_title")}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        {childName
          ? t("screens.study.curriculum.what_next_sub", { name: childName })
          : t("screens.study.curriculum.what_next_sub_generic")}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5",
              item.locked
                ? "border-white/5 bg-white/[0.02] opacity-75"
                : "border-indigo-400/15 bg-indigo-500/[0.06]",
            )}
          >
            <span className="text-lg shrink-0" aria-hidden>{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {horizonLabel[item.horizon]}
              </div>
              <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
            </div>
            {item.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </li>
        ))}
      </ul>
    </section>
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
