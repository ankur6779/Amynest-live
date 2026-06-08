import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { getWeeklyLeaderboard } from "@/lib/games";
import { gameTheme, GAMES_GLASS_PANEL } from "@/lib/game-theme";
import { cn } from "@/lib/utils";

export function GamesLeaderboard({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const rows = getWeeklyLeaderboard();

  const content = (
    <>
      {!embedded && (
        <div className="mb-2.5 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-300" />
          <span className="text-xs font-extrabold uppercase tracking-wide text-amber-300/90">
            {t("screens.games.leaderboard_title")}
          </span>
          <span className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
            PREMIUM
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="m-0 text-xs leading-relaxed text-muted-foreground">
          {t("screens.games.leaderboard_empty")}
        </p>
      ) : (
        <div className="grid gap-2">
          {rows.map((row, i) => (
            <div
              key={row.gameId}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2",
                i === 0
                  ? "border-amber-400/25 bg-amber-500/10"
                  : "border-white/[0.08] bg-white/[0.04]",
              )}
            >
              <span className="w-5 text-xs font-extrabold text-muted-foreground">{i + 1}</span>
              <span className="text-[22px] leading-none">{row.game.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-foreground">{row.game.title}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {t("screens.games.leaderboard_plays", { count: row.plays })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-amber-300">{row.bestRatio}%</div>
                <div className="text-[10px] text-muted-foreground">
                  {row.bestScore}/{row.bestTotal}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div
      className={cn(GAMES_GLASS_PANEL, "rounded-2xl p-3.5")}
      style={{ color: gameTheme.text }}
    >
      {content}
    </div>
  );
}
