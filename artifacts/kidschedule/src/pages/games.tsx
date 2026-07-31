import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppNavigate } from "@/components/app-link";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { X } from "lucide-react";
import { GameHubPlaybackContext } from "@/lib/game-hub-playback";
import {
  GAMES,
  unlockGame,
  gamesPlayedToday,
  dailyLimit,
  amySuggestion,
  getSkillPercent,
  canPlayGame,
  ensureStarterUnlocks,
  getWeeklyGameSummary,
  getCachedRoutineStreak,
  requiresPremiumToPlay,
  getPerfectStreak,
  hasPerfectComboBadge,
  recordPerfectStreak,
  recordLeaderboardEntry,
  isGameUnlockedForPlay,
  type GameDef,
  type GameCategory,
} from "@/lib/games";
import { gameTheme } from "@/lib/game-theme";
import { GAME_MOTION_STYLES } from "@/lib/game-motion";
import { GAME_A11Y_STYLES } from "@/lib/game-a11y";
import { GAME_PERF_STYLES } from "@/lib/game-perf";
import { getAmyContinueEmpty } from "@/lib/game-amy-voice";
import { useLowPowerClient } from "@/hooks/use-low-power-client";
import {
  getAdventureGame,
  getContinuePlayingGames,
  getNextBestSkillGame,
  getRecommendedGames,
} from "@/lib/game-hub-meta";
import { prepareGameSession } from "@/lib/game-adaptive-progression";
import { setGameDifficulty } from "@/lib/game-difficulty";
import { useSubscription } from "@/hooks/use-subscription";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import {
  beginGameSession,
  endGameSession,
  getLastGameRuntimeDecision,
  guidanceFromGameDecision,
  recordGameLevelCompleted,
  recordGameLevelStarted,
  sectionKeyForGameCategory,
} from "@/lib/games-world-learning-adapter";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useGamingWallet } from "@/hooks/use-gaming-wallet";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { unlockGamingGame } from "@/lib/gaming-wallet-api";
import {
  createPlayIdempotencyKey,
  durableFinishGame,
  flushPendingPlaySync,
} from "@/lib/game-finish";
import { hapticGameSuccess } from "@/lib/game-haptics";
import { getTotalPoints, addPoints } from "@/lib/rewards";
import { getLazyGame, prefetchAdventureIdle, prefetchGame } from "@/components/games/game-loaders";
import { GamePlayIntro } from "@/components/games/GamePlayIntro";
import { GameResultPanel } from "@/components/games/GameResultPanel";
import { GameChunkLoader } from "@/components/games/GameChunkLoader";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";
import { GamesDialogSurface } from "@/components/games/GamesDialogSurface";
import { GamesEmptyState } from "@/components/games/GamesEmptyState";
import { GamesExitConfirm } from "@/components/games/GamesExitConfirm";
import { GamesHeroAdventure } from "@/components/games/GamesHeroAdventure";
import { GamesHorizontalStrip } from "@/components/games/GamesHorizontalStrip";
import { GameCategorySection } from "@/components/games/GameCategorySection";
import { GamesInsightsPanel } from "@/components/games/GamesInsightsPanel";
import { GamesPageHeader } from "@/components/games/GamesPageHeader";
import { cn } from "@/lib/utils";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { isGamingHubPreviewAge } from "@/lib/hub-visibility";
import { markSuccessfulScreen } from "@/lib/crash-route-context";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

type ActiveGame =
  | { kind: "play"; game: GameDef; stage: "intro" | "play" }
  | {
      kind: "result";
      game: GameDef;
      score: number;
      total: number;
      pointsEarned: number;
      perfect: boolean;
    }
  | null;

