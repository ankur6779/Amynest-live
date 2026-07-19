import { motion } from "framer-motion";
import type { MicroGameDef } from "@workspace/abacus";
import { microGamesForMode, type MicroGameId } from "@workspace/abacus";
import { cn } from "@/lib/utils";

export function AbacusMicroGamePicker({
  mode,
  selected,
  onSelect,
}: {
  mode: "practice" | "mental" | "challenge";
  selected: MicroGameId;
  onSelect: (id: MicroGameId) => void;
}) {
  const games = microGamesForMode(mode);
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-0.5 px-0.5"
      data-testid="abacus-micro-game-picker"
      role="listbox"
      aria-label="Game style"
    >
      {games.map((g) => (
        <button
          key={g.id}
          type="button"
          role="option"
          aria-selected={selected === g.id}
          onClick={() => onSelect(g.id)}
          className={cn(
            "shrink-0 rounded-xl border px-2.5 py-2 text-center min-h-[44px] min-w-[4.5rem] transition-all",
            selected === g.id
              ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent shadow-md"
              : "bg-background border-border text-foreground hover:bg-muted",
          )}
          data-testid={`abacus-micro-game-${g.id}`}
        >
          <span className="block text-base leading-none" aria-hidden>
            {g.emoji}
          </span>
          <span className="block mt-0.5 text-[10px] font-bold leading-tight">{g.title}</span>
        </button>
      ))}
    </div>
  );
}

export function AbacusMicroGameBanner({
  game,
  correct,
  target,
  coins,
  amyScore,
  secondsLeft,
}: {
  game: MicroGameDef;
  correct: number;
  target: number;
  coins?: number;
  amyScore?: number;
  secondsLeft?: number;
}) {
  return (
    <div
      className="rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-3 py-2 space-y-1"
      data-testid="abacus-micro-game-banner"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-foreground">
          <span aria-hidden>{game.emoji} </span>
          {game.title}
        </p>
        {typeof secondsLeft === "number" && (
          <span
            className={cn(
              "text-xs font-extrabold tabular-nums rounded-full px-2 py-0.5 border",
              secondsLeft <= 5
                ? "border-rose-500 text-rose-600 animate-pulse"
                : "border-amber-500/50 text-amber-800 dark:text-amber-200",
            )}
          >
            {secondsLeft}s
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground font-semibold">{game.blurb}</p>
      <div className="flex items-center gap-2 text-[11px] font-bold">
        <span>
          {correct}/{target}
        </span>
        {typeof coins === "number" && (
          <span className="text-amber-700 dark:text-amber-300">🪙 {coins}</span>
        )}
        {typeof amyScore === "number" && (
          <span className="text-teal-700 dark:text-teal-300">Amy {amyScore}</span>
        )}
      </div>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: target }).map((_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{ scale: i < correct ? 1.1 : 1, opacity: i < correct ? 1 : 0.35 }}
            className="text-sm"
          >
            {game.id === "coin_collection" || game.id === "treasure_hunt" ? "🪙" : "⭐"}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
