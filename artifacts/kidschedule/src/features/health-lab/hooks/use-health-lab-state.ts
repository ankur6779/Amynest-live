import { useCallback, useMemo, useState } from "react";
import { evaluateMasterBadges } from "../badges";
import { STREAK_MILESTONES } from "../constants";
import {
  trackHealthLabEvent,
  trackSessionComplete,
  trackCheatDetected,
  trackPrestigeUnlock,
  trackMasterBadgeUnlock,
  trackWeeklyChallengeComplete,
} from "../health-lab-analytics";
import { purchaseItem } from "../shop";
import {
  isDoubleXpDay,
  isGoldenChallengeDay,
  getWeeklyChallenge,
  rollDailySurprise,
  canOpenTreasureChest,
  treasureChestReward,
  weekKey,
  monthKey,
  MONTHLY_MEGA_QUEST,
  getAmyEncouragement,
} from "../retention";
import {
  gameMetricsFor,
  scoreToTier,
  tierToXp,
  todayWellnessScore,
  applyXpModifiers,
} from "../scoring";
import { canRewardCalmnessSnapshot } from "../anti-cheat";
import { equipItem } from "../equipment";
import { enqueueHealthLabSync, postHealthLabSession } from "../health-lab-sync";
import {
  appendSessionResult,
  dateKeyLocal,
  ensureDailyQuests,
  hasBadge,
  incrementQuestProgress,
  loadHealthLabState,
  saveHealthLabState,
  unlockBadge,
} from "../storage";
import type {
  BadgeId,
  GameSessionResult,
  HealthGameId,
  HealthLabPersistedState,
  HealthLabView,
  SessionCompleteOptions,
} from "../types";

