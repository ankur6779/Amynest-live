import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Coins,
  Gamepad2,
  Gift,
  MoreVertical,
  Plus,
  Sparkles,
  Store,
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
import { AnimatedPoints } from "@/components/games/AnimatedPoints";

interface GamesPageHeaderProps {
  points: number;
  showComboBadge: boolean;
  perfectStreak: number;
  isPremium: boolean;
  onBack: () => void;
  onRedeem: () => void;
  onRewardsShop: () => void;
  onUpgrade: () => void;
  onDevGrant?: () => void;
}

export function GamesPageHeader({
  points,
  showComboBadge,
  perfectStreak,
  isPremium,
  onBack,
  onRedeem,
  onRewardsShop,
  onUpgrade,
  onDevGrant,
}: GamesPageHeaderProps) {
  const { t } = useTranslation();

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
            <h1 className="truncate font-quicksand text-lg font-extrabold leading-tight text-foreground">
              {t("screens.games.title")}
            </h1>
          </div>
        </div>

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
              onClick={onRedeem}
              className="cursor-pointer gap-2.5 rounded-xl py-2.5 focus:bg-white/10 focus:text-foreground"
            >
              <Gift className="h-4 w-4 text-amber-300" />
              {t("screens.games.redeem_button")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRewardsShop}
              className="cursor-pointer gap-2.5 rounded-xl py-2.5 focus:bg-white/10 focus:text-foreground"
            >
              <Store className="h-4 w-4 text-amber-300" />
              {t("screens.games.rewards_shop_link")}
            </DropdownMenuItem>
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <div
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full border border-amber-500/35",
            "bg-gradient-to-br from-amber-400/15 via-orange-500/10 to-fuchsia-500/10",
            "py-1 pl-1 pr-4 shadow-[0_0_28px_rgba(251,146,60,0.32)] ring-1 ring-amber-300/15",
          )}
          aria-label={t("screens.games.points_hero_aria", { count: points })}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500",
              "shadow-[0_0_22px_rgba(251,146,60,0.5)]",
            )}
          >
            <Coins className="h-[18px] w-[18px] text-white" aria-hidden />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-quicksand text-xl font-extrabold tabular-nums text-white">
              <AnimatedPoints value={points} />
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70">
              {t("screens.games.points_hero_label")}
            </span>
          </div>
        </div>

        {showComboBadge && (
          <div
            title={t("screens.games.perfect_combo_title", { count: perfectStreak })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold text-white",
              "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_4px_14px_rgba(34,197,94,0.35)]",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("screens.games.perfect_combo_badge", { count: perfectStreak })}
          </div>
        )}
      </div>
    </header>
  );
}
