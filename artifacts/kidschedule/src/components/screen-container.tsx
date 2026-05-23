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
 * Bottom clearance for system navigation is applied on `.app-scroll` via CSS.
 */
export function ScreenContainer({ children, noOffset = false, className }: Props) {
  return (
    <div
      className={cn(
        "app-screen-content flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip box-border",
        noOffset && "app-screen-content--no-offset",
        className,
      )}
    >
      {children}
    </div>
  );
}
