import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Skip top offset (immersive routes, assistant full-bleed, etc.). */
  noOffset?: boolean;
  className?: string;
};

/**
 * Scrollable page content that starts below the fixed mobile header.
 * Uses padding-top (not margin-top) so Android PWA pull-to-refresh stays stable.
 */
export function ScreenContainer({ children, noOffset = false, className }: Props) {
  return (
    <div
      className={cn(
        "app-screen-content flex min-h-0 min-w-0 flex-1 flex-col",
        noOffset && "app-screen-content--no-offset",
        className,
      )}
    >
      {children}
    </div>
  );
}
