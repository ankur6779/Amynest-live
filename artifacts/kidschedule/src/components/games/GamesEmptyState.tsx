import type { ReactNode } from "react";
import { GAMES_GLASS_PANEL } from "@/lib/game-theme";
import { cn } from "@/lib/utils";

interface GamesEmptyStateProps {
  emoji?: string;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}

/** Warm, premium empty surfaces — never cold “no data”. */
export function GamesEmptyState({
  emoji = "✨",
  title,
  body,
  action,
  className,
}: GamesEmptyStateProps) {
  return (
    <div
      className={cn(
        GAMES_GLASS_PANEL,
        "game-motion-enter rounded-2xl px-4 py-5 text-center",
        className,
      )}
      role="status"
    >
      <div
        className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl"
        aria-hidden
      >
        {emoji}
      </div>
      <p className="font-quicksand text-sm font-extrabold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
