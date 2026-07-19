import { cn } from "@/lib/utils";
import { GAMES } from "../constants";
import { getAdventureBadge, PLAYABLE_GAMES } from "../play-path";
import { getWorldEvolution } from "../world-evolution";
import { getWorldIdentity } from "../world-identity";
import type { HealthGameId, HealthLabPersistedState } from "../types";
import { HealthLabGameCard } from "./health-lab-game-ui";

interface Props {
  state: HealthLabPersistedState;
  recommendedId: HealthGameId;
  playLabel: string;
  title: string;
  hint: string;
  onSelectGame: (gameId: HealthGameId) => void;
}

/**
 * Destination path — worlds feel like places on a journey, not equal list rows.
 */
export function HealthLabWorldMap({
  state,
  recommendedId,
  playLabel,
  title,
  hint,
  onSelectGame,
}: Props) {
  return (
    <section aria-labelledby="world-map-heading" className="relative">
      <div className="mb-4 px-0.5">
        <h2
          id="world-map-heading"
          className="font-quicksand text-xl font-black tracking-tight text-white sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm font-medium leading-relaxed text-violet-100/70">{hint}</p>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute bottom-10 left-[11px] top-10 w-[3px] rounded-full bg-gradient-to-b from-amber-300/55 via-violet-400/40 to-cyan-400/45"
          aria-hidden
        />

        <ol className="relative space-y-3.5">
          {PLAYABLE_GAMES.map((game, index) => {
            const world = getWorldIdentity(game.id);
            const badge = getAdventureBadge(game.id, state, recommendedId);
            const evolution = getWorldEvolution(state, game.id);
            const def = GAMES.find((g) => g.id === game.id)!;
            const drift = index % 2 === 0 ? "translate-x-0" : "translate-x-1 sm:translate-x-2";

            return (
              <li key={game.id} className={cn("relative pl-7", drift)}>
                <span
                  className={cn(
                    "absolute left-[6px] top-[42%] z-[2] h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#070b24]",
                    world.pin,
                    badge === "recommended" && "h-4 w-4 ring-2 ring-amber-200/90",
                    badge === "completed" && "!bg-emerald-400",
                    evolution.stage >= 4 && "ring-2 ring-emerald-200/70",
                    evolution.stage === 0 && "opacity-50",
                  )}
                  aria-hidden
                />
                <HealthLabGameCard
                  game={def}
                  index={index}
                  badge={badge}
                  personalBest={state.personalBests[game.id]}
                  gameHistory={state.gameHistory}
                  playLabel={playLabel}
                  evolution={evolution}
                  onSelect={() => onSelectGame(game.id)}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
