import { memo } from "react";
import type { GameCategory } from "@/lib/games";
import { GAMES_CATEGORY_ACCENT } from "@/lib/game-theme";
import { cn } from "@/lib/utils";

type BadgeSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<BadgeSize, string> = {
  sm: "h-10 w-10 text-[1.35rem] rounded-[12px]",
  md: "h-14 w-14 text-[2rem] rounded-xl",
  lg: "h-16 w-16 text-[2.35rem] rounded-2xl",
  xl: "h-[72px] w-[72px] text-[2.75rem] rounded-2xl",
};

interface GameEmojiBadgeProps {
  emoji: string;
  category?: GameCategory | string;
  size?: BadgeSize;
  float?: boolean;
  muted?: boolean;
  className?: string;
  label?: string;
}

/**
 * Unified game-identity shell — emoji stays (gameplay/identity),
 * presentation matches one premium icon language across hub + dialogs.
 */
export const GameEmojiBadge = memo(function GameEmojiBadge({
  emoji,
  category = "brain",
  size = "md",
  float = false,
  muted = false,
  className,
  label,
}: GameEmojiBadgeProps) {
  const accent = GAMES_CATEGORY_ACCENT[category] ?? GAMES_CATEGORY_ACCENT.brain;

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none",
        "bg-gradient-to-br from-white/[0.16] via-white/[0.05] to-transparent",
        "border shadow-[inset_0_1px_rgba(255,255,255,0.28),0_6px_18px_rgba(0,0,0,0.22)]",
        // Avoid backdrop-blur on every badge — expensive on mid-range GPUs.
        accent.shell,
        SIZE[size],
        muted && "grayscale-[0.4] opacity-80",
        float && "game-motion-float",
        className,
      )}
    >
      {emoji}
    </span>
  );
});
