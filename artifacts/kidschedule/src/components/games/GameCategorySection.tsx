import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORY_BLURB,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  canPlayGame,
  isGameUnlockedForPlay,
  requiresPremiumToPlay,
  type GameCategory,
  type GameDef,
} from "@/lib/games";
import { gamesCategoryBar } from "@/lib/game-theme";
import { GameGridCard } from "@/components/games/GameGridCard";
import { cn } from "@/lib/utils";

interface GameCategorySectionProps {
  category: GameCategory;
  games: GameDef[];
  isPremium: boolean;
  limitHit: boolean;
  onPlay: (game: GameDef) => void;
  onUnlock: (game: GameDef) => void;
  onUpgrade: () => void;
}

/**
 * Catalog stays 2-column grid (Khan library / Apple browse density).
 * Horizontal carousels are reserved for Continue/Recommended only —
 * mixing both reduces scroll fatigue without hiding the full set.
 */
export function GameCategorySection({
  category,
  games,
  isPremium,
  limitHit,
  onPlay,
  onUnlock,
  onUpgrade,
}: GameCategorySectionProps) {
  const { t } = useTranslation();
  const [pressedId, setPressedId] = useState<string | null>(null);
  const oddLast = games.length % 2 === 1;

  return (
    <section
      className="game-perf-contain mb-7"
      aria-labelledby={`games-cat-${category}`}
    >
      <div className="mb-3.5 flex items-stretch gap-2.5">
        <div className={gamesCategoryBar(category)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg" aria-hidden>
              {CATEGORY_EMOJI[category]}
            </span>
            <h3
              id={`games-cat-${category}`}
              className="font-quicksand text-[13px] font-extrabold tracking-wide text-foreground"
            >
              {CATEGORY_LABEL[category]}
            </h3>
            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
              {t("screens.games.games_count", { count: games.length })}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {CATEGORY_BLURB[category]}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-3",
          oddLast &&
            "[&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:w-full [&>*:last-child]:max-w-[calc(50%-6px)]",
        )}
      >
        {games.map((g) => {
          const playable = canPlayGame(g, isPremium);
          const unlocked = isGameUnlockedForPlay(g.id, isPremium);
          const soon = g.status === "soon";
          const premiumOnly = requiresPremiumToPlay(g) && !isPremium;
          const showLock = !unlocked && !soon && !premiumOnly;

          return (
            <GameGridCard
              key={g.id}
              game={g}
              playable={playable}
              unlocked={unlocked}
              soon={soon}
              premiumOnly={premiumOnly}
              showLock={showLock}
              limitHit={limitHit}
              isPremium={isPremium}
              isPressed={pressedId === g.id}
              onPressStart={() => setPressedId(g.id)}
              onPressEnd={() => setPressedId(null)}
              onPlay={() => onPlay(g)}
              onUnlock={() => onUnlock(g)}
              onUpgrade={onUpgrade}
            />
          );
        })}
      </div>
    </section>
  );
}
