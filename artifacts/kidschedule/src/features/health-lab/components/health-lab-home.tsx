import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";
import { HealthLabLivingOpening } from "@/features/health-lab/components/health-lab-living-opening";
import { AppLink } from "@/components/app-link";
import { buildParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import "@/pages/first-experience-material.css";
import "@/components/health-lab/health-lab-living-room.css";
import {
  GAMES,
  getLevelForXp,
  getNextLevel,
  DAILY_QUESTS,
  BADGES,
  getPrestigeTier,
  GAME_ONBOARDING,
} from "../constants";
import {
  getSeasonalTheme,
  getWeeklyChallenge,
  isGoldenChallengeDay,
  isDoubleXpDay,
  MONTHLY_MEGA_QUEST,
  canOpenTreasureChest,
} from "../retention";
import {
  getMissionCoaching,
  getParentInsightLine,
  pickNextPlayableGame,
  PLAYABLE_GAMES,
} from "../play-path";
import { filterHistoryByRange, dateKeyLocal } from "../storage";
import { monthlySessionCount } from "../dashboard-utils";
import { getHubVitality, getWorldEvolution } from "../world-evolution";
import { getWorldIdentity } from "../world-identity";
import { HEALTH_LAB_THEME } from "../theme";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import type { HealthGameId, HealthLabPersistedState } from "../types";
import { HealthLabAmyCharacter } from "./health-lab-amy-character";
import { HealthLabDisclaimer } from "./health-lab-disclaimer";
import { HealthLabLivingHub } from "./health-lab-living-hub";
import { HealthLabWorldMap } from "./health-lab-world-map";
import { HealthLabWorldMotif } from "./health-lab-world-motif";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";
import {
  Flame,
  Coins,
  Trophy,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Gift,
  ShoppingBag,
  Star,
  Lock,
  BookOpen,
  Play,
} from "lucide-react";

interface Props {
  state: HealthLabPersistedState;
  todayScore: number;
  childName: string;
  amyMessage: string;
  onStartQuest: () => void;
  onViewProgress: () => void;
  onOpenDashboard: () => void;
  onOpenShop: () => void;
  onClaimSurprise: () => void;
  onOpenTreasure: () => void;
  onSelectGame: (gameId: HealthGameId) => void;
}

export function HealthLabHome({
  state,
  todayScore,
  childName,
  amyMessage,
  onStartQuest,
  onViewProgress,
  onOpenDashboard,
  onOpenShop,
  onClaimSurprise,
  onOpenTreasure,
  onSelectGame,
}: Props) {
  const { t } = useHealthLabI18n();
  const { t: tRoot } = useTranslation();
  const reduced = useReducedMotion();
  const living = isHealthLabLivingV1Enabled();
  const [showGoals, setShowGoals] = useState(false);
  const [showGrownUps, setShowGrownUps] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const careHref = buildParentingHubDeepLink("health-lab");
  const careMemory = ROOM_HEROES.care;

  const level = getLevelForXp(state.totalXp, state.prestige);
  const nextLevel = getNextLevel(level.id);
  const xpProgress = nextLevel
    ? Math.min(100, ((state.totalXp - level.xpRequired) / (nextLevel.xpRequired - level.xpRequired)) * 100)
    : 100;

  const questsDone = state.dailyQuests?.quests.filter((q) => q.completedAt).length ?? 0;
  const questsTotal = DAILY_QUESTS.length;
  const weekSessions = filterHistoryByRange(state.gameHistory, "7d").length;
  const season = getSeasonalTheme();
  const weekly = getWeeklyChallenge();
  const prestigeLabel = getPrestigeTier(state.prestige);
  const canSurprise = state.dailySurpriseClaimedDateKey !== dateKeyLocal();
  const treasureReady = canOpenTreasureChest(state);
  const earnedBadges = state.badges.slice(-4);
  const monthSessions = monthlySessionCount(state);
  const megaPct = Math.min(100, (monthSessions / MONTHLY_MEGA_QUEST.targetSessions) * 100);

  const recommendedId = pickNextPlayableGame(state);
  const recommendedGame = GAMES.find((g) => g.id === recommendedId) ?? PLAYABLE_GAMES[0];
  const nextWorld = getWorldIdentity(recommendedId);
  const nextEvolution = getWorldEvolution(state, recommendedId);
  const hubVitality = getHubVitality(state);
  const coaching = getMissionCoaching(state, childName, recommendedId);
  const parentLine = getParentInsightLine(state, childName);
  const demoAction = GAME_ONBOARDING[recommendedId]?.demoAction ?? "hold";
  const completedToday = state.gamesCompletedToday.filter((id) => id !== "calmness-meter").length;
  const allDoneToday = completedToday >= PLAYABLE_GAMES.length;

  const todayLabel =
    todayScore > 0 ? String(todayScore) : t("today_empty", "Let's begin!");

  const playLabel = t("play_now", "Play");

  if (living) {
    return (
      <div
        className="fe-shell health-lab-living"
        data-testid="health-lab-living"
        data-ph-pack="health-lab-2"
        data-fe-shot={careMemory.shot}
        data-fe-room="reveal"
        data-fe-presence="settle"
      >
        <div className="fe-ambient" aria-hidden="true">
          <img
            src={careMemory.src}
            alt=""
            decoding="async"
            loading="lazy"
            fetchPriority="low"
          />
          <div className="fe-ambient-wash" />
        </div>
        <div className="fe-breath fe-breath-a" aria-hidden="true" />
        <div className="fe-breath fe-breath-b" aria-hidden="true" />
        <div className="fe-living-shade" aria-hidden="true" />

        <div className="hl-living-content">
          <AppLink href={careHref} replace source="health-lab-back-care">
            <button type="button" className="hl-back" data-testid="health-lab-back-care">
              <ChevronLeft className="h-4 w-4" />
              {tRoot("parent_hub.rooms.care.title", { defaultValue: "Care" })}
            </button>
          </AppLink>

          <HealthLabLivingOpening
            childName={childName}
            recommendedGameId={recommendedId}
            onRecommend={onStartQuest}
            onSelectGame={onSelectGame}
          />

          <div>
            <button
              type="button"
              className="hl-more-toggle"
              data-testid="health-lab-more-toggle"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              {moreOpen
                ? tRoot("health_lab.living.more_hide", {
                    defaultValue: "Hide more wellness",
                  })
                : tRoot("health_lab.living.more_show", {
                    defaultValue: "More wellness",
                  })}
            </button>
            {moreOpen ? (
              <div
                className="hl-more-body health-lab-home-scroll space-y-4"
                data-testid="health-lab-more-body"
              >
                {/* Subordinated game chrome — XP / shop / map / quests */}
                <div
                  className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap"
                  role="group"
                  aria-label={t("rewards_section", "Rewards")}
                >
                  {canSurprise && (
                    <button
                      type="button"
                      onClick={onClaimSurprise}
                      className="health-lab-pressable flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-400/25 px-3 font-bold text-amber-50"
                    >
                      <Gift className="h-5 w-5" aria-hidden />
                      <span className="text-sm">{t("daily_surprise")}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenShop}
                    className="health-lab-pressable flex min-h-[56px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-3"
                    aria-label={`${t("open_shop", "Open shop")}, ${state.coins} ${t("coins_label", "coins")}`}
                  >
                    <ShoppingBag className="h-5 w-5 text-violet-200" />
                    <span className="text-sm font-black text-amber-200">{state.coins}</span>
                  </button>
                </div>

                <HealthLabWorldMap
                  state={state}
                  recommendedId={recommendedId}
                  playLabel={playLabel}
                  title={tRoot("health_lab.living.worlds", {
                    defaultValue: "Wellness worlds",
                  })}
                  hint={tRoot("health_lab.living.worlds_hint", {
                    defaultValue: "Choose a gentle practice",
                  })}
                  onSelectGame={onSelectGame}
                />

                <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => setShowGrownUps((v) => !v)}
                    className="health-lab-pressable flex w-full min-h-[52px] items-center gap-3 px-4 py-3 text-left"
                    aria-expanded={showGrownUps}
                  >
                    <Trophy className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">
                        {t("grown_ups_section", "For grown-ups")}
                      </p>
                      <p className="text-xs text-violet-200/70">
                        {t("grown_ups_hint", "Progress, passport & parent insights")}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-violet-200/70 transition-transform duration-200",
                        showGrownUps && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {showGrownUps ? (
                    <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                      <p className="rounded-xl bg-amber-400/10 px-3 py-2.5 text-sm leading-relaxed text-amber-50/95">
                        {parentLine}
                      </p>
                      <button
                        type="button"
                        onClick={onViewProgress}
                        className={cn(
                          "health-lab-pressable w-full min-h-[48px] rounded-xl px-3 py-2 text-sm",
                          HEALTH_LAB_THEME.ctaSecondary,
                        )}
                      >
                        {t("progress")}
                      </button>
                      <button
                        type="button"
                        onClick={onOpenDashboard}
                        className="health-lab-pressable flex w-full min-h-[48px] items-center gap-3 rounded-xl bg-white/[0.05] p-3 text-left"
                      >
                        <Trophy className="h-7 w-7 text-amber-400" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{t("dashboard", "Parent Insights")}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-violet-300/50" />
                      </button>
                    </div>
                  ) : null}
                </section>

                <HealthLabDisclaimer compact />
              </div>
            ) : null}
          </div>

          <p className="hl-support-note">{PREMIUM_VOICE.invitation}</p>
          <AppLink href="/dashboard" source="health-lab-exit-home">
            <span className="hl-exit-home" data-testid="health-lab-exit-home">
              {tRoot("health_lab.living.exit_home", {
                defaultValue: "Back to Today Home",
              })}
            </span>
          </AppLink>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "health-lab-home-scroll mx-auto w-full min-w-0 max-w-lg space-y-4 px-[clamp(0.75rem,4vw,1rem)] pb-28 pt-2 text-base",
        hubVitality >= 3 && "health-lab-home-alive",
      )}
    >
      {/* 1. Mission — tinted by next world; hub life from restorations */}
      <section
        aria-labelledby="mission-heading"
        className="relative overflow-hidden rounded-[1.75rem] border border-white/15 p-5 sm:p-6"
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", nextWorld.sky)} aria-hidden />
        <div
          className={cn(
            "absolute inset-0 bg-[#070b24]/45",
            hubVitality >= 4 && "bg-[#070b24]/30",
          )}
          aria-hidden
        />
        <HealthLabWorldMotif
          motif={nextWorld.motif}
          alive={!reduced}
          stage={nextEvolution.stage}
          friendEmoji={nextEvolution.friendEmoji}
          celebrating={nextEvolution.helpedToday}
          className="opacity-80"
        />
        <HealthLabLivingHub vitality={hubVitality} alive={!reduced} />

        <div className="relative flex items-center gap-4">
          <HealthLabAmyCharacter
            size="lg"
            mood={allDoneToday || hubVitality >= 4 ? "celebrate" : "happy"}
            action={demoAction}
            showDemo={!allDoneToday}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              {season.emoji} {season.name}
              {nextEvolution.stage >= 1 && (
                <span className="ml-2 font-bold normal-case tracking-normal text-emerald-200/90">
                  · {nextEvolution.milestoneLabel}
                </span>
              )}
            </p>
            <h1
              id="mission-heading"
              className="mt-1 font-quicksand text-2xl font-black leading-[1.15] tracking-tight text-white"
            >
              {coaching.greeting}
            </h1>
            <p className="mt-1.5 text-sm font-medium leading-snug text-white/75">
              {coaching.missionLine}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white/95">
              {allDoneToday
                ? t("mission_complete_today", "You explored every world today!")
                : coaching.amyLine}
            </p>
          </div>
        </div>

        {(isGoldenChallengeDay() || isDoubleXpDay()) && (
          <p className="relative mt-3 rounded-xl bg-black/25 px-3 py-2 text-center text-xs font-black text-amber-100">
            {isGoldenChallengeDay() && t("golden_challenge", "✨ Golden Challenge — 2× XP on Perfect!")}
            {isDoubleXpDay() && ` ${t("double_xp_sunday", "🎉 Double XP Sunday!")}`}
          </p>
        )}

        <button
          type="button"
          onClick={onStartQuest}
          className={cn(
            "health-lab-pressable relative mt-5 flex w-full min-h-[60px] items-center justify-center gap-3 rounded-2xl py-4 text-lg font-black tracking-wide",
            nextWorld.ctaClass,
          )}
        >
          <span className="text-2xl" aria-hidden>
            {recommendedGame.emoji}
          </span>
          <span className="inline-flex items-center gap-2">
            <Play className="h-5 w-5 fill-current" aria-hidden />
            {allDoneToday
              ? t("play_again_mission", "Play a favorite world")
              : t("start_quest", "Start Today's Adventure")}
          </span>
        </button>
        <p className="relative mt-2.5 text-center text-sm font-bold text-white/75">
          <span aria-hidden>
            {nextWorld.celebrateEmoji} {nextWorld.worldName}
            {nextEvolution.stage === 0
              ? ` · Restore it`
              : ` · ${nextEvolution.milestoneLabel}`}
          </span>
          <span className="sr-only">
            {t("mission_next_hint", "Next up")}: {recommendedGame.title}
          </span>
        </p>
        <span className="sr-only">{amyMessage}</span>
      </section>

      {/* 2. Magic tray */}
      <div
        className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap"
        role="group"
        aria-label={t("rewards_section", "Rewards")}
      >
        {canSurprise && (
          <button
            type="button"
            onClick={onClaimSurprise}
            className={cn(
              "health-lab-pressable flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-400/25 px-3 font-bold text-amber-50",
            )}
          >
            <Gift className="h-5 w-5" aria-hidden />
            <span className="text-sm">{t("daily_surprise")}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (treasureReady) onOpenTreasure();
          }}
          disabled={!treasureReady}
          aria-disabled={!treasureReady}
          className={cn(
            "health-lab-pressable flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-3",
            !treasureReady && "opacity-55",
          )}
        >
          {treasureReady ? (
            <span className="text-xl" aria-hidden>
              🎁
            </span>
          ) : (
            <Lock className="h-4 w-4 text-violet-300/80" aria-hidden />
          )}
          <span className="text-left">
            <span className="block text-sm font-bold text-white">{t("treasure_chest")}</span>
            {!treasureReady && (
              <span className="block text-[10px] text-violet-300/70">
                {t("treasure_locked_short", "Keep your streak!")}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenShop}
          className="health-lab-pressable flex min-h-[56px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-3"
          aria-label={`${t("open_shop", "Open shop")}, ${state.coins} ${t("coins_label", "coins")}`}
        >
          <ShoppingBag className="h-5 w-5 text-violet-200" />
          <span className="text-sm font-black text-amber-200">{state.coins}</span>
        </button>
        {state.streakDays > 0 && (
          <div
            className="flex min-h-[56px] items-center gap-1.5 rounded-2xl border border-orange-300/25 bg-orange-400/15 px-3"
            aria-label={`${state.streakDays} ${t("stat_streak", "Streak")}`}
          >
            <Flame className="h-5 w-5 text-orange-400" aria-hidden />
            <span className="text-sm font-black text-white">{state.streakDays}d</span>
          </div>
        )}
      </div>

      {/* 3. World map path */}
      <HealthLabWorldMap
        state={state}
        recommendedId={recommendedId}
        playLabel={playLabel}
        title={t("todays_adventures", "Today's Adventures")}
        hint={
          hubVitality >= 2
            ? t("worlds_hint_alive", "Your worlds remember you — keep healing the trail!")
            : t("worlds_hint", "Travel the trail — tap a world!")
        }
        onSelectGame={onSelectGame}
      />

      {/* 4. Goals */}
      <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07]">
        <button
          type="button"
          onClick={() => setShowGoals((v) => !v)}
          className="health-lab-pressable flex w-full min-h-[52px] items-center gap-3 px-4 py-3 text-left"
          aria-expanded={showGoals}
        >
          <Sparkles className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {t("daily_quests", "Daily Quests")} · {questsDone}/{questsTotal}
            </p>
            <p className="truncate text-xs text-violet-200/70">
              {weekly.title} · +{weekly.bonusXp} XP · {monthSessions}/{MONTHLY_MEGA_QUEST.targetSessions}{" "}
              {t("sessions_label", "sessions")}
            </p>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 text-violet-200/70 transition-transform duration-200", showGoals && "rotate-180")}
            aria-hidden
          />
        </button>
        {showGoals && (
          <div className="space-y-2 border-t border-white/10 px-4 pb-4 pt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
                style={{ width: `${megaPct}%` }}
              />
            </div>
            {DAILY_QUESTS.map((q) => {
              const progress = state.dailyQuests?.quests.find((p) => p.id === q.id);
              const pct = progress ? Math.min(100, (progress.progress / q.target) * 100) : 0;
              return (
                <div key={q.id} className="rounded-xl bg-white/[0.05] p-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-white">{q.title}</span>
                    <span className="text-amber-300">
                      +{q.coinReward}🪙 +{q.xpReward}XP
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {earnedBadges.length > 0 && (
              <div className="flex gap-2 pt-1">
                {earnedBadges.map((b) => {
                  const def = BADGES.find((x) => x.id === b.id);
                  return (
                    <span key={b.id} className="text-2xl" title={def?.name} aria-label={def?.name}>
                      {def?.emoji ?? "🏅"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Grown-ups */}
      <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07]">
        <button
          type="button"
          onClick={() => setShowGrownUps((v) => !v)}
          className="health-lab-pressable flex w-full min-h-[52px] items-center gap-3 px-4 py-3 text-left"
          aria-expanded={showGrownUps}
        >
          <Trophy className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{t("grown_ups_section", "For grown-ups")}</p>
            <p className="text-xs text-violet-200/70">
              {t("grown_ups_hint", "Progress, passport & parent insights")}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-violet-200/70 transition-transform duration-200",
              showGrownUps && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {showGrownUps && (
          <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
            <p className="rounded-xl bg-amber-400/10 px-3 py-2.5 text-sm leading-relaxed text-amber-50/95">
              {parentLine}
            </p>

            <div className="grid grid-cols-4 gap-2 text-center">
              <StatPill icon={<Sparkles className="h-4 w-4" />} label={t("stat_today", "Today")} value={todayLabel} />
              <StatPill
                icon={<Flame className="h-4 w-4" />}
                label={t("stat_streak", "Streak")}
                value={`${state.streakDays}d`}
              />
              <StatPill
                icon={<Coins className="h-4 w-4" />}
                label={t("stat_coins", "Coins")}
                value={String(state.coins)}
              />
              <StatPill
                icon={<Star className="h-4 w-4" />}
                label={t("stat_xp", "XP")}
                value={String(state.totalXp)}
              />
            </div>
            <p className="text-center text-xs text-violet-300/70">
              {t("weekly_sessions", "Weekly")}: {weekSessions} {t("sessions_label", "sessions")}
              {prestigeLabel && ` · ${prestigeLabel}`}
            </p>
            <div>
              <div className="flex justify-between text-xs text-violet-200/70">
                <span>{level.name}</span>
                <span>{state.totalXp} XP</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              {nextLevel && (
                <p className="mt-1 text-[11px] text-violet-300/60">
                  {nextLevel.xpRequired - state.totalXp} XP {t("to_level", "to")} {nextLevel.name}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onViewProgress}
              className={cn(
                "health-lab-pressable w-full min-h-[48px] rounded-xl px-3 py-2 text-sm",
                HEALTH_LAB_THEME.ctaSecondary,
              )}
            >
              {t("progress")}
            </button>

            <button
              type="button"
              onClick={() => onSelectGame("calmness-meter")}
              className="health-lab-pressable flex w-full min-h-[56px] items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-left"
            >
              <BookOpen className="h-7 w-7 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t("health_passport", "Health Passport")}</p>
                <p className="text-xs text-violet-200/70">{t("wellness_report", "Amy Wellness Report")}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-violet-300/50" />
            </button>

            <button
              type="button"
              onClick={onOpenDashboard}
              className="health-lab-pressable flex w-full min-h-[48px] items-center gap-3 rounded-xl bg-white/[0.05] p-3 text-left"
            >
              <Trophy className="h-7 w-7 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t("dashboard", "Parent Insights")}</p>
                <p className="text-xs text-violet-200/70">
                  {t("dashboard_hint", "Charts, summaries & encouraging insights")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-violet-300/50" />
            </button>
          </div>
        )}
      </section>

      <HealthLabDisclaimer compact />
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-1.5 py-2">
      <div className="mx-auto mb-1 flex justify-center text-amber-300">{icon}</div>
      <p className="text-sm font-bold leading-tight text-white">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-violet-300/60">{label}</p>
    </div>
  );
}
