import { ChevronRight, Flame, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HubJourneyAccess, ChildProgressSnapshot, PathStep } from "@workspace/parent-hub-journey";
import type { LearningProgressProfile, RewardWallet } from "@workspace/learning-progress-engine";
import { cn } from "@/lib/utils";
import {
  getHubPanelAccent,
  hubAccentBarClasses,
  hubSectionCardClasses,
  HUB_XP_GOLD,
} from "@/lib/parent-hub-premium";
import { MasteryRing } from "@/components/learning-progress/mastery-ring";
import { ProgressionBar } from "@/components/learning-progress/progression-bar";
import { calendarCountdownMessage, hubJourneyMessageKey } from "@/lib/hub-journey-ux";
import { Button } from "@/components/ui/button";

export interface HubJourneyPulseProps {
  childName: string;
  bandLabel?: string;
  isInfant?: boolean;
  isPremium: boolean;
  access?: HubJourneyAccess;
  journeyProgress?: ChildProgressSnapshot;
  pathSteps?: PathStep[];
  pathCompleted?: boolean;
  isJourneyLocked?: boolean;
  learningProfile?: LearningProgressProfile | null;
  wallet?: RewardWallet | null;
  onOpenLearning?: () => void;
}

function JourneyDots({
  access,
}: {
  access: HubJourneyAccess;
}) {
  const dots = Array.from({ length: access.daysTotal }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1.5 shrink-0" aria-label={`Day ${Math.min(access.daysCompleted + 1, access.daysTotal)} of ${access.daysTotal}`}>
      {dots.map((d) => (
        <span
          key={d}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            d <= access.daysCompleted
              ? "bg-primary shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              : d === access.daysCompleted + 1 && !access.isLocked
                ? "bg-primary/40 ring-2 ring-primary/30"
                : "bg-white/15",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function HubJourneyPulse({
  childName,
  bandLabel,
  isInfant = false,
  isPremium,
  access,
  journeyProgress,
  pathSteps = [],
  pathCompleted = false,
  isJourneyLocked = false,
  learningProfile,
  wallet,
  onOpenLearning,
}: HubJourneyPulseProps) {
  const { t } = useTranslation();
  const jk = (base: string) => hubJourneyMessageKey(base, isInfant);
  const theme = getHubPanelAccent("today-summary");

  const masteryScore = learningProfile?.masteryScore ?? 0;
  const learningLevel = learningProfile?.learningLevel ?? wallet?.level;
  const totalXP = learningProfile?.totalXP ?? wallet?.xp ?? 0;
  const coins = wallet?.coins ?? 0;
  const rhythmDays = Math.max(
    learningProfile?.streakDays ?? 0,
    wallet?.streakDays ?? 0,
    journeyProgress?.lifeSkillsStreak ?? 0,
  );
  const journeyStreak = journeyProgress?.lifeSkillsStreak ?? 0;

  const nextStep = pathSteps[0];
  const showPathPreview = !pathCompleted && !isJourneyLocked && nextStep;
  const countdown =
    access && !access.isLocked && !isPremium
      ? calendarCountdownMessage(access.calendarDaysLeft, t)
      : null;

  return (
    <div
      data-testid="hub-journey-pulse"
      className={cn(hubSectionCardClasses(theme), "hub-page-enter")}
    >
      <div className="flex min-w-0">
        <div className={hubAccentBarClasses(theme)} aria-hidden />
        <div className="min-w-0 flex-1 p-3 space-y-2.5">
          {/* Row 1 — journey identity */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
                  {t("parent_hub.headers.section1_for")}
                </p>
                {bandLabel ? (
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-foreground/90">
                    {bandLabel}
                  </span>
                ) : null}
              </div>
              <p className="font-quicksand text-base font-bold text-foreground leading-tight mt-0.5">
                {childName}
              </p>
              <p className="text-[11px] text-muted-foreground/85 mt-0.5 leading-snug">
                {isPremium
                  ? t("parent_hub.journey.premium_subtitle", { name: childName })
                  : access?.isLocked
                    ? t(jk("unlock_to_continue_soft"))
                    : access
                      ? t(jk("day_of"), {
                          current: Math.min(access.daysCompleted + 1, access.daysTotal),
                          total: access.daysTotal,
                          name: childName,
                        })
                      : t("parent_hub.today_summary.subtitle")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {access && !isPremium ? <JourneyDots access={access} /> : null}
              {isPremium ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {t("parent_hub.journey.premium_active")}
                </span>
              ) : null}
              {journeyStreak > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  {journeyStreak} {t("parent_hub.journey.day_streak")}
                </span>
              ) : null}
            </div>
          </div>

          {/* Row 2 — mastery + stats + next up */}
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
            {masteryScore > 0 || learningProfile ? (
              <MasteryRing
                score={masteryScore}
                size={48}
                label="Growing"
                parentHub
                className="shrink-0 scale-90 origin-center -my-1"
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                {learningLevel != null ? (
                  <span>
                    Level{" "}
                    <span className="font-semibold text-foreground">{learningLevel}</span>
                  </span>
                ) : null}
                {totalXP > 0 ? (
                  <span>
                    <span className={HUB_XP_GOLD}>{totalXP}</span> XP
                  </span>
                ) : null}
                {coins > 0 ? (
                  <span>
                    <span className="font-semibold text-foreground">{coins}</span> coins
                  </span>
                ) : null}
                {rhythmDays > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-orange-400">
                    <Flame className="h-3 w-3" />
                    {rhythmDays}d rhythm
                  </span>
                ) : null}
              </div>
              {showPathPreview ? (
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className="text-base shrink-0 leading-none" aria-hidden>
                    {nextStep.emoji}
                  </span>
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    {nextStep.title}
                  </p>
                </div>
              ) : pathCompleted ? (
                <p className="text-xs font-semibold text-emerald-400/90">
                  {t("parent_hub.journey.path_done_today", { day: access?.daysCompleted ?? 1 })}
                </p>
              ) : isJourneyLocked && !isPremium ? (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 shrink-0" />
                  {t("parent_hub.journey.path_locked_title")}
                </p>
              ) : null}
            </div>
            {onOpenLearning ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-full h-8 px-3 text-xs font-bold gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 text-white border-0 shadow-[0_0_14px_rgba(251,146,60,0.3)]"
                onClick={onOpenLearning}
              >
                {pathCompleted
                  ? t("parent_hub.today_summary.growth_link")
                  : t("parent_hub.journey.next_step")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>

          {/* Row 3 — momentum bar */}
          {(masteryScore > 0 || learningProfile) && (
            <ProgressionBar
              label={t("parent_hub.journey_pulse.learning_momentum", { defaultValue: "Learning momentum" })}
              value={masteryScore}
              showPercent
              parentHub
              className="px-0.5"
            />
          )}

          {countdown ? (
            <p className="text-[10px] font-semibold text-amber-300/90 px-0.5" data-testid="journey-calendar-countdown">
              ⏳ {countdown}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
