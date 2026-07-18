import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppNavigate } from "@/components/app-link";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { X } from "lucide-react";
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
import { useSubscription } from "@/hooks/use-subscription";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useGamingWallet } from "@/hooks/use-gaming-wallet";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { unlockGamingGame } from "@/lib/gaming-wallet-api";
import { durableFinishGame, flushPendingPlaySync } from "@/lib/game-finish";
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
  /** Prevents double onFinish (spam / Strict Mode / rapid remount) from double-awarding. */
  const finishingRef = useRef(false);

  const { data: childProfiles = [] } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: false,
    },
  });

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

  const showGamingPreview = previewAgeMonths != null && isGamingHubPreviewAge(previewAgeMonths);

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
    setActive(null);
  }, [active]);

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
  const suggestion = useMemo(() => amySuggestion(isPremium), [unlockedTick, active, isPremium]);
  const weekly = useMemo(() => getWeeklyGameSummary(), [unlockedTick, active]);
  const routineStreak = serverWallet?.routineStreakDays ?? getCachedRoutineStreak();
  const adventureGame = useMemo(() => getAdventureGame(isPremium), [unlockedTick, active, isPremium]);
  const continueGames = useMemo(
    () => getContinuePlayingGames(isPremium, 6),
    [unlockedTick, active, isPremium],
  );
  const recommendedGames = useMemo(
    () =>
      getRecommendedGames(
        isPremium,
        continueGames.map((g) => g.id),
        6,
      ),
    [unlockedTick, active, isPremium, continueGames],
  );
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
    return (
      getNextBestSkillGame(isPremium, [active.game.id]) ??
      GAMES.find((g) => g.id !== active.game.id && canPlayGame(g, isPremium))
    );
  }, [active, isPremium, unlockedTick]);

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
      prefetchGame(g.id);
      // Age-aware mastery plan + adaptive Easy/Normal/Hard (local only).
      prepareGameSession(g.id, previewAgeMonths);
      setActive({ kind: "play", game: g, stage: "intro" });
    },
    [isPremium, limit, limitHit, previewAgeMonths, t],
  );

  const onStartPlay = useCallback(() => {
    setActive((prev) => {
      if (prev?.kind !== "play") return prev;
      prepareGameSession(prev.game.id, previewAgeMonths);
      return { kind: "play", game: prev.game, stage: "play" };
    });
  }, [previewAgeMonths]);

  const onUpgrade = useCallback(() => goTo("/pricing"), [goTo]);

  useEffect(() => {
    const adventureId = adventureGame?.id ?? suggestedGame?.id;
    return prefetchAdventureIdle(adventureId);
  }, [adventureGame?.id, suggestedGame?.id]);

  const finishGame = async (g: GameDef, score: number, total: number) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
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
    } finally {
      finishingRef.current = false;
    }
  };

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
          onFinish={(score, total) => {
            if (active.kind === "play") void finishGame(active.game, score, total);
          }}
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
            setActive(null);
          }}
        />
      )}
    </div>
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
