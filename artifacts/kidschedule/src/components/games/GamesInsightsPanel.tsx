import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, CalendarDays, Trophy } from "lucide-react";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type GameCategory,
  type WeeklyGameSummary,
} from "@/lib/games";
import { gameTheme } from "@/lib/game-theme";
import { GAMES_GLASS_PANEL } from "@/lib/game-theme";
import { GamesLeaderboard } from "@/components/games/GamesLeaderboard";
import { cn } from "@/lib/utils";

type InsightsTab = "skills" | "leaderboard" | "weekly";

interface GamesInsightsPanelProps {
  skills: { cat: GameCategory; pct: number }[];
  isPremium: boolean;
  weekly: WeeklyGameSummary;
}

export function GamesInsightsPanel({ skills, isPremium, weekly }: GamesInsightsPanelProps) {
  const { t } = useTranslation();
  const defaultTab: InsightsTab = "skills";
  const [tab, setTab] = useState<InsightsTab>(defaultTab);

  const tabs: { id: InsightsTab; label: string; icon: typeof BarChart3; premium?: boolean }[] = [
    { id: "skills", label: t("screens.games.tab_skills"), icon: BarChart3 },
    ...(isPremium
      ? [
          { id: "leaderboard" as const, label: t("screens.games.tab_leaderboard"), icon: Trophy, premium: true },
          { id: "weekly" as const, label: t("screens.games.tab_weekly"), icon: CalendarDays, premium: true },
        ]
      : []),
  ];

  return (
    <div className={cn(GAMES_GLASS_PANEL, "rounded-2xl p-3.5")}>
      <div className="mb-3 flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all",
              tab === id
                ? "bg-gradient-to-r from-amber-500/25 to-fuchsia-500/15 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === "skills" && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {skills.map(({ cat, pct }) => (
            <div key={cat}>
              <div className="mb-1 flex justify-between text-[11px] text-foreground">
                <span className="truncate">
                  {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat].split("&")[0].trim()}
                </span>
                <span
                  className={cn(
                    "ml-1 shrink-0 font-extrabold tabular-nums",
                    pct >= 75 ? "text-emerald-400" : pct >= 40 ? "text-amber-300" : "text-muted-foreground",
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: gameTheme.progressTrack }}
              >
                <div
                  className="hub-progress-fill h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct >= 75
                        ? "linear-gradient(90deg,hsl(var(--brand-green-500)),hsl(var(--brand-green-400)))"
                        : pct >= 40
                          ? gameTheme.playGradient
                          : gameTheme.violetGradient,
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "leaderboard" && isPremium && (
        <div className="-mx-1 -mb-1">
          <GamesLeaderboard embedded />
        </div>
      )}

      {tab === "weekly" && isPremium && (
        weekly.playsLast7Days > 0 ? (
          <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-300">
              {t("screens.games.weekly_summary_title")}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span>{t("screens.games.weekly_plays", { count: weekly.playsLast7Days })}</span>
              <span>{t("screens.games.weekly_perfect", { count: weekly.perfectCount })}</span>
              <span>{t("screens.games.weekly_points", { count: weekly.pointsEarned })}</span>
              {weekly.topCategory != null && (
                <span>
                  {t("screens.games.weekly_top_skill", {
                    category: CATEGORY_LABEL[weekly.topCategory].split("&")[0].trim(),
                    pct: weekly.categoryAccuracies[0]?.pct ?? 0,
                  })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("screens.games.weekly_empty")}
          </p>
        )
      )}

      {!isPremium && (
        <p className="mt-2.5 text-[10.5px] text-muted-foreground">
          {t("screens.games.insights_premium_hint")}
        </p>
      )}
    </div>
  );
}
