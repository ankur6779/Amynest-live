import type { ReactNode } from "react";
import { useState } from "react";
import type { GameDef } from "@/lib/games";
import {
  canPlayGame,
  isGameUnlockedForPlay,
  requiresPremiumToPlay,
} from "@/lib/games";
import { GameGridCard } from "@/components/games/GameGridCard";

interface GamesHorizontalStripProps {
  title: string;
  subtitle?: string;
  games: GameDef[];
  isPremium: boolean;
  limitHit: boolean;
  onPlay: (game: GameDef) => void;
  onUnlock: (game: GameDef) => void;
  onUpgrade: () => void;
  empty?: ReactNode;
}

/**
 * Horizontal snap carousel for Continue / Recommended.
 * Always renders header + empty surface when provided.
 */
export function GamesHorizontalStrip({
  title,
  subtitle,
  games,
  isPremium,
  limitHit,
  onPlay,
  onUnlock,
  onUpgrade,
  empty,
}: GamesHorizontalStripProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);

  if (games.length === 0) {
    return empty ? (
      <section className="game-motion-enter space-y-2" aria-label={title}>
        <StripHeader title={title} subtitle={subtitle} />
        {empty}
      </section>
    ) : null;
  }

  return (
    <section className="game-motion-enter space-y-2.5" aria-label={title}>
      <StripHeader title={title} subtitle={subtitle} />
      <div
        className="game-perf-strip -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((g) => {
          const playable = canPlayGame(g, isPremium);
          const unlocked = isGameUnlockedForPlay(g.id, isPremium);
          const soon = g.status === "soon";
          const premiumOnly = requiresPremiumToPlay(g) && !isPremium;
          const showLock = !unlocked && !soon && !premiumOnly;
          return (
            <div key={g.id} className="w-[152px] shrink-0 snap-start sm:w-[160px]">
              <GameGridCard
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
                layout="strip"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StripHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0 px-0.5">
      <h3 className="font-quicksand text-sm font-extrabold tracking-tight text-foreground">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
