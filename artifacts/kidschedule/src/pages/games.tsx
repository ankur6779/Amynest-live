import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppNavigate } from "@/components/app-link";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import {
  Trophy, X, Coins,
} from "lucide-react";
import {
  GAMES, unlockGame, recordPlay,
  gamesPlayedToday, dailyLimit, amySuggestion, getSkillPercent,
  canPlayGame, ensureStarterUnlocks, getWeeklyGameSummary, getCachedRoutineStreak,
  requiresPremiumToPlay,
  getPerfectStreak, hasPerfectComboBadge, recordPerfectStreak, recordLeaderboardEntry,
  isGameUnlockedForPlay,
  type GameDef, type GameCategory,
} from "@/lib/games";
import { gameTheme } from "@/lib/game-theme";
import { useSubscription } from "@/hooks/use-subscription";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { useGamingWallet } from "@/hooks/use-gaming-wallet";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { unlockGamingGame, recordGamingPlay } from "@/lib/gaming-wallet-api";
import { hapticGameSuccess } from "@/lib/game-haptics";
import { getTotalPoints, addPoints } from "@/lib/rewards";
import { PatternMatchGame } from "@/components/games/PatternMatch";
import { OddOneOutGame } from "@/components/games/OddOneOut";
import { CardFlipGame } from "@/components/games/CardFlip";
import { SequenceMemoryGame } from "@/components/games/SequenceMemory";
import { BehaviorChoiceGame } from "@/components/games/BehaviorChoice";
import { SpeedMathGame } from "@/components/games/SpeedMath";
import { NumberMatchGame } from "@/components/games/NumberMatch";
import { FindMistakeGame } from "@/components/games/FindMistake";
import { ColorMemoryGame } from "@/components/games/ColorMemory";
import { TargetTapGame } from "@/components/games/TargetTap";
import { MazeEscapeGame } from "@/components/games/MazeEscape";
import { ShapeMatchingGame } from "@/components/games/ShapeMatching";
import { ColorFillGame } from "@/components/games/ColorFill";
import { HiddenObjectsGame } from "@/components/games/HiddenObjects";
import { SpotTheDifferenceGame } from "@/components/games/SpotTheDifference";
import { AmySuggestionPanel } from "@/components/games/AmySuggestionPanel";
import { GameCategorySection } from "@/components/games/GameCategorySection";
import { GamesInsightsPanel } from "@/components/games/GamesInsightsPanel";
import { GamesPageHeader } from "@/components/games/GamesPageHeader";
import { GamesStatusCard } from "@/components/games/GamesStatusCard";
import { ConfettiBurst } from "@/components/study-engagement";
import { AnimatedPoints } from "@/components/games/AnimatedPoints";
import { cn } from "@/lib/utils";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { isGamingHubPreviewAge } from "@/lib/hub-visibility";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