export default function GamesPage() {
  const { t } = useTranslation();
  const { back, navigate: goTo } = useAppNavigate();
  const { isPremium } = useSubscription();
  const hubUsage = useFeatureUsage();
  const authFetch = useAuthFetch();
  const { isSignedIn } = useAuth();
  const { wallet: serverWallet, refresh: refreshWallet } = useGamingWallet();
  const [points, setPoints] = useState<number>(getTotalPoints());
  const [unlockedTick, setUnlockedTick] = useState(0);
  const [active, setActive] = useState<ActiveGame>(null);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lowPower = useLowPowerClient();
  const continueEmptyBody = useMemo(() => getAmyContinueEmpty(), []);
  /** Prevents concurrent finishGame calls while async work is in flight. */
  const finishingRef = useRef(false);
  /** One finish per play stage — blocks duplicate mastery, wallet, and analytics. */
  const playSessionRef = useRef<{
    gameId: string;
    idempotencyKey: string;
    finished: boolean;
  } | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const resetPlaySession = useCallback(() => {
    playSessionRef.current = null;
    finishingRef.current = false;
  }, []);

  const { data: childProfiles = [] } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: false,
    },
  });

  const activeChildId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    const child =
      (childProfiles as Array<{ id: number }>).find((c) => c.id === saved) ??
      (childProfiles[0] as { id: number } | undefined);
    return child?.id ?? null;
  }, [childProfiles]);

  const previewAgeMonths = useMemo(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    const child =
      (childProfiles as Array<{ id: number; age: number; ageMonths?: number | null }>).find(
        (c) => c.id === saved,
      ) ??
      (childProfiles[0] as { id: number; age: number; ageMonths?: number | null } | undefined);
    if (!child) return null;
    return child.age * 12 + (child.ageMonths ?? 0);
  }, [childProfiles]);

  const { recordActivity } = useRecordLearningActivity(activeChildId);
  const learningSessionIdRef = useRef<string | null>(null);

  const showGamingPreview = previewAgeMonths != null && isGamingHubPreviewAge(previewAgeMonths);

  useEffect(() => {
    markSuccessfulScreen("/games");
  }, []);

  useEffect(() => {
    if (showGamingPreview) return;
    ensureStarterUnlocks();
    hubUsage.markFeatureUsed("hub_gaming_rewards");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track hub entry once per mount
  }, [showGamingPreview]);

  // Best-effort drain of deferred play syncs when hub opens / comes online.
  useEffect(() => {
    if (showGamingPreview || !isSignedIn) return;
    void flushPendingPlaySync(authFetch).then((r) => {
      if (r.flushed > 0) void refreshWallet();
    });
    const onOnline = () => {
      void flushPendingPlaySync(authFetch).then((r) => {
        if (r.flushed > 0) void refreshWallet();
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [showGamingPreview, isSignedIn, authFetch, refreshWallet]);

  useEffect(() => {
    setPoints(getTotalPoints());
  }, [active, serverWallet, unlockedTick]);

  const requestCloseModal = useCallback(() => {
    if (active?.kind === "play" && active.stage === "play") {
      setExitConfirm(true);
      return;
    }
    setExitConfirm(false);
    resetPlaySession();
    setActive(null);
  }, [active, resetPlaySession]);

  usePageBackHandler(() => {
    if (exitConfirm) {
      setExitConfirm(false);
      return true;
    }
    if (active) {
      if (active.kind === "play" && active.stage === "play") {
        setExitConfirm(true);
        return true;
      }
      setActive(null);
      return true;
    }
    back("games-exit");
    return true;
  }, [active, back, exitConfirm]);

  const playedToday = serverWallet?.gamesPlayedToday ?? gamesPlayedToday();
  const limit = serverWallet?.dailyLimit ?? dailyLimit(isPremium);
  const limitHit = playedToday >= limit;
  const playsRemaining = Math.max(0, limit - playedToday);
  const runtimeGameGuidance = useMemo(() => {
    if (activeChildId == null) return null;
    return guidanceFromGameDecision(
      activeChildId,
      getLastGameRuntimeDecision(activeChildId),
    );
  }, [activeChildId, unlockedTick, active]);
  const suggestion = useMemo(() => {
    const preferredId = runtimeGameGuidance?.preferredGameIds[0];
    if (preferredId) {
      const g = GAMES.find((x) => x.id === preferredId);
      if (g && canPlayGame(g, isPremium)) {
        const reason =
          runtimeGameGuidance.recommendation?.reason ??
          runtimeGameGuidance.reason;
        return {
          gameId: preferredId,
          line: reason.startsWith("Amy")
            ? reason
            : `Amy suggests: ${g.title} — ${reason}`,
        };
      }
    }
    return amySuggestion(isPremium);
  }, [runtimeGameGuidance, isPremium, unlockedTick, active]);
  const weekly = useMemo(() => getWeeklyGameSummary(), [unlockedTick, active]);
  const routineStreak = serverWallet?.routineStreakDays ?? getCachedRoutineStreak();
  const adventureGame = useMemo(() => {
    const preferredId = runtimeGameGuidance?.preferredGameIds[0];
    if (preferredId) {
      const g = GAMES.find((x) => x.id === preferredId);
      if (g && canPlayGame(g, isPremium)) return g;
    }
    return getAdventureGame(isPremium);
  }, [runtimeGameGuidance, isPremium, unlockedTick, active]);
  const continueGames = useMemo(
    () => getContinuePlayingGames(isPremium, 6),
    [unlockedTick, active, isPremium],
  );
  const recommendedGames = useMemo(() => {
    const preferredIds = runtimeGameGuidance?.preferredGameIds ?? [];
    return getRecommendedGames(
      isPremium,
      continueGames.map((g) => g.id),
      6,
      preferredIds,
    );
  }, [unlockedTick, active, isPremium, continueGames, runtimeGameGuidance]);
  const nextUnlockGame = useMemo(
    () =>
      GAMES.filter(
        (game) =>
          game.status === "ready" &&
          !requiresPremiumToPlay(game) &&
          !isGameUnlockedForPlay(game.id, isPremium),
      ).sort((a, b) => a.unlockCost - b.unlockCost)[0] ?? null,
    [isPremium, serverWallet, unlockedTick],
  );
  const suggestedGame = suggestion.gameId
    ? GAMES.find((g) => g.id === suggestion.gameId)
    : undefined;

  const nextAfterResult = useMemo(() => {
    if (!active || active.kind !== "result") return undefined;
    if (activeChildId != null) {
      const guidance = guidanceFromGameDecision(
        activeChildId,
        getLastGameRuntimeDecision(activeChildId),
      );
      for (const id of guidance.preferredGameIds) {
        if (id === active.game.id) continue;
        const g = GAMES.find((x) => x.id === id);
        if (g && canPlayGame(g, isPremium)) return g;
      }
    }
    return (
      getNextBestSkillGame(isPremium, [active.game.id]) ??
      GAMES.find((g) => g.id !== active.game.id && canPlayGame(g, isPremium))
    );
  }, [active, activeChildId, isPremium, unlockedTick]);

  const devGrantPoints = () => {
    addPoints("DEV", "DEV: test grant", 1000);
    setPoints(getTotalPoints());
    setUnlockedTick((tick) => tick + 1);
  };

  const onUnlock = useCallback(
    async (g: GameDef) => {
      setError(null);
      if (requiresPremiumToPlay(g) && !isPremium) {
        setError(t("screens.games.premium_required"));
        return;
      }
      try {
        if (isSignedIn) {
          await unlockGamingGame(authFetch, g.id);
          setPoints(getTotalPoints());
          await refreshWallet();
        } else {
          const r = unlockGame(g.id, { isPremium });
          if (!r.ok) setError(r.reason ?? t("screens.games.could_not_unlock"));
          else setPoints(getTotalPoints());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("screens.games.could_not_unlock"));
      }
      setUnlockedTick((tick) => tick + 1);
    },
    [authFetch, isPremium, isSignedIn, refreshWallet, t],
  );

  const onPlay = useCallback(
    (g: GameDef) => {
      if (!canPlayGame(g, isPremium)) {
        if (requiresPremiumToPlay(g) && !isPremium) {
          setError(t("screens.games.premium_required"));
        }
        return;
      }
      if (limitHit) {
        setError(t("screens.games.limit_reached_msg", { count: limit }));
        return;
      }
      setError(null);
      resetPlaySession();
      prefetchGame(g.id);
      prepareGameSession(g.id, previewAgeMonths, {
        runtimeDifficulty: runtimeGameGuidance?.difficulty,
      });
      setActive({ kind: "play", game: g, stage: "intro" });
    },
    [isPremium, limit, limitHit, previewAgeMonths, resetPlaySession, runtimeGameGuidance, t],
  );

  const onStartPlay = useCallback(() => {
    setActive((prev) => {
      if (prev?.kind !== "play") return prev;
      prepareGameSession(prev.game.id, previewAgeMonths, {
        runtimeDifficulty: runtimeGameGuidance?.difficulty,
      });
      playSessionRef.current = {
        gameId: prev.game.id,
        idempotencyKey: createPlayIdempotencyKey(prev.game.id),
        finished: false,
      };
      finishingRef.current = false;
      if (activeChildId != null) {
        const began = beginGameSession({
          childId: activeChildId,
          gameId: prev.game.id,
          title: prev.game.title,
          category: prev.game.category,
        });
        learningSessionIdRef.current = began.sessionId;
        // Runtime difficulty overlays local presentation band (no mastery engine here).
        setGameDifficulty(began.uiDifficulty);
        recordGameLevelStarted({
          childId: activeChildId,
          sessionId: began.sessionId,
          gameId: prev.game.id,
          category: prev.game.category,
        });
      }
      return { kind: "play", game: prev.game, stage: "play" };
    });
  }, [activeChildId, previewAgeMonths, runtimeGameGuidance]);

  const onUpgrade = useCallback(() => goTo("/pricing"), [goTo]);

  useEffect(() => {
    const adventureId = adventureGame?.id ?? suggestedGame?.id;
    return prefetchAdventureIdle(adventureId);
  }, [adventureGame?.id, suggestedGame?.id]);

  const finishGame = useCallback(
    async (g: GameDef, score: number, total: number) => {
      const session = playSessionRef.current;
      if (!session || session.gameId !== g.id || session.finished) return;
      if (finishingRef.current) return;

      finishingRef.current = true;
      session.finished = true;

      try {
        const ratio = total === 0 ? 0 : score / total;
        const perfect = ratio >= 0.95;
        recordPerfectStreak(perfect);
        recordLeaderboardEntry(g.id, score, total);
        const earnedEstimate = perfect
          ? g.rewardMax
          : Math.max(g.rewardMin, Math.round(g.rewardMin + (g.rewardMax - g.rewardMin) * ratio));

        // Never fail-closed: result + mastery always; wallet sync best-effort + idempotent.
        const out = await durableFinishGame({
          gameId: g.id,
          score,
          total,
          perfect,
          pointsEarned: earnedEstimate,
          isSignedIn,
          authFetch: isSignedIn ? authFetch : undefined,
          idempotencyKey: session.idempotencyKey,
        });
        void hapticGameSuccess(out.perfect);
        if (!out.syncPending && isSignedIn) {
          void refreshWallet();
        } else if (out.syncPending) {
          setError(
            t("screens.games.sync_pending_msg", {
              defaultValue: "Saved on this device. We’ll sync when you’re back online.",
            }),
          );
        }
        setPoints(getTotalPoints());
        setActive({
          kind: "result",
          game: g,
          score,
          total,
          pointsEarned: out.pointsEarned,
          perfect: out.perfect,
        });
        setUnlockedTick((tick) => tick + 1);

        if (activeChildId != null) {
          const guidance = recordGameLevelCompleted({
            childId: activeChildId,
            sessionId: learningSessionIdRef.current ?? undefined,
            gameId: g.id,
            title: g.title,
            category: g.category,
            score,
            total,
            perfect: out.perfect,
            isChallenge: out.perfect,
          });
          endGameSession({
            childId: activeChildId,
            sessionId: learningSessionIdRef.current ?? undefined,
            gameId: g.id,
            levelsCompleted: 1,
          });
          learningSessionIdRef.current = null;
          void recordActivity({
            activityId: `game_${g.id}_${Date.now()}`,
            section: sectionKeyForGameCategory(g.category),
            correct: ratio >= 0.5,
            analyticsEvent: "session_completed",
            metadata: {
              gameId: g.id,
              category: g.category,
              score,
              total,
              runtimeRuleId: guidance.ruleId,
              celebrationLevel: guidance.celebrationLevel,
              rewardPriority: guidance.rewardPriority,
              surface: "games_hub",
              learningSection: "games",
            },
          });
          if (guidance.difficulty !== "same") {
            setGameDifficulty(
              guidance.difficulty === "easier"
                ? "easy"
                : guidance.difficulty === "harder"
                  ? "hard"
                  : "normal",
            );
          }
        }
      } finally {
        finishingRef.current = false;
      }
    },
    [activeChildId, authFetch, isSignedIn, recordActivity, refreshWallet, t],
  );

  const handleGameFinish = useCallback(
    (score: number, total: number) => {
      const current = activeRef.current;
      if (current?.kind !== "play" || current.stage !== "play") return;
      void finishGame(current.game, score, total);
    },
    [finishGame],
  );

  const gamesByCategory = useMemo(() => {
    const order: GameCategory[] = [
      "brain",
      "memory",
      "math",
      "focus",
      "creativity",
      "behavior",
      "action",
      "puzzle",
    ];
    const map = new Map<GameCategory, GameDef[]>();
    for (const g of GAMES) {
      if (!map.has(g.category)) map.set(g.category, []);
      map.get(g.category)!.push(g);
    }
    return order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, []);

  const skillCats: GameCategory[] = ["brain", "memory", "math", "focus", "behavior", "action"];
  const skills = skillCats.map((c) => ({ cat: c, pct: getSkillPercent(c) }));
  const dailyPct = limit > 0 ? Math.min(100, (playedToday / limit) * 100) : 0;
  const perfectStreak = getPerfectStreak();
  const showComboBadge = hasPerfectComboBadge();
  const hubFrozen = active != null;
  const hubPlayback = useMemo(() => ({ hubFrozen }), [hubFrozen]);

  if (showGamingPreview) {
    const previewItems = ["games", "rewards", "insights"] as const;

    return (
      <div
        className={cn(PARENT_HUB_PAGE, "mx-auto max-w-[720px]")}
        style={{
          minHeight: "100dvh",
          color: gameTheme.text,
          paddingBottom: 80,
        }}
      >
        <header className="hub-page-enter sticky top-0 z-30 border-b border-white/10 bg-[#09152b]/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => back("games-exit")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-bold text-white/85"
          >
            {t("screens.games.back")}
          </button>
        </header>

        <main className="hub-page-enter mx-auto max-w-[720px] space-y-4 px-4 pt-4">
          <InfantExplorePreviewBanner messageKey="parent_hub.web_tiles.gaming-rewards.preview_banner" />
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
              {t("parent_hub.explore_next.cta_preview")}
            </p>
            <h1 className="mt-2 font-quicksand text-2xl font-black text-white">
              {t("parent_hub.web_tiles.gaming-rewards.preview_title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("parent_hub.web_tiles.gaming-rewards.preview_body")}
            </p>
          </section>

          <div className="grid gap-3">
            {previewItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85"
              >
                {t(`parent_hub.web_tiles.gaming-rewards.preview_items.${item}`)}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <GameHubPlaybackContext.Provider value={hubPlayback}>
      <div
        className={cn(
          PARENT_HUB_PAGE,
          "game-a11y-root game-a11y-tablet-pad mx-auto max-w-[720px]",
          lowPower && "game-perf-low",
        )}
        style={{
          minHeight: "100dvh",
          color: gameTheme.text,
          paddingBottom: 80,
        }}
      >
        <style>{`${GAME_MOTION_STYLES}\n${GAME_A11Y_STYLES}\n${GAME_PERF_STYLES}`}</style>
        {/*
          Unmount the entire hub catalog while a game/result modal is open.
          Freezing via CSS was not enough — React trees + preview intervals still cost CPU.
        */}
        {!hubFrozen && (
          <>
            <a href="#games-main" className="game-a11y-skip">
              {t("screens.games.skip_to_games", { defaultValue: "Skip to games" })}
            </a>
            <GamesPageHeader
              points={points}
              showComboBadge={showComboBadge}
              perfectStreak={perfectStreak}
              isPremium={isPremium}
              onBack={() => back("games-exit")}
              onUpgrade={onUpgrade}
              onDevGrant={import.meta.env.DEV ? devGrantPoints : undefined}
            />

            <main id="games-main" className="hub-today-stack" tabIndex={-1}>
              <div className="hub-page-enter mx-auto max-w-[720px] space-y-4 px-4 pb-1 pt-4">
                <GamesHeroAdventure
                  game={adventureGame ?? suggestedGame}
                  canPlay={!!(adventureGame && canPlayGame(adventureGame, isPremium) && !limitHit)}
                  limitHit={limitHit}
                  playsRemaining={playsRemaining}
                  onPlay={() => adventureGame && onPlay(adventureGame)}
                />

                <GamesHorizontalStrip
                  title={t("screens.games.continue_title")}
                  subtitle={t("screens.games.continue_subtitle")}
                  games={continueGames}
                  isPremium={isPremium}
                  limitHit={limitHit}
                  onPlay={onPlay}
                  onUnlock={onUnlock}
                  onUpgrade={onUpgrade}
                  empty={
                    <GamesEmptyState
                      emoji="🛤️"
                      title={t("screens.games.continue_empty_title", {
                        defaultValue: "Your trail starts here",
                      })}
                      body={continueEmptyBody}
                    />
                  }
                />

                <GamesHorizontalStrip
                  title={t("screens.games.recommended_title")}
                  subtitle={t("screens.games.recommended_subtitle")}
                  games={recommendedGames}
                  isPremium={isPremium}
                  limitHit={limitHit}
                  onPlay={onPlay}
                  onUnlock={onUnlock}
                  onUpgrade={onUpgrade}
                  empty={
                    <GamesEmptyState
                      emoji="🌟"
                      title={t("screens.games.recommended_empty_title", {
                        defaultValue: "Unlock a starter to begin",
                      })}
                      body={t("screens.games.recommended_empty_body", {
                        defaultValue: "Play today’s adventure — Amy will suggest more games next.",
                      })}
                    />
                  }
                />
              </div>

              {error && (
                <div className="hub-page-enter mx-auto max-w-[720px] px-4 pt-3">
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2.5 text-sm text-amber-100"
                    role="alert"
                  >
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="shrink-0 border-none bg-transparent text-amber-100"
                      aria-label={t("screens.games.close")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="hub-page-enter mx-auto max-w-[720px] px-4 pb-0 pt-4">
                <div className="mb-3">
                  <h2 className="font-quicksand text-lg font-extrabold text-foreground">
                    {t("screens.games.browse_title")}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("screens.games.browse_subtitle")}</p>
                </div>
                {gamesByCategory.map(([cat, list]) => (
                  <GameCategorySection
                    key={cat}
                    category={cat}
                    games={list}
                    isPremium={isPremium}
                    limitHit={limitHit}
                    onPlay={onPlay}
                    onUnlock={onUnlock}
                    onUpgrade={onUpgrade}
                  />
                ))}
              </div>

              <div className="hub-page-enter mx-auto max-w-[720px] px-4 pb-2 pt-2">
                <GamesInsightsPanel
                  skills={skills}
                  isPremium={isPremium}
                  weekly={weekly}
                  collapsible
                  status={{
                    playedToday,
                    limit,
                    limitHit,
                    dailyPct,
                    routineStreak,
                    perfectStreak,
                    showComboBadge,
                    points,
                    nextUnlockGame,
                  }}
                />
              </div>
            </main>
          </>
        )}

        {active && (
          <GameModal
            state={active}
            nextGame={nextAfterResult}
            canPlayAgain={!limitHit && canPlayGame(active.game, isPremium)}
            canPlayNext={
              !!nextAfterResult && !limitHit && canPlayGame(nextAfterResult, isPremium)
            }
            onClose={requestCloseModal}
            onStartPlay={onStartPlay}
            onFinish={handleGameFinish}
            onPlayAgain={() => {
              if (active.kind === "result") onPlay(active.game);
            }}
            onPlayNext={() => {
              if (nextAfterResult) onPlay(nextAfterResult);
            }}
          />
        )}

        {exitConfirm && active?.kind === "play" && (
          <GamesExitConfirm
            gameTitle={active.game.title}
            onKeepPlaying={() => setExitConfirm(false)}
            onLeave={() => {
              setExitConfirm(false);
              resetPlaySession();
              setActive(null);
            }}
          />
        )}
      </div>
    </GameHubPlaybackContext.Provider>
  );
}

function GameModal({
  state,
  nextGame,
  canPlayAgain,
  canPlayNext,
  onClose,
  onStartPlay,
  onFinish,
  onPlayAgain,
  onPlayNext,
}: {
  state: NonNullable<ActiveGame>;
  nextGame?: GameDef;
  canPlayAgain: boolean;
  canPlayNext: boolean;
  onClose: () => void;
  onStartPlay: () => void;
  onFinish: (score: number, total: number) => void;
  onPlayAgain: () => void;
  onPlayNext: () => void;
}) {
  const { t } = useTranslation();
  const game = state.game;
  const LazyGame = state.kind === "play" && state.stage === "play" ? getLazyGame(game.id) : null;
  const showChrome =
    state.kind === "result" || (state.kind === "play" && state.stage === "play");

  return (
    <GamesDialogSurface
      ariaLabel={game.title}
      onClose={onClose}
      solidBackdrop
      title={showChrome ? game.title : undefined}
      subtitle={state.kind === "play" && state.stage === "play" ? game.blurb : undefined}
      leading={
        showChrome ? (
          <GameEmojiBadge emoji={game.emoji} category={game.category} size="sm" />
        ) : undefined
      }
    >
      {state.kind === "play" && state.stage === "intro" && (
        <GamePlayIntro game={game} onStart={onStartPlay} />
      )}

      {state.kind === "play" && state.stage === "play" && (
        <div style={{ paddingTop: 6 }}>
          <Suspense fallback={<GameChunkLoader salt={game.title.length} />}>
            {LazyGame ? (
              <LazyGame onFinish={onFinish} />
            ) : (
              <GamesEmptyState
                emoji="⏳"
                title={t("screens.games.coming_soon")}
                body={t("screens.games.loading_game", { defaultValue: "Getting ready…" })}
              />
            )}
          </Suspense>
        </div>
      )}

      {state.kind === "result" && (
        <GameResultPanel
          game={state.game}
          score={state.score}
          total={state.total}
          pointsEarned={state.pointsEarned}
          perfect={state.perfect}
          nextGame={nextGame}
          canPlayAgain={canPlayAgain}
          canPlayNext={canPlayNext}
          onPlayAgain={onPlayAgain}
          onPlayNext={onPlayNext}
          onDone={onClose}
        />
      )}
    </GamesDialogSurface>
  );
}
