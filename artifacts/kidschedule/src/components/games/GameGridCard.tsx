import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Play, Zap } from "lucide-react";
import type { GameDef } from "@/lib/games";
import {
  canUnlockGameWithStreak,
  getGamePersonalBest,
  isFreeStarter,
  STREAK_UNLOCK_DAYS,
} from "@/lib/games";
import { formatSkillTimeLine } from "@/lib/game-hub-meta";
import { gameTileA11yLabel } from "@/lib/game-a11y";
import {
  GAMES_CATEGORY_ACCENT,
  GAMES_GLASS_PANEL,
  gameTheme,
} from "@/lib/game-theme";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";
import { GamePreviewTile } from "@/components/games/GamePreviewTile";
import { prefetchGame } from "@/components/games/game-loaders";
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
  /** grid = catalog; strip = Continue/Recommended carousel */
  layout?: "grid" | "strip";
}

/**
 * Card hierarchy (parent 3s scan + child one-tap):
 * Illustration → Title → Skill · time · age → blurb → Play
 * Points/rewards demoted — educational value first (Khan / Apple HIG).
 */
export const GameGridCard = memo(function GameGridCard({
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
  layout = "grid",
}: GameGridCardProps) {
  const { t } = useTranslation();
  const best = getGamePersonalBest(game.id);
  const accent = GAMES_CATEGORY_ACCENT[game.category] ?? GAMES_CATEGORY_ACCENT.brain;
  const interactive = !soon && (playable || premiumOnly || !unlocked);
  const strip = layout === "strip";
  const disabledByLimit = playable && limitHit;

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

  const a11yLabel = gameTileA11yLabel({
    title: game.title,
    skillLine: formatSkillTimeLine(game),
    blurb: game.blurb,
    playable,
    locked: showLock,
    premiumOnly,
    limitHit,
    soon,
    ageHint: game.ageHint,
  });

  const warmChunk = () => {
    if (playable && !soon) prefetchGame(game.id);
  };

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={a11yLabel}
      aria-disabled={disabledByLimit || soon || undefined}
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
      onMouseEnter={warmChunk}
      onFocus={warmChunk}
      onMouseDown={interactive ? onPressStart : undefined}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={
        interactive
          ? () => {
              warmChunk();
              onPressStart();
            }
          : undefined
      }
      onTouchEnd={onPressEnd}
      className={cn(
        GAMES_GLASS_PANEL,
        "game-motion-focus relative flex h-full flex-col rounded-2xl text-left",
        "transition-[transform,border-color,box-shadow] duration-[var(--game-motion-micro,180ms)] ease-[var(--game-ease-out,ease-out)]",
        strip ? "gap-2 p-3" : "gap-2.5 p-3.5",
        soon && "opacity-60",
        showLock && "opacity-90",
        interactive && "game-motion-press cursor-pointer",
        isPressed && "scale-[0.97]",
        playable && !soon && !limitHit && "hover:-translate-y-0.5 hover:border-amber-400/35",
      )}
    >
      {game.premiumOnly && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white">
          {t("screens.games.premium_game")}
        </span>
      )}
      {showLock && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/45 p-1.5" aria-hidden>
          <Lock className="h-3.5 w-3.5 text-amber-300" />
        </span>
      )}
      {isFreeStarter(game.id) && !isPremium && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-500/40 px-2 py-0.5 text-[9px] font-extrabold text-white">
          FREE
        </span>
      )}

      <div className={cn("flex", strip ? "justify-center" : "justify-start")}>
        {showLock || premiumOnly ? (
          <GamePreviewTile
            gameId={game.id}
            emoji={game.emoji}
            category={game.category}
            active
            muted={showLock}
          />
        ) : (
          <GameEmojiBadge
            emoji={game.emoji}
            category={game.category}
            size="md"
            float={playable && !soon}
            label={`${game.title} icon`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4
          className={cn(
            "font-quicksand font-extrabold leading-tight text-foreground",
            strip ? "text-[13px]" : "text-sm",
          )}
        >
          {game.title}
        </h4>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
              accent.chip,
            )}
          >
            {formatSkillTimeLine(game)}
          </span>
        </div>
        {!strip && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {game.blurb}
          </p>
        )}
        {best && !strip && (
          <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
            {t("screens.games.best_score", { pct: best.ratio })}
          </p>
        )}
      </div>

      <div className="mt-auto w-full pt-0.5">
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
});

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
      ? "border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-white"
      : tone === "violet"
        ? "border-violet-400/35 bg-violet-500/15 text-violet-100"
        : tone === "unlock"
          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/[0.04] text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border py-2 text-[12px] font-extrabold",
        toneClass,
        muted && "opacity-50",
      )}
      style={tone === "play" && !muted ? { boxShadow: gameTheme.playShadow } : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
