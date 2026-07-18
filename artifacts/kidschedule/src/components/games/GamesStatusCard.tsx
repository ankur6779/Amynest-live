import { useTranslation } from "react-i18next";
import { Lock, Target } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { GAMES_GLASS_PANEL, gameTheme } from "@/lib/game-theme";
import {
  DAILY_LIMIT_FREE,
  PERFECT_COMBO_BADGE_AT,
  STREAK_UNLOCK_DAYS,
  type GameDef,
} from "@/lib/games";

interface GamesStatusCardProps {
  playedToday: number;
  limit: number;
  limitHit: boolean;
  dailyPct: number;
  isPremium: boolean;
  routineStreak: number;
  perfectStreak: number;
  showComboBadge: boolean;
  points: number;
  nextUnlockGame: GameDef | null;
}

export function GamesStatusCard({
  playedToday,
  limit,
  limitHit,
  dailyPct,
  isPremium,
  routineStreak,
  perfectStreak,
  showComboBadge,
  points,
  nextUnlockGame,
}: GamesStatusCardProps) {
  const { t } = useTranslation();
  const pointsToNextGame = nextUnlockGame
    ? Math.max(0, nextUnlockGame.unlockCost - points)
    : null;

  return (
    <div className={cn(GAMES_GLASS_PANEL, "game-a11y-solid-surface rounded-2xl p-3.5")}>
      <div className="flex items-center gap-3">
        <div
          className="relative h-14 w-14 shrink-0"
          role="img"
          aria-label={`${playedToday} of ${limit} plays today`}
        >
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
            <circle
              cx="28"
              cy="28"
              r="22"
              className="stroke-white/10"
              strokeWidth="5"
              fill="none"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              className={limitHit ? "stroke-amber-300" : "stroke-amber-400"}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - dailyPct / 100)}
              style={{ transition: "stroke-dashoffset 0.35s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[9px] font-extrabold text-foreground">
            <Target className="mb-0.5 h-3.5 w-3.5 text-amber-300" />
            <span className="tabular-nums">
              {playedToday}/{limit}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-300/90">
            {t("screens.games.daily_plays_title")}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {limitHit
              ? t("screens.games.daily_plays_done")
              : t("screens.games.daily_plays_remaining", { count: limit - playedToday })}
          </p>
          {nextUnlockGame && pointsToNextGame !== null && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0 text-amber-300/80" />
              {pointsToNextGame === 0
                ? t("screens.games.next_game_ready", { title: nextUnlockGame.title })
                : t("screens.games.next_game_nudge", {
                    count: pointsToNextGame,
                    title: nextUnlockGame.title,
                  })}
            </p>
          )}
        </div>
      </div>

      <Accordion type="single" collapsible className="mt-2 border-t border-white/[0.08]">
        <AccordionItem value="how-it-works" className="border-none">
          <AccordionTrigger
            className={cn(
              "py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground",
              "hover:no-underline [&[data-state=open]>svg]:text-amber-300",
            )}
          >
            {t("screens.games.how_it_works")}
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-1 text-[11.5px] leading-relaxed text-muted-foreground">
            <p>{t("screens.games.earn_to_unlock")}</p>
            {!isPremium && (
              <p>{t("screens.games.free_tier_hint", { limit: DAILY_LIMIT_FREE })}</p>
            )}
            <p>
              {t("screens.games.streak_unlock_hint", {
                days: STREAK_UNLOCK_DAYS,
                current: routineStreak,
              })}
            </p>
            {!showComboBadge && perfectStreak > 0 && (
              <p>
                {t("screens.games.perfect_combo_progress", {
                  current: perfectStreak,
                  remaining: PERFECT_COMBO_BADGE_AT - perfectStreak,
                })}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full border border-white/10"
        style={{ background: gameTheme.progressTrack }}
        role="progressbar"
        aria-valuenow={Math.round(dailyPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("screens.games.daily_plays_title")}
      >
        <div
          className="hub-progress-fill h-full rounded-full"
          style={{
            width: `${dailyPct}%`,
            background: limitHit
              ? "repeating-linear-gradient(90deg, hsl(var(--brand-amber-300)), hsl(var(--brand-amber-300)) 6px, hsl(var(--brand-orange-400)) 6px, hsl(var(--brand-orange-400)) 12px)"
              : "linear-gradient(90deg, rgba(255,184,0,0.95), rgba(251,191,36,0.95))",
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}
