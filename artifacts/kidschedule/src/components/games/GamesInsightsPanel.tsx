import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, CalendarDays, Trophy } from "lucide-react";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  GAMES,
  getSkills,
  type GameCategory,
  type GameDef,
  type WeeklyGameSummary,
} from "@/lib/games";
import { skillStarsFromPercent } from "@/lib/game-hub-meta";
import {
  formatParentMastery,
  listMasteryForCatalog,
  type MasteryStage,
} from "@/lib/game-mastery";
import { getGameLearning } from "@/lib/game-learning";
import { GAMES_GLASS_PANEL } from "@/lib/game-theme";
import { GamesLeaderboard } from "@/components/games/GamesLeaderboard";
import { GamesStatusCard } from "@/components/games/GamesStatusCard";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type InsightsTab = "skills" | "leaderboard" | "weekly";

interface GamesInsightsPanelProps {
  skills: { cat: GameCategory; pct: number }[];
  isPremium: boolean;
  weekly: WeeklyGameSummary;
  status?: {
    playedToday: number;
    limit: number;
    limitHit: boolean;
    dailyPct: number;
    routineStreak: number;
    perfectStreak: number;
    showComboBadge: boolean;
    points: number;
    nextUnlockGame: GameDef | null;
  };
  collapsible?: boolean;
}

/**
 * Progress demoted below catalog — parents open when curious.
 * Mastery stages only (no XP / Level N / %).
 */
export function GamesInsightsPanel({
  skills,
  isPremium,
  weekly,
  status,
  collapsible = true,
}: GamesInsightsPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InsightsTab>("skills");
  const skillRecords = getSkills();
  const masteryRows: { game: GameDef; stage: MasteryStage; score: number }[] = listMasteryForCatalog()
    .map((row) => {
      const game = GAMES.find((g) => g.id === row.gameId);
      if (!game) return null;
      return { game, stage: row.stage, score: row.score };
    })
    .filter((row): row is { game: GameDef; stage: MasteryStage; score: number } => row != null)
    .sort((a, b) => b.stage.id - a.stage.id || b.score - a.score)
    .slice(0, 9);

  const tabs: { id: InsightsTab; label: string; icon: typeof BarChart3 }[] = [
    {
      id: "skills",
      label: t("screens.games.tab_mastery", { defaultValue: "Mastery" }),
      icon: BarChart3,
    },
    ...(isPremium
      ? [
          { id: "weekly" as const, label: t("screens.games.tab_weekly"), icon: CalendarDays },
          {
            id: "leaderboard" as const,
            label: t("screens.games.tab_my_bests", { defaultValue: "My Bests" }),
            icon: Trophy,
          },
        ]
      : []),
  ];

  const body = (
    <div className="space-y-3">
      {status && (
        <GamesStatusCard
          playedToday={status.playedToday}
          limit={status.limit}
          limitHit={status.limitHit}
          dailyPct={status.dailyPct}
          isPremium={isPremium}
          routineStreak={status.routineStreak}
          perfectStreak={status.perfectStreak}
          showComboBadge={status.showComboBadge}
          points={status.points}
          nextUnlockGame={status.nextUnlockGame}
        />
      )}

      <div className="mb-1 flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[11px] font-bold transition-colors",
              tab === id
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === "skills" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(masteryRows.length > 0 ? masteryRows : GAMES.slice(0, 6).map((game) => ({
              game,
              stage: { id: 1, label: "Starter", emoji: "🌱" },
              score: 0,
            }))).map(({ game, stage }) => (
              <div
                key={game.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="truncate text-[11px] font-bold text-foreground">
                    <span aria-hidden>{game.emoji} </span>
                    {getGameLearning(game).skillName}
                  </span>
                  <span className="shrink-0 text-[10px] font-extrabold text-amber-300">
                    {formatParentMastery(game.id)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {stage.label} ({stage.id}/5) · {game.title}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {skills.map(({ cat, pct }) => {
              const attempts = skillRecords[cat]?.attempts ?? 0;
              const stars = skillStarsFromPercent(pct, attempts > 0);
              return (
                <div
                  key={cat}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="truncate text-[11px] font-bold text-foreground">
                      <span aria-hidden>{CATEGORY_EMOJI[cat]} </span>
                      {CATEGORY_LABEL[cat].split("&")[0].trim()}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 flex gap-0.5"
                    aria-label={t("screens.games.skill_stars_aria", {
                      defaultValue: "{{count}} of 3 stars",
                      count: stars,
                    })}
                  >
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className={cn(
                          "text-sm leading-none",
                          n <= stars ? "text-amber-300" : "text-white/20",
                        )}
                        aria-hidden
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "leaderboard" && isPremium && (
        <div className="-mx-1">
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
        <p className="text-[10.5px] text-muted-foreground">
          {t("screens.games.insights_premium_hint")}
        </p>
      )}
    </div>
  );

  if (!collapsible) {
    return <div className={cn(GAMES_GLASS_PANEL, "rounded-2xl p-3.5")}>{body}</div>;
  }

  return (
    <Accordion type="single" collapsible className={cn(GAMES_GLASS_PANEL, "rounded-2xl px-3.5")}>
      <AccordionItem value="progress" className="border-none">
        <AccordionTrigger className="py-3.5 text-left hover:no-underline [&[data-state=open]>svg]:text-amber-300">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
            <span className="min-w-0">
              <span className="block font-quicksand text-sm font-extrabold text-foreground">
                {t("screens.games.progress_section_title", { defaultValue: "Your progress" })}
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                {t("screens.games.progress_section_subtitle", {
                  defaultValue: "Skills, bests, and weekly summary",
                })}
              </span>
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-3.5 pt-0">{body}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
