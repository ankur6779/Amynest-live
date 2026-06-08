import { useTranslation } from "react-i18next";
import { Lock, Play, Sparkles, Zap } from "lucide-react";
import type { GameDef } from "@/lib/games";
import {
  canUnlockGameWithStreak,
  getGamePersonalBest,
  isFreeStarter,
  STREAK_UNLOCK_DAYS,
} from "@/lib/games";
import {
  GAMES_CATEGORY_ACCENT,
  GAMES_GLASS_PANEL,
  gameTheme,
  gamesEmojiShell,
} from "@/lib/game-theme";
import { GamePreviewTile } from "@/components/games/GamePreviewTile";
import { hapticGameSuccess } from "@/lib/game-haptics";
import { cn } from "@/lib/utils";

interface GameGridCardProps {
  game: GameDef;
  playable: boolean;
  unlocked: boolean;
  soon: boolean;
  premiumOnly: boolean;
  showLock: boolean;
  limitHit: boolean;
  isPremium: boolean;
  isPressed: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onPlay: () => void;
  onUnlock: () => void;
  onUpgrade: () => void;
}

export function GameGridCard({
  game,
  playable,
  unlocked,
  soon,
  premiumOnly,
  showLock,
  limitHit,
  isPremium,
  isPressed,
  onPressStart,
  onPressEnd,
  onPlay,
  onUnlock,
  onUpgrade,
}: GameGridCardProps) {
  const { t } = useTranslation();
  const best = getGamePersonalBest(game.id);
  const accent = GAMES_CATEGORY_ACCENT[game.category] ?? GAMES_CATEGORY_ACCENT.brain;
  const interactive = !soon && (playable || premiumOnly || !unlocked);

  const handleAction = () => {
    void hapticGameSuccess(false);
    if (soon) return;
    if (premiumOnly) {
      onUpgrade();
      return;
    }
    if (playable) {
      if (!limitHit) onPlay();
      return;
    }
    onUnlock();
  };

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleAction : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleAction();
              }
            }
          : undefined
      }
      onMouseDown={interactive ? onPressStart : undefined}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={interactive ? onPressStart : undefined}
      onTouchEnd={onPressEnd}
      className={cn(
        GAMES_GLASS_PANEL,
        "relative flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center transition-all duration-200",
        soon && "opacity-60",
        showLock && "opacity-90",
        interactive && "cursor-pointer active:scale-[0.97]",
        isPressed && "scale-[0.97]",
        playable && !soon && !limitHit && "hover:-translate-y-0.5 hover:border-amber-400/40",
      )}
    >
      {game.premiumOnly && (
        <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
          {t("screens.games.premium_game")}
        </span>
      )}
      {showLock && (
        <span className="absolute right-2 top-2 rounded-full bg-black/45 p-1">
          <Lock className="h-3 w-3 text-amber-300" />
        </span>
      )}
      {isFreeStarter(game.id) && !isPremium && (
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500/40 px-2 py-0.5 text-[9px] font-extrabold text-white">
          FREE
        </span>
      )}

      {showLock || premiumOnly ? (
        <div className={showLock ? "grayscale-[0.45]" : undefined}>
          <GamePreviewTile gameId={game.id} emoji={game.emoji} active />
        </div>
      ) : (
        <div
          className={cn(
            gamesEmojiShell(game.category),
            playable && !soon && "games-card-float",
          )}
        >
          {game.emoji}
        </div>
      )}

      <div className="w-full min-w-0">
        <h4 className="font-quicksand text-[13px] font-extrabold leading-tight text-foreground">
          {game.title}
        </h4>
        {game.ageHint && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{game.ageHint}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
            accent.chip,
          )}
        >
          <Sparkles className="h-2.5 w-2.5" />
          {t("screens.games.reward_range", { min: game.rewardMin, max: game.rewardMax })}
        </span>
        {best && (
          <span className="text-[10px] font-semibold text-muted-foreground">
            {t("screens.games.best_score", { pct: best.ratio })}
          </span>
        )}
      </div>

      <div className="mt-auto w-full pt-1">
        {soon ? (
          <span className="text-[11px] font-bold text-amber-300">{t("screens.games.coming_soon")}</span>
        ) : premiumOnly ? (
          <ActionChip icon={Zap} label={t("screens.games.upgrade_short")} tone="violet" />
        ) : playable ? (
          <ActionChip
            icon={Play}
            label={limitHit ? t("screens.games.limit_hit_short") : t("screens.games.play")}
            tone={limitHit ? "muted" : "play"}
            muted={limitHit}
          />
        ) : (
          <ActionChip
            icon={Lock}
            label={
              canUnlockGameWithStreak()
                ? t("screens.games.unlock_streak_short", { days: STREAK_UNLOCK_DAYS })
                : t("screens.games.points_short", { cost: game.unlockCost })
            }
            tone="unlock"
          />
        )}
      </div>
    </article>
  );
}

function ActionChip({
  icon: Icon,
  label,
  tone,
  muted = false,
}: {
  icon: typeof Play;
  label: string;
  tone: "play" | "violet" | "unlock" | "muted";
  muted?: boolean;
}) {
  const toneClass =
    tone === "play"
      ? "border-amber-400/35 bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-white"
      : tone === "violet"
        ? "border-violet-400/35 bg-violet-500/15 text-violet-100"
        : tone === "unlock"
          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/[0.04] text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-full border py-1.5 text-[11px] font-bold",
        toneClass,
        muted && "opacity-50",
        tone === "play" && !muted && "shadow-[0_4px_12px_rgba(255,184,0,0.25)]",
      )}
      style={tone === "play" && !muted ? { boxShadow: gameTheme.playShadow } : undefined}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}
