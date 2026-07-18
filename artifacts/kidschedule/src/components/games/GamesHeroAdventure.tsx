import { Play } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GameDef } from "@/lib/games";
import { formatSkillTimeLine, getHeroMotivation } from "@/lib/game-hub-meta";
import { getAmyGreeting, getAmyHeroTip, getAmyLimitMessage } from "@/lib/game-amy-voice";
import { GAMES_GLASS_PANEL, gameTheme } from "@/lib/game-theme";
import { prefetchGame } from "@/components/games/game-loaders";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

interface GamesHeroAdventureProps {
  game: GameDef | undefined;
  canPlay: boolean;
  limitHit: boolean;
  playsRemaining: number;
  onPlay: () => void;
}

/**
 * Khan Kids pattern: one large Play CTA above the library.
 * Phase 4: Amy greeting, unified emoji badge, shared motion.
 */
export function GamesHeroAdventure({
  game,
  canPlay,
  limitHit,
  playsRemaining,
  onPlay,
}: GamesHeroAdventureProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const motivation = getHeroMotivation(game);
  const greeting = useMemo(() => getAmyGreeting(), []);
  const tip = useMemo(() => (limitHit ? getAmyLimitMessage() : getAmyHeroTip(game)), [game, limitHit]);

  return (
    <section
      aria-labelledby="games-hero-title"
      className={cn(
        GAMES_GLASS_PANEL,
        "relative overflow-hidden rounded-3xl",
        !reduced && "game-motion-enter",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 85% 20%, rgba(251,146,60,0.20), transparent 55%), radial-gradient(ellipse 70% 60% at 10% 90%, rgba(139,92,246,0.18), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="mx-auto w-full max-w-[200px] shrink-0 sm:mx-0 sm:max-w-[168px]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-[inset_0_1px_rgba(255,255,255,0.12)]">
            <img
              src="/illustrations/gaming-hub/gaming-hub-hero.png"
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={336}
              height={336}
            />
            {game && (
              <span className="absolute bottom-2 right-2">
                <GameEmojiBadge
                  emoji={game.emoji}
                  category={game.category}
                  size="sm"
                  label={`${game.title} icon`}
                />
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p
            className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-300/95"
            style={{ fontSize: gameTheme.type.label }}
          >
            {t("screens.games.hero_eyebrow", { defaultValue: "Today's Adventure" })}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold leading-snug text-violet-200/90">
            {greeting}
          </p>
          <h2
            id="games-hero-title"
            className="mt-1 font-quicksand font-extrabold leading-tight text-foreground"
            style={{ fontSize: gameTheme.type.hero }}
          >
            {game?.title ??
              t("screens.games.hero_fallback_title", { defaultValue: "Pick a game to start" })}
          </h2>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground/90">{motivation}</p>
          {game && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {formatSkillTimeLine(game)}
              {" · "}
              {game.blurb}
            </p>
          )}
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted-foreground/90">
            {tip}
          </p>

          <div className="mt-4 flex flex-col items-stretch gap-2 sm:items-start">
            <button
              type="button"
              disabled={!canPlay || !game}
              onMouseEnter={() => game && canPlay && prefetchGame(game.id)}
              onTouchStart={() => game && canPlay && prefetchGame(game.id)}
              onClick={onPlay}
              className={cn(
                "game-motion-press game-motion-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold text-white sm:w-auto sm:min-w-[200px]",
                "bg-gradient-to-r from-amber-400 to-orange-500",
                (!canPlay || !game) && "cursor-not-allowed opacity-50",
              )}
              style={canPlay && game ? { boxShadow: gameTheme.playShadow } : undefined}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {limitHit
                ? t("screens.games.limit_hit_short")
                : t("screens.games.hero_play_cta", { defaultValue: "Play now" })}
            </button>
            {!limitHit && playsRemaining > 0 && (
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("screens.games.daily_plays_remaining", { count: playsRemaining })}
              </p>
            )}
            {limitHit && (
              <p className="text-[11px] font-semibold text-amber-200/90">
                {t("screens.games.daily_plays_done")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
