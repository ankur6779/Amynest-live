import { useTranslation } from "react-i18next";
import { Play, Sparkles } from "lucide-react";
import type { GameDef } from "@/lib/games";
import { GAMES_GLASS_PANEL } from "@/lib/game-theme";
import { GamePreviewTile } from "./GamePreviewTile";
import { cn } from "@/lib/utils";

interface AmySuggestionPanelProps {
  line: string;
  suggestedGame?: GameDef;
  canPlay: boolean;
  onPlay: () => void;
}

export function AmySuggestionPanel({
  line,
  suggestedGame,
  canPlay,
  onPlay,
}: AmySuggestionPanelProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        GAMES_GLASS_PANEL,
        "rounded-2xl p-3.5",
        canPlay && "border-fuchsia-400/30 shadow-[0_0_24px_rgba(255,72,212,0.12)]",
      )}
    >
      <div className="flex gap-3">
        {suggestedGame ? (
          <GamePreviewTile gameId={suggestedGame.id} emoji={suggestedGame.emoji} active />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-violet-500/10 text-2xl">
            ✨
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-300/90">
              {t("screens.games.amy_pick_label")}
            </span>
          </div>
          <p className="text-[13px] font-semibold leading-snug text-foreground">{line}</p>
          {suggestedGame && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {suggestedGame.emoji} {suggestedGame.title}
              {suggestedGame.ageHint ? ` · ${suggestedGame.ageHint}` : ""}
              {" · "}
              {t("screens.games.reward_range", {
                min: suggestedGame.rewardMin,
                max: suggestedGame.rewardMax,
              })}
            </p>
          )}
        </div>
      </div>

      {suggestedGame && canPlay && (
        <button
          type="button"
          onClick={onPlay}
          className={cn(
            "mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold text-white",
            "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_4px_14px_rgba(255,184,0,0.35)]",
            "transition-transform active:scale-[0.97]",
          )}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {t("screens.games.amy_play_now")}
        </button>
      )}
    </div>
  );
}
