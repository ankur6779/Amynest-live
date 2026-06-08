import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppNavigate } from "@/components/app-link";
import {
  Trophy, X, Coins, Gift, Plus, Trash2, Check,
} from "lucide-react";
import {
  GAMES, unlockGame, recordPlay,
  gamesPlayedToday, dailyLimit, amySuggestion, getSkillPercent,
  canPlayGame, ensureStarterUnlocks, getWeeklyGameSummary, getCachedRoutineStreak,
  requiresPremiumToPlay,
  getPerfectStreak, hasPerfectComboBadge, recordPerfectStreak, recordLeaderboardEntry,
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
import {
  getTotalPoints, addPoints, getRewards, saveRewards, redeemReward, getRedemptions,
  getNextAffordableReward,
  type Reward,
} from "@/lib/rewards";
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
  const [showRedeem, setShowRedeem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureStarterUnlocks();
    hubUsage.markFeatureUsed("hub_gaming_rewards");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track hub entry once per mount
  }, []);

  // Re-sync points whenever modals close
  useEffect(() => { setPoints(getTotalPoints()); }, [active, showRedeem, unlockedTick]);

  usePageBackHandler(() => {
    if (active) {
      setActive(null);
      return true;
    }
    if (showRedeem) {
      setShowRedeem(false);
      return true;
    }
    back("games-exit");
    return true;
  }, [active, showRedeem, back]);

  const playedToday = serverWallet?.gamesPlayedToday ?? gamesPlayedToday();
  const limit = serverWallet?.dailyLimit ?? dailyLimit(isPremium);
  const limitHit = playedToday >= limit;
  const suggestion = useMemo(() => amySuggestion(isPremium), [unlockedTick, active, isPremium]);
  const weekly = useMemo(() => getWeeklyGameSummary(), [unlockedTick, active]);
  const routineStreak = serverWallet?.routineStreakDays ?? getCachedRoutineStreak();
  const nextReward = useMemo(() => getNextAffordableReward(points), [points, unlockedTick, showRedeem]);
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
        onRedeem={() => setShowRedeem(true)}
        onRewardsShop={() => goTo("/rewards")}
        onUpgrade={() => goTo("/pricing")}
        onDevGrant={import.meta.env.DEV ? devGrantPoints : undefined}
      />

      <div className="hub-today-stack">
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
            nextReward={nextReward}
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
      {showRedeem && <RedeemModal onClose={() => setShowRedeem(false)} />}
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