export function useHealthLabState(childId: number) {
  const [state, setState] = useState<HealthLabPersistedState>(() =>
    ensureDailyQuests(loadHealthLabState(childId)),
  );
  const [view, setView] = useState<HealthLabView>("home");
  const [pendingCelebrations, setPendingCelebrations] = useState<
    { type: "level-up" | "streak" | "badge" | "quest" | "treasure" | "surprise"; payload: unknown }[]
  >([]);

  const persist = useCallback((next: HealthLabPersistedState) => {
    saveHealthLabState(next);
    setState(next);
    enqueueHealthLabSync(childId);
  }, [childId]);

  const todayScore = useMemo(
    () => todayWellnessScore(state.gameHistory, dateKeyLocal()),
    [state.gameHistory],
  );

  const pushCelebrations = useCallback(
    (items: typeof pendingCelebrations) => {
      if (items.length > 0) setPendingCelebrations((prev) => [...prev, ...items]);
    },
    [],
  );

  const processQuests = useCallback(
    (s: HealthLabPersistedState, xpEarned: number, personalBest: boolean) => {
      let next = s;
      const completed: typeof pendingCelebrations = [];

      const apply = (questId: Parameters<typeof incrementQuestProgress>[1], amount = 1) => {
        const { state: updated, newlyCompleted } = incrementQuestProgress(next, questId, amount);
        next = updated;
        for (const qid of newlyCompleted) {
          completed.push({ type: "quest", payload: { id: qid } });
          trackHealthLabEvent("health_lab_quest_complete", childId, { questId: qid });
        }
      };

      if (personalBest) apply("beat-pb");
      apply("complete-3");
      apply("complete-all-6");
      apply("maintain-streak");
      apply("earn-300-xp", xpEarned);

      if (next.sessionBurstCount >= 3 && next.sessionBurstStartMs) {
        const elapsed = Date.now() - next.sessionBurstStartMs;
        if (elapsed <= 5 * 60 * 1000) apply("complete-under-5min");
      }

      return { next, completed };
    },
    [childId],
  );

  const recordSession = useCallback(
    (
      gameId: HealthGameId,
      score: number,
      durationMs: number,
      options?: SessionCompleteOptions,
    ) => {
      const eligibleForBadges = options?.eligibleForBadges !== false;
      const eligibleForXp = options?.eligibleForXp !== false;
      const cheatFlags = options?.cheatFlags ?? [];

      if (cheatFlags.length > 0) {
        trackCheatDetected(childId, gameId, cheatFlags);
      }

      let effectiveScore = score;
      if (!eligibleForXp && cheatFlags.length > 0) effectiveScore = Math.min(score, 40);

      const tier = scoreToTier(effectiveScore);
      let xpEarned = eligibleForXp ? tierToXp(tier) : 0;

      if (gameId === "calmness-meter") {
        const canReward = canRewardCalmnessSnapshot(
          state.gamesCompletedToday,
          state.calmnessRewardedToday,
        );
        xpEarned = canReward ? tierToXp(tier) : 0;
      }

      const weekly = getWeeklyChallenge();
      const weeklyBonus =
        gameId === weekly.gameId && xpEarned > 0 ? weekly.bonusXp : 0;

      xpEarned = applyXpModifiers(xpEarned, {
        doubleXpDay: isDoubleXpDay(),
        goldenChallenge: isGoldenChallengeDay() && tier === "perfect",
        weeklyBonus,
      });

      const prevPb = state.personalBests[gameId] ?? 0;
      const personalBest = effectiveScore > prevPb;
      const prevLevel = state.level;
      const prevPrestige = state.prestige;
      const prevWeeklyCompleted = state.weeklyChallengeCompletedWeekKey;

      const result: GameSessionResult = {
        gameId,
        timestamp: Date.now(),
        durationMs,
        xpEarned,
        xpTier: tier,
        score: effectiveScore,
        metrics: { ...gameMetricsFor(gameId, effectiveScore), ...options?.extraMetrics },
        personalBest,
        achievementUnlocked: options?.achievementUnlocked,
        simulated: options?.simulated,
        cheatFlags: cheatFlags.length > 0 ? cheatFlags : undefined,
        eligibleForBadges,
      };

      let next = appendSessionResult(state, result);
      const celebrations: typeof pendingCelebrations = [];

      if (next.prestige > prevPrestige) {
        trackPrestigeUnlock(childId, next.prestige);
      }

      const wk = weekKey();
      const weeklyGameSessions = next.gameHistory.filter(
        (s) => s.gameId === weekly.gameId && weekKey(new Date(s.timestamp)) === wk,
      ).length;
      if (weeklyGameSessions >= 5 && prevWeeklyCompleted !== wk) {
        next = { ...next, weeklyChallengeCompletedWeekKey: wk };
        trackWeeklyChallengeComplete(childId, wk);
      }

      const mk = monthKey();
      const monthSessions = next.gameHistory.filter(
        (s) => monthKey(new Date(s.timestamp)) === mk,
      ).length;
      if (
        monthSessions >= MONTHLY_MEGA_QUEST.targetSessions &&
        next.monthlyMegaQuestClaimedMonthKey !== mk
      ) {
        next = {
          ...next,
          monthlyMegaQuestClaimedMonthKey: mk,
          totalXp: next.totalXp + MONTHLY_MEGA_QUEST.bonusXp,
          coins: next.coins + MONTHLY_MEGA_QUEST.bonusCoins,
        };
        celebrations.push({
          type: "quest",
          payload: { id: "monthly-mega-quest" },
        });
        trackHealthLabEvent("health_lab_quest_complete", childId, { questId: "monthly-mega-quest" });
      }

      // Surprise bonus XP (~8% chance on strong sessions)
      if (eligibleForXp && effectiveScore >= 80 && Math.random() < 0.08) {
        const bonus = 15 + Math.floor(Math.random() * 20);
        next = { ...next, totalXp: next.totalXp + bonus };
        trackHealthLabEvent("health_lab_daily_surprise", childId, { type: "xp", amount: bonus, source: "session_bonus" });
      }

      if (!hasBadge(next, "first-challenge")) {
        next = unlockBadge(next, "first-challenge");
        celebrations.push({ type: "badge", payload: { id: "first-challenge" } });
        trackHealthLabEvent("health_lab_badge_unlock", childId, { badgeId: "first-challenge" });
      }
      if (tier === "perfect" && eligibleForBadges && !hasBadge(next, "first-perfect")) {
        next = unlockBadge(next, "first-perfect");
        celebrations.push({ type: "badge", payload: { id: "first-perfect" } });
        trackHealthLabEvent("health_lab_badge_unlock", childId, { badgeId: "first-perfect" });
      }
      if (next.level > prevLevel) {
        celebrations.push({ type: "level-up", payload: { level: next.level } });
        trackHealthLabEvent("health_lab_level_up", childId, { level: next.level });
      }
      if (personalBest && eligibleForBadges) {
        /* playNewRecord wired in zone */
      }

      const questResult = processQuests(next, xpEarned, personalBest);
      next = questResult.next;
      celebrations.push(...questResult.completed);

      for (const milestone of STREAK_MILESTONES) {
        if (
          next.streakDays >= milestone &&
          !next.streakMilestonesCelebrated.includes(milestone)
        ) {
          next = {
            ...next,
            streakMilestonesCelebrated: [...next.streakMilestonesCelebrated, milestone],
          };
          celebrations.push({ type: "streak", payload: { days: milestone } });
          trackHealthLabEvent("health_lab_streak_milestone", childId, { days: milestone });
          const badgeId = milestone >= 30 ? "streak-30" : milestone >= 7 ? "streak-7" : null;
          if (badgeId && !hasBadge(next, badgeId)) {
            next = unlockBadge(next, badgeId as BadgeId);
          }
        }
      }

      if (eligibleForBadges) {
        if (gameId === "breath-control" && effectiveScore >= 85 && !hasBadge(next, "still-finger-master")) {
          next = unlockBadge(next, "still-finger-master");
          celebrations.push({ type: "badge", payload: { id: "still-finger-master" } });
        }
        if (gameId === "flamingo-balance" && effectiveScore >= 90 && !hasBadge(next, "flamingo-king")) {
          next = unlockBadge(next, "flamingo-king");
          celebrations.push({ type: "badge", payload: { id: "flamingo-king" } });
        }
        if (gameId === "finger-stability" && effectiveScore >= 85 && !hasBadge(next, "crystal-guardian")) {
          next = unlockBadge(next, "crystal-guardian");
          celebrations.push({ type: "badge", payload: { id: "crystal-guardian" } });
        }
        if (gameId === "reaction-time" && effectiveScore >= 90 && !hasBadge(next, "reaction-ninja")) {
          next = unlockBadge(next, "reaction-ninja");
          celebrations.push({ type: "badge", payload: { id: "reaction-ninja" } });
        }
        if (gameId === "freeze-statue" && effectiveScore >= 95 && !hasBadge(next, "statue-master")) {
          next = unlockBadge(next, "statue-master");
          celebrations.push({ type: "badge", payload: { id: "statue-master" } });
        }
        if (next.level >= 7 && !hasBadge(next, "galaxy-hero")) {
          next = unlockBadge(next, "galaxy-hero");
          celebrations.push({ type: "badge", payload: { id: "galaxy-hero" } });
        }

        for (const masterId of evaluateMasterBadges(next)) {
          if (!hasBadge(next, masterId)) {
            next = unlockBadge(next, masterId);
            celebrations.push({ type: "badge", payload: { id: masterId } });
            trackMasterBadgeUnlock(childId, masterId);
          }
        }

        const hour = new Date().getHours();
        if (hour >= 20 && !hasBadge(next, "secret-midnight-scientist")) {
          next = unlockBadge(next, "secret-midnight-scientist");
          celebrations.push({ type: "badge", payload: { id: "secret-midnight-scientist" } });
        }
        if (next.questStreakDays >= 7 && !hasBadge(next, "secret-perfect-week")) {
          next = unlockBadge(next, "secret-perfect-week");
          celebrations.push({ type: "badge", payload: { id: "secret-perfect-week" } });
        }
        if (isGoldenChallengeDay() && tier === "perfect" && !hasBadge(next, "secret-golden-touch")) {
          next = unlockBadge(next, "secret-golden-touch");
          celebrations.push({ type: "badge", payload: { id: "secret-golden-touch" } });
        }
      }

      trackSessionComplete(childId, {
        gameId,
        score: effectiveScore,
        xpEarned,
        durationMs,
        simulated: options?.simulated,
        cheatFlags: cheatFlags.join(",") || undefined,
      });
      void postHealthLabSession(childId, result);

      if (options?.simulated) {
        trackHealthLabEvent("health_lab_simulation_mode", childId, { gameId });
      }

      persist(next);
      setView({ kind: "session-rewards", result, celebrations });
      return result;
    },
    [state, persist, childId, processQuests],
  );

  const equipShopItem = useCallback(
    (itemId: string) => {
      const result = equipItem(state.equippedItems, state.unlockedAvatarItems, itemId);
      if (!result.ok) return result;
      persist({ ...state, equippedItems: result.equipped });
      trackHealthLabEvent("health_lab_avatar_equip", childId, { itemId });
      return result;
    },
    [state, persist, childId],
  );

  const buyShopItem = useCallback(
    (itemId: string) => {
      const result = purchaseItem(state.unlockedAvatarItems, state.coins, itemId);
      if (!result.ok) return result;
      persist({
        ...state,
        coins: result.coins,
        unlockedAvatarItems: result.owned,
      });
      trackHealthLabEvent("health_lab_shop_purchase", childId, { itemId });
      return result;
    },
    [state, persist, childId],
  );

  const claimDailySurprise = useCallback(() => {
    const today = dateKeyLocal();
    if (state.dailySurpriseClaimedDateKey === today) return null;
    const surprise = rollDailySurprise(`${childId}-${today}`);
    let next = { ...state, dailySurpriseClaimedDateKey: today };
    if (surprise.type === "coins") next.coins += surprise.amount;
    if (surprise.type === "xp") next.totalXp += surprise.amount;
    persist(next);
    trackHealthLabEvent("health_lab_daily_surprise", childId, { type: surprise.type, amount: surprise.amount });
    pushCelebrations([{ type: "surprise", payload: surprise }]);
    return surprise;
  }, [state, persist, childId, pushCelebrations]);

  const openTreasureChest = useCallback(() => {
    if (!canOpenTreasureChest(state)) return null;
    const reward = treasureChestReward(state.streakDays);
    let next: HealthLabPersistedState = {
      ...state,
      treasureChestOpenedThisWeek: weekKey(),
      coins: state.coins + reward.coins,
    };
    if (reward.itemId && !next.unlockedAvatarItems.includes(reward.itemId)) {
      next.unlockedAvatarItems = [...next.unlockedAvatarItems, reward.itemId];
    }
    persist(next);
    trackHealthLabEvent("health_lab_treasure_open", childId, { coins: reward.coins });
    pushCelebrations([{ type: "treasure", payload: reward }]);
    return reward;
  }, [state, persist, childId, pushCelebrations]);

  const dismissCelebration = useCallback(() => {
    setPendingCelebrations((prev) => prev.slice(1));
  }, []);

  const reload = useCallback(() => {
    setState(ensureDailyQuests(loadHealthLabState(childId)));
  }, [childId]);

  return {
    state,
    view,
    setView,
    todayScore,
    recordSession,
    pendingCelebrations,
    dismissCelebration,
    reload,
    persist,
    buyShopItem,
    equipShopItem,
    claimDailySurprise,
    openTreasureChest,
    amyMessage: getAmyEncouragement(state.totalSessions),
  };
}
