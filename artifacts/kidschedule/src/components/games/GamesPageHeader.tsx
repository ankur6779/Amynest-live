import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Gamepad2,
  MoreVertical,
  Plus,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { GAMES_HEADER_SHELL, GAMES_ICON_BUTTON } from "@/lib/game-theme";

interface GamesPageHeaderProps {
  points: number;
  showComboBadge: boolean;
  perfectStreak: number;
  isPremium: boolean;
  onBack: () => void;
  onUpgrade: () => void;
  onDevGrant?: () => void;
}

/**
 * Primary header leads with Learning Hub — points/combo demoted to menu (legacy).
 */
export function GamesPageHeader({
  points,
  showComboBadge,
  perfectStreak,
  isPremium,
  onBack,
  onUpgrade,
  onDevGrant,
}: GamesPageHeaderProps) {
  const { t } = useTranslation();
  const showMenu = true;

  return (
    <header className={cn(GAMES_HEADER_SHELL, "hub-page-enter")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className={GAMES_ICON_BUTTON}
            aria-label={t("screens.games.back")}
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <Gamepad2 className="h-5 w-5 shrink-0 text-violet-300/90" aria-hidden />
            <div className="min-w-0">
              <h1 className="truncate font-quicksand text-lg font-extrabold leading-tight text-foreground">
                {t("screens.games.title")}
              </h1>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-violet-200/80">
                {t("screens.games.mastery_header_sub", {
                  defaultValue: "Skill mastery",
                })}
              </p>
            </div>
          </div>
        </div>

        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  GAMES_ICON_BUTTON,
                  "data-[state=open]:border-fuchsia-400/45 data-[state=open]:bg-fuchsia-500/15",
                )}
                aria-label={t("screens.games.menu_label")}
              >
                <MoreVertical className="h-[18px] w-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl border-white/10 bg-[rgba(18,28,60,0.96)] text-foreground shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("screens.games.menu_label")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                disabled
                className="gap-2.5 rounded-xl py-2.5 text-muted-foreground opacity-90"
              >
                {t("screens.games.points_menu_label", {
                  defaultValue: "Nest points (unlocks)",
                  count: points,
                })}
                : {points}
              </DropdownMenuItem>
              {showComboBadge && (
                <DropdownMenuItem
                  disabled
                  className="gap-2.5 rounded-xl py-2.5 text-muted-foreground opacity-90"
                >
                  {t("screens.games.perfect_combo_badge", { count: perfectStreak })}
                </DropdownMenuItem>
              )}
              {!isPremium && (
                <DropdownMenuItem
                  onClick={onUpgrade}
                  className="cursor-pointer gap-2.5 rounded-xl py-2.5 focus:bg-white/10 focus:text-foreground"
                >
                  <Zap className="h-4 w-4 text-violet-300" />
                  {t("screens.games.upgrade_premium")}
                </DropdownMenuItem>
              )}
              {import.meta.env.DEV && onDevGrant && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={onDevGrant}
                    className="cursor-pointer gap-2.5 rounded-xl py-2.5 text-emerald-300 focus:bg-emerald-500/15 focus:text-emerald-200"
                  >
                    <Plus className="h-4 w-4" />
                    {t("screens.games.dev_grant_label")} {t("screens.games.dev_label")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
