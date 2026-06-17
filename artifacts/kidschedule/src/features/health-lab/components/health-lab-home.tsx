import type { ReactNode } from "react";
import { GAMES, getLevelForXp, getNextLevel, DAILY_QUESTS, BADGES, getPrestigeTier } from "../constants";
import { getSeasonalTheme, getWeeklyChallenge, isGoldenChallengeDay, isDoubleXpDay, MONTHLY_MEGA_QUEST } from "../retention";
import { filterHistoryByRange, dateKeyLocal } from "../storage";
import { monthlySessionCount } from "../dashboard-utils";
import { HEALTH_LAB_HERO, HEALTH_LAB_THEME } from "../theme";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import type { HealthLabPersistedState } from "../types";
import { HealthLabAvatar } from "./health-lab-avatar";
import { HealthLabDisclaimer } from "./health-lab-disclaimer";
import { HealthLabGameCard, HealthLabChallengesSection } from "./health-lab-game-ui";
import { cn } from "@/lib/utils";
import { Flame, Coins, Trophy, Sparkles, ChevronRight, Gift, ShoppingBag, Star, Target } from "lucide-react";

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
  onSelectGame: (gameId: (typeof GAMES)[number]["id"]) => void;
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
  const earnedBadges = state.badges.slice(-4);
  const monthSessions = monthlySessionCount(state);
  const megaPct = Math.min(100, (monthSessions / MONTHLY_MEGA_QUEST.targetSessions) * 100);

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4 text-base">
      <div className={HEALTH_LAB_HERO}>
        <div className="flex items-start gap-4">
          <HealthLabAvatar avatarId={state.avatarId} level={state.level} size="lg" glowing equippedItems={state.equippedItems} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-300/80">
              {t("title")} · {season.emoji} {season.name}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">
              {t("subtitle")}
            </h1>
            <p className="mt-1 text-sm text-violet-200/70">{t("child_playground", `${childName}'s wellness playground`, { name: childName })}</p>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-violet-500/15 px-3 py-2 text-center text-sm text-violet-100/90">
          💬 {amyMessage}
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <StatPill icon={<Sparkles className="h-4 w-4" />} label={t("stat_today", "Today")} value={`${todayScore || "—"}`} />
          <StatPill icon={<Flame className="h-4 w-4" />} label={t("stat_streak", "Streak")} value={`${state.streakDays}d`} />
          <StatPill icon={<Coins className="h-4 w-4" />} label={t("stat_coins", "Coins")} value={String(state.coins)} />
          <StatPill icon={<Star className="h-4 w-4" />} label={t("stat_xp", "XP")} value={String(state.totalXp)} />
        </div>

        <p className="mt-3 text-center text-xs text-violet-300/70">
          {t("weekly_sessions", "Weekly")}: {weekSessions} {t("sessions_label", "sessions")} · {t("quest_streak", "Quest streak")} {state.questStreakDays}d
          {prestigeLabel && ` · ${prestigeLabel}`}
        </p>

        {(isGoldenChallengeDay() || isDoubleXpDay()) && (
          <p className="mt-2 rounded-lg bg-amber-500/20 px-3 py-2 text-center text-xs font-bold text-amber-200">
            {isGoldenChallengeDay() && t("golden_challenge", "✨ Golden Challenge — 2× XP on Perfect!")}
            {isDoubleXpDay() && ` ${t("double_xp_sunday", "🎉 Double XP Sunday!")}`}
          </p>
        )}

        <div className="mt-4">
          <div className="flex justify-between text-xs text-violet-200/70">
            <span>{level.name}</span>
            <span>{state.totalXp} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          {nextLevel && (
            <p className="mt-1 text-[11px] text-violet-300/60">
              {nextLevel.xpRequired - state.totalXp} XP {t("to_level", "to")} {nextLevel.name}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onStartQuest} className={cn("flex-1 min-h-[48px] rounded-2xl py-3.5 text-sm", HEALTH_LAB_THEME.ctaPrimary)}>
            {t("start_quest")}
          </button>
          <button type="button" onClick={onViewProgress} className={cn("min-h-[48px] rounded-2xl px-4 py-3.5 text-sm", HEALTH_LAB_THEME.ctaSecondary)}>
            {t("progress")}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {canSurprise && (
          <button type="button" onClick={onClaimSurprise} className={cn(HEALTH_LAB_THEME.cardGlass, "flex flex-1 items-center gap-2 p-3 text-left min-h-[48px]")}>
            <Gift className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-white">{t("daily_surprise")}</span>
          </button>
        )}
        <button type="button" onClick={onOpenTreasure} className={cn(HEALTH_LAB_THEME.cardGlass, "flex flex-1 items-center gap-2 p-3 text-left min-h-[48px]")}>
          <span className="text-xl">🎁</span>
          <span className="text-sm font-medium text-white">{t("treasure_chest")}</span>
        </button>
        <button type="button" onClick={onOpenShop} className={cn(HEALTH_LAB_THEME.cardGlass, "flex items-center gap-2 p-3 min-h-[48px]")} aria-label={t("open_shop", "Open shop")}>
          <ShoppingBag className="h-5 w-5 text-violet-300" />
        </button>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-3")}>
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <Target className="h-3.5 w-3.5" />
          {t("monthly_mega_quest", "Monthly Mega Quest")}
        </p>
        <p className="mt-1 text-sm text-white/80">
          {monthSessions}/{MONTHLY_MEGA_QUEST.targetSessions} {t("sessions_label", "sessions")} — +{MONTHLY_MEGA_QUEST.bonusXp} XP & +{MONTHLY_MEGA_QUEST.bonusCoins} 🪙
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${megaPct}%` }} />
        </div>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-3")}>
        <p className="text-xs font-semibold text-amber-300">{t("weekly_challenge")}: {weekly.title}</p>
        <p className="text-sm text-white/80">{t("weekly_challenge_hint", "Play")} {weekly.gameId.replace(/-/g, " ")} {t("for_bonus", "for")} +{weekly.bonusXp} {t("bonus_xp", "bonus XP")}</p>
      </div>

      {earnedBadges.length > 0 && (
        <section aria-labelledby="badges-heading">
          <h2 id="badges-heading" className="mb-2 text-sm font-semibold text-white">{t("recent_badges", "Recent Badges")}</h2>
          <div className="flex gap-2">
            {earnedBadges.map((b) => {
              const def = BADGES.find((x) => x.id === b.id);
              return (
                <span key={b.id} className="text-2xl" title={def?.name} aria-label={def?.name}>
                  {def?.emoji ?? "🏅"}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="daily-quests-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="daily-quests-heading" className="text-sm font-semibold text-white">{t("daily_quests", "Daily Quests")}</h2>
          <span className="text-xs text-violet-300/70">{questsDone}/{questsTotal}</span>
        </div>
        <div className="space-y-2">
          {DAILY_QUESTS.map((q) => {
            const progress = state.dailyQuests?.quests.find((p) => p.id === q.id);
            const pct = progress ? Math.min(100, (progress.progress / q.target) * 100) : 0;
            return (
              <div key={q.id} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3")}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">{q.title}</span>
                  <span className="text-amber-300">+{q.coinReward}🪙 +{q.xpReward}XP</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <HealthLabChallengesSection
        eyebrow={t("pick_a_challenge", "Pick a challenge")}
        title={t("wellness_challenges", "Wellness Challenges")}
        hint={t("wellness_challenges_hint", "Tap any adventure — earn XP, coins & badges")}
      >
        {GAMES.map((game, index) => (
          <HealthLabGameCard
            key={game.id}
            game={game}
            index={index}
            personalBest={state.personalBests[game.id]}
            gameHistory={state.gameHistory}
            onSelect={() => onSelectGame(game.id)}
          />
        ))}
      </HealthLabChallengesSection>

      <button type="button" onClick={onOpenDashboard} className={cn(HEALTH_LAB_THEME.cardGlass, "flex w-full items-center gap-3 p-4 text-left min-h-[48px]")}>
        <Trophy className="h-8 w-8 text-amber-400" />
        <div>
          <p className="font-semibold text-white">{t("dashboard")}</p>
          <p className="text-xs text-violet-200/70">{t("dashboard_hint", "Charts, summaries & encouraging insights")}</p>
        </div>
        <ChevronRight className="ml-auto h-5 w-5 text-violet-300/50" />
      </button>

      <HealthLabDisclaimer compact />
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-2 py-2.5">
      <div className="mx-auto mb-1 flex justify-center text-amber-300">{icon}</div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-violet-300/60">{label}</p>
    </div>
  );
}