type ActiveGame =
  | { kind: "play"; game: GameDef }
  | { kind: "result"; game: GameDef; score: number; total: number; pointsEarned: number; perfect: boolean }
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
  const [error, setError] = useState<string | null>(null);

  const { data: childProfiles = [] } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: false,
    },
  });

  const previewAgeMonths = useMemo(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    const child = (childProfiles as Array<{ id: number; age: number; ageMonths?: number | null }>)
      .find((c) => c.id === saved) ?? (childProfiles[0] as { id: number; age: number; ageMonths?: number | null } | undefined);
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

  // Re-sync after game results, unlocks, and signed-in wallet hydration.
  useEffect(() => { setPoints(getTotalPoints()); }, [active, serverWallet, unlockedTick]);

  usePageBackHandler(() => {
    if (active) {
      setActive(null);
      return true;
    }
    back("games-exit");
    return true;
  }, [active, back]);

  const playedToday = serverWallet?.gamesPlayedToday ?? gamesPlayedToday();
  const limit = serverWallet?.dailyLimit ?? dailyLimit(isPremium);
  const limitHit = playedToday >= limit;
  const suggestion = useMemo(() => amySuggestion(isPremium), [unlockedTick, active, isPremium]);
  const weekly = useMemo(() => getWeeklyGameSummary(), [unlockedTick, active]);
  const routineStreak = serverWallet?.routineStreakDays ?? getCachedRoutineStreak();
  const nextUnlockGame = useMemo(
    () =>
      GAMES
        .filter((game) =>
          game.status === "ready" &&
          !requiresPremiumToPlay(game) &&
          !isGameUnlockedForPlay(game.id, isPremium)
        )
        .sort((a, b) => a.unlockCost - b.unlockCost)[0] ?? null,
    [isPremium, serverWallet, unlockedTick],
  );
  const suggestedGame = suggestion.gameId
    ? GAMES.find((g) => g.id === suggestion.gameId)
    : undefined;

  const devGrantPoints = () => {
    addPoints("DEV", "DEV: test grant", 1000);
    setPoints(getTotalPoints());
    setUnlockedTick((tick) => tick + 1);
  };

  const onUnlock = async (g: GameDef) => {
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
  };

  const onPlay = (g: GameDef) => {
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
    setActive({ kind: "play", game: g });
  };

  const onPlaySuggested = () => {
    if (suggestedGame) onPlay(suggestedGame);
  };

  const finishGame = async (g: GameDef, score: number, total: number) => {
    const ratio = total === 0 ? 0 : score / total;
    const perfect = ratio >= 0.95;
    recordPerfectStreak(perfect);
    recordLeaderboardEntry(g.id, score, total);
    let earned = perfect
      ? g.rewardMax
      : Math.max(g.rewardMin, Math.round(g.rewardMin + (g.rewardMax - g.rewardMin) * ratio));
    try {
      if (isSignedIn) {
        const out = await recordGamingPlay(authFetch, { gameId: g.id, score, total });
        earned = out.pointsEarned;
        void hapticGameSuccess(out.perfect);
        await refreshWallet();
      } else {
        recordPlay(g.id, score, total, perfect, earned);
        void hapticGameSuccess(perfect);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("screens.games.limit_reached_msg", { count: limit }));
      setActive(null);
      return;
    }
    setPoints(getTotalPoints());
    setActive({ kind: "result", game: g, score, total, pointsEarned: earned, perfect });
    setUnlockedTick((tick) => tick + 1);
  };

  // Group games by category for the grid
  const gamesByCategory = useMemo(() => {
    const order: GameCategory[] = ["brain", "memory", "math", "focus", "creativity", "behavior", "action", "puzzle"];
    const map = new Map<GameCategory, GameDef[]>();
    for (const g of GAMES) {
      if (!map.has(g.category)) map.set(g.category, []);
      map.get(g.category)!.push(g);
    }
    return order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, []);

  // Skills (re-read on every render via tick)
  const skillCats: GameCategory[] = ["brain", "memory", "math", "focus", "behavior", "action"];
  const skills = skillCats.map((c) => ({ cat: c, pct: getSkillPercent(c) }));
  const dailyPct = limit > 0 ? Math.min(100, (playedToday / limit) * 100) : 0;
  const perfectStreak = getPerfectStreak();
  const showComboBadge = hasPerfectComboBadge();

  if (showGamingPreview) {
    const previewItems = ["games", "rewards", "insights"] as const;

    return (
      <div className={cn(PARENT_HUB_PAGE, "mx-auto max-w-[720px]")} style={{
        minHeight: "100dvh",
        color: gameTheme.text,
        paddingBottom: 80,
      }}>
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
    <div className={cn(PARENT_HUB_PAGE, "mx-auto max-w-[720px]")} style={{
      minHeight: "100dvh",
      color: gameTheme.text,
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes gamesCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .games-card-float {
          animation: gamesCardFloat 1.6s ease-in-out infinite;
        }
      `}</style>
      <GamesPageHeader
        points={points}
        showComboBadge={showComboBadge}
        perfectStreak={perfectStreak}
        isPremium={isPremium}
        onBack={() => back("games-exit")}
        onUpgrade={() => goTo("/pricing")}
        onDevGrant={import.meta.env.DEV ? devGrantPoints : undefined}
      />

      <div className="hub-today-stack">
        {showGamingPreview ? (
          <div className="hub-page-enter mx-auto max-w-[720px] px-4 pt-4">
            <InfantExplorePreviewBanner messageKey="parent_hub.web_tiles.gaming-rewards.preview_banner" />
          </div>
        ) : null}
        <div className="hub-page-enter mx-auto max-w-[720px] space-y-3 px-4 pb-1 pt-4">
          <GamesStatusCard
            playedToday={playedToday}
            limit={limit}
            limitHit={limitHit}
            dailyPct={dailyPct}
            isPremium={isPremium}
            routineStreak={routineStreak}
            perfectStreak={perfectStreak}
            showComboBadge={showComboBadge}
            points={points}
            nextUnlockGame={nextUnlockGame}
          />
          <AmySuggestionPanel
            line={suggestion.line}
            suggestedGame={suggestedGame}
            canPlay={!!(suggestedGame && canPlayGame(suggestedGame, isPremium) && !limitHit)}
            onPlay={onPlaySuggested}
          />
        </div>

        <div className="hub-page-enter mx-auto max-w-[720px] px-4 pt-3">
          <GamesInsightsPanel skills={skills} isPremium={isPremium} weekly={weekly} />
        </div>

        {error && (
          <div className="hub-page-enter mx-auto max-w-[720px] px-4 pt-3">
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-200"
              role="alert"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 border-none bg-transparent text-red-200"
                aria-label={t("screens.games.close")}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="hub-page-enter mx-auto max-w-[720px] px-4 pb-0 pt-4">
          {gamesByCategory.map(([cat, list]) => (
            <GameCategorySection
              key={cat}
              category={cat}
              games={list}
              isPremium={isPremium}
              limitHit={limitHit}
              onPlay={onPlay}
              onUnlock={onUnlock}
              onUpgrade={() => goTo("/pricing")}
            />
          ))}
        </div>
      </div>

      {/* Active game / result modal */}
      {active && (
        <GameModal
          state={active}
          onClose={() => setActive(null)}
          onFinish={(score, total) => active.kind === "play" && finishGame(active.game, score, total)}
        />
      )}
    </div>
  );
}

// ─── Game modal ──────────────────────────────────────────────────────
function GameModal({
  state, onClose, onFinish,
}: { state: NonNullable<ActiveGame>; onClose: () => void; onFinish: (score: number, total: number) => void }) {
  const { t } = useTranslation();
  const game = state.game;
  const confettiTrigger = state.kind === "result" && state.perfect ? 1 : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: gameTheme.overlay, backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: gameTheme.modalBg,
          borderRadius: 24, padding: "16px 18px 22px",
          color: gameTheme.text, boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
          maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 26 }}>{game.emoji}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: "Quicksand, sans-serif" }}>{game.title}</h3>
              <div style={{ fontSize: 11, color: "#a99fd9" }}>{game.blurb}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label={t("screens.games.close")}
            style={{ color: gameTheme.textSoft, background: "rgba(122,92,255,0.15)", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(122,92,255,0.25)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {state.kind === "play" && (
          <div style={{ paddingTop: 6 }}>
            {game.id === "pattern-match" && <PatternMatchGame onFinish={onFinish} />}
            {game.id === "odd-one-out" && <OddOneOutGame onFinish={onFinish} />}
            {game.id === "card-flip" && <CardFlipGame onFinish={onFinish} />}
            {game.id === "sequence" && <SequenceMemoryGame onFinish={onFinish} />}
            {game.id === "color-memory" && <ColorMemoryGame onFinish={onFinish} />}
            {game.id === "speed-math" && <SpeedMathGame onFinish={onFinish} />}
            {game.id === "number-match" && <NumberMatchGame onFinish={onFinish} />}
            {game.id === "find-mistake" && <FindMistakeGame onFinish={onFinish} />}
            {game.id === "target-tap" && <TargetTapGame onFinish={onFinish} />}
            {game.id === "what-should-you-do" && <BehaviorChoiceGame onFinish={onFinish} />}
            {game.id === "maze-escape" && <MazeEscapeGame onFinish={onFinish} />}
            {game.id === "shape-match" && <ShapeMatchingGame onFinish={onFinish} />}
            {game.id === "color-fill" && <ColorFillGame onFinish={onFinish} />}
            {game.id === "hidden-objects" && <HiddenObjectsGame onFinish={onFinish} />}
            {game.id === "spot-difference" && <SpotTheDifferenceGame onFinish={onFinish} />}
          </div>
        )}

        {state.kind === "result" && (
          <div className="relative text-center" style={{ padding: "8px 4px 0" }}>
            <ConfettiBurst trigger={confettiTrigger} />
            <Trophy size={48} color={state.perfect ? "hsl(var(--brand-amber-300))" : "hsl(var(--brand-violet-300))"} style={{ margin: "12px auto" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 20, fontFamily: "Quicksand, sans-serif", fontWeight: 800 }}>
              {state.perfect ? t("screens.games.perfect_score") : t("screens.games.nice_work")}
            </h3>
            <p style={{ color: "#c7c0e8", fontSize: 14, margin: "0 0 14px" }}>
              {t("screens.games.you_scored")} <strong>{state.score} / {state.total}</strong>.
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: gameTheme.ctaGradient,
              color: "#fff", padding: "10px 18px", borderRadius: 999,
              fontSize: 15, fontWeight: 800,
              boxShadow: gameTheme.playShadow,
              marginBottom: 16,
            }}>
              <Coins size={16} />
              +<AnimatedPoints value={state.pointsEarned} /> {t("screens.games.points_hero_label")}
              {state.perfect && <span style={{ fontSize: 11, opacity: 0.85 }}>{t("screens.games.perfect_bonus")}</span>}
            </div>
            <div>
              <button
                onClick={onClose}
                style={{
                  background: gameTheme.playGradient,
                  color: "#fff", border: "none", borderRadius: 999,
                  padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: gameTheme.playShadow,
                }}
              >{t("screens.games.done")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