// ─── Redeem modal (parent-defined rewards) ───────────────────────────
function RedeemModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [points, setPoints] = useState(getTotalPoints());
  const [rewards, setRewards] = useState<Reward[]>(getRewards());
  const [redemptions, setRedemptions] = useState(getRedemptions());
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCost, setNewCost] = useState<number>(50);
  const [newEmoji, setNewEmoji] = useState("🎁");
  const [msg, setMsg] = useState<string | null>(null);
  const [child, setChild] = useState("");

  const refresh = () => {
    setPoints(getTotalPoints());
    setRewards(getRewards());
    setRedemptions(getRedemptions());
  };

  const onRedeem = (r: Reward) => {
    setMsg(null);
    if (!child.trim()) { setMsg(t("screens.games.type_child_name")); return; }
    const ok = redeemReward(r, child.trim());
    if (!ok) setMsg(t("screens.games.not_enough_points", { label: r.label, cost: r.cost }));
    else setMsg(t("screens.games.redeemed_msg", { label: r.label, name: child.trim() }));
    refresh();
  };

  const onAdd = () => {
    if (!newLabel.trim() || newCost <= 0) return;
    const r: Reward = {
      id: "custom-" + Date.now(),
      label: newLabel.trim(),
      emoji: newEmoji || "🎁",
      cost: Math.round(newCost),
    };
    saveRewards([...rewards, r]);
    setShowAdd(false);
    setNewLabel(""); setNewCost(50); setNewEmoji("🎁");
    refresh();
  };

  const onDelete = (id: string) => {
    saveRewards(rewards.filter((r) => r.id !== id));
    refresh();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      background: gameTheme.overlay, backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: gameTheme.modalBg,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: "16px 20px 28px",
          color: gameTheme.text, maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={22} color="hsl(var(--brand-amber-300))" />
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: "Quicksand, sans-serif", fontWeight: 800 }}>{t("screens.games.reward_redemption")}</h3>
          </div>
          <button onClick={onClose} aria-label={t("screens.games.close")}
            style={{ color: gameTheme.textSoft, background: "rgba(122,92,255,0.15)", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(122,92,255,0.25)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", marginBottom: 12,
          border: `1px solid ${gameTheme.glassBorder}`,
        }}>
          <span style={{ fontSize: 13, color: gameTheme.textMuted }}>{t("screens.games.available_points")}</span>
          <span style={{ fontSize: 18, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Coins size={16} color="rgba(251,191,36,0.95)" /> {points}
          </span>
        </div>

        <input
          value={child}
          onChange={(e) => setChild(e.target.value)}
          placeholder={t("screens.games.child_name_placeholder")}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", color: gameTheme.text,
            border: `1px solid ${gameTheme.glassBorder}`, marginBottom: 12, fontSize: 13,
          }}
        />

        {msg && (
          <div style={{
            background: msg.startsWith("✨") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: "1px solid" + (msg.startsWith("✨") ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"),
            color: msg.startsWith("✨") ? "hsl(var(--brand-green-300))" : "hsl(var(--brand-red-300))",
            padding: "8px 12px", borderRadius: 10, fontSize: 13, marginBottom: 12,
          }}>{msg}</div>
        )}

        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {rewards.map((r) => {
            const can = points >= r.cost;
            return (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${gameTheme.glassBorder}`,
                borderRadius: 12, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 24 }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 11.5, color: gameTheme.textMuted }}>{t("screens.games.points_unit", { count: r.cost })}</div>
                </div>
                <button
                  onClick={() => onRedeem(r)}
                  disabled={!can}
                  style={{
                    background: can ? gameTheme.ctaGradient : "rgba(255,255,255,0.06)",
                    color: "#fff", border: "none", borderRadius: 999,
                    padding: "6px 14px", fontSize: 12, fontWeight: 700,
                    cursor: can ? "pointer" : "default", opacity: can ? 1 : 0.5,
                  }}
                >{t("screens.games.redeem_button")}</button>
                {r.id.startsWith("custom-") && (
                  <button onClick={() => onDelete(r.id)} aria-label={t("screens.games.delete_reward")}
                    style={{ background: "transparent", color: "hsl(var(--brand-red-300))", border: "none", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            style={{
              width: "100%", padding: "10px 0",
              background: "rgba(255,255,255,0.04)", color: gameTheme.textSoft,
              border: `1px dashed ${gameTheme.cardBorder}`, borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            <Plus size={14} /> {t("screens.games.add_parent_reward")}
          </button>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${gameTheme.glassBorder}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="🎁"
                style={{ width: 50, padding: "8px", textAlign: "center", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${gameTheme.glassBorder}`, color: gameTheme.text, fontSize: 20 }} />
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t("screens.games.label_placeholder")}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${gameTheme.glassBorder}`, color: gameTheme.text, fontSize: 13 }} />
              <input type="number" value={newCost} min={1}
                onChange={(e) => setNewCost(parseInt(e.target.value || "0", 10))}
                placeholder="50"
                style={{ width: 70, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${gameTheme.glassBorder}`, color: gameTheme.text, fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "transparent", color: gameTheme.textSoft, border: `1px solid ${gameTheme.glassBorder}`, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>{t("screens.games.cancel")}</button>
              <button onClick={onAdd} style={{ flex: 1, background: gameTheme.violetGradient, color: "#fff", border: "none", padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} /> {t("screens.games.save")}
              </button>
            </div>
          </div>
        )}

        {redemptions.length > 0 && (
          <details style={{ marginTop: 16, color: gameTheme.textMuted }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: gameTheme.textSoft }}>{t("screens.games.recent_redemptions", { count: redemptions.length })}</summary>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {redemptions.slice(0, 8).map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: gameTheme.textMuted, display: "flex", justifyContent: "space-between" }}>
                  <span>{r.rewardLabel} — {r.childName}</span>
                  <span>{t("screens.games.redemption_minus_pts", { cost: r.cost })}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
